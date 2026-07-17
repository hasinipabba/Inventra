"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sharpenImageToCanvas } from "./image-preprocess";

interface Rect { x: number; y: number; w: number; h: number; }
interface Props { onUsePhoto: (canvas: HTMLCanvasElement) => void; onClose: () => void; }
const ASPECT_RATIO = 4;
const initialRect: Rect = { x: 0.1, y: 0.4, w: 0.8, h: 0.8 / ASPECT_RATIO };

/** Camera-only image acquisition. It deliberately has no OCR knowledge: callers retain the existing OCR pipeline. */
export function OcrCameraCapture({ onUsePhoto, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ kind: "move" | "resize"; x: number; y: number; rect: Rect } | null>(null);
  const [mode, setMode] = useState<"live" | "preview" | "error">("live");
  const [rect, setRect] = useState<Rect>(initialRect);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  function stopCamera() { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; }

  useEffect(() => {
    if (mode !== "live") return stopCamera;
    let disposed = false;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        if (disposed) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      } catch (cause: any) {
        if (!disposed) { setError(cause?.name === "NotAllowedError" ? "Camera permission was denied. Allow access and try again." : "Unable to start the camera."); setMode("error"); }
      }
    }
    startCamera();
    return () => { disposed = true; stopCamera(); };
  }, [mode]);

  function point(event: React.PointerEvent) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) };
  }
  function onPointerDown(event: React.PointerEvent) {
    const p = point(event); const inside = p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h;
    if (!inside) return;
    const handle = p.x > rect.x + rect.w - 0.08 && p.y > rect.y + rect.h - 0.08;
    dragRef.current = { kind: handle ? "resize" : "move", x: p.x, y: p.y, rect };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: React.PointerEvent) {
    const drag = dragRef.current; if (!drag) return;
    const p = point(event);
    if (drag.kind === "move") setRect({ ...drag.rect, x: Math.max(0, Math.min(1 - drag.rect.w, drag.rect.x + p.x - drag.x)), y: Math.max(0, Math.min(1 - drag.rect.h, drag.rect.y + p.y - drag.y)) });
    else {
      const w = Math.max(0.25, Math.min(0.95, p.x - drag.rect.x, 1 - drag.rect.x, (1 - drag.rect.y) * ASPECT_RATIO));
      setRect({ ...drag.rect, w, h: w / ASPECT_RATIO });
    }
  }
  function capture() {
    const video = videoRef.current; if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    const sx = rect.x * video.videoWidth; const sy = rect.y * video.videoHeight;
    const sw = rect.w * video.videoWidth; const sh = rect.h * video.videoHeight;
    canvas.width = Math.round(sw); canvas.height = Math.round(sh);
    canvas.getContext("2d")?.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const enhanced = sharpenImageToCanvas(canvas, { upscale: 2, binarizeOutput: true });
    previewCanvasRef.current = enhanced; setPreviewUrl(enhanced.toDataURL("image/png")); setFlash(true);
    window.setTimeout(() => setFlash(false), 180); setMode("preview");
  }
  function retake() { previewCanvasRef.current = null; setPreviewUrl(null); setMode("live"); }

  return <div className="fixed inset-0 z-50 flex min-h-dvh flex-col bg-black text-white">
    <header className="flex items-center justify-between px-4 py-4"><div><p className="text-sm font-semibold">Expiry label capture</p><p className="text-xs text-white/65">Align only the printed expiry or batch area.</p></div><Button type="button" size="sm" variant="ghost" className="text-white" onClick={onClose}><X size={15} /> Close camera</Button></header>
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
      {mode === "live" && <div className="relative w-full max-w-5xl overflow-hidden bg-black" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => { dragRef.current = null; }}>
        <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline autoPlay />
        <div className="pointer-events-none absolute inset-0 bg-black/35" />
        <p className="pointer-events-none absolute left-1/2 top-[calc(40%-2.25rem)] -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium">Align the expiry date inside the box</p>
        <div className="absolute border border-white/90 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.48)]" style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%` }}>
          <i className="absolute -left-0.5 -top-0.5 h-5 w-5 border-l-4 border-t-4 border-primary" /><i className="absolute -right-0.5 -top-0.5 h-5 w-5 border-r-4 border-t-4 border-primary" /><i className="absolute -bottom-0.5 -left-0.5 h-5 w-5 border-b-4 border-l-4 border-primary" /><i className="absolute -bottom-0.5 -right-0.5 h-5 w-5 border-b-4 border-r-4 border-primary" />
          <span className="absolute -bottom-3 -right-3 h-7 w-7 rounded-full border-2 border-white bg-primary shadow-lg" />
        </div>
        {flash && <div className="pointer-events-none absolute inset-0 animate-pulse bg-white" />}
      </div>}
      {mode === "preview" && previewUrl && <div className="relative w-full max-w-2xl space-y-4 px-4"><p className="text-center text-sm font-medium">Captured Preview</p><img src={previewUrl} alt="Enhanced expiry label crop" className="mx-auto max-h-[60vh] rounded-xl border border-white/20 bg-white object-contain" /><p className="text-center text-xs text-white/65">Only this cropped, enhanced image will be sent to OCR.</p>{flash && <div className="pointer-events-none absolute inset-0 animate-pulse bg-white/75" />}</div>}
      {mode === "error" && <p className="rounded-lg bg-white/10 p-4 text-sm">{error}</p>}
    </main>
    <footer className="flex items-center justify-center gap-3 px-4 py-5">{mode === "live" && <Button type="button" size="lg" variant="primary" className="min-w-44 rounded-full" onClick={capture}><Camera size={18} /> Capture</Button>}{mode === "preview" && <><Button type="button" size="lg" variant="secondary" onClick={retake}><RotateCcw size={17} /> Retake</Button><Button type="button" size="lg" variant="primary" onClick={() => previewCanvasRef.current && onUsePhoto(previewCanvasRef.current)}><Check size={17} /> Use Photo</Button></>}{mode === "error" && <Button type="button" variant="secondary" onClick={retake}>Try again</Button>}</footer>
  </div>;
}
