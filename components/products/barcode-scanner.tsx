"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sharpenVideoFrame, type FrameRoi } from "./image-preprocess";

// Matches the visible guide-box overlay below (h-1/2 w-3/4, centered) —
// decoding is restricted to this region so what you see in the box is
// actually what gets analyzed, instead of the whole scene (hands, face,
// background) diluting the decoder's attention.
const GUIDE_BOX_ROI: FrameRoi = { x: 0.125, y: 0.25, w: 0.75, h: 0.5 };

export type ScannerErrorKind =
  | "permission_denied"
  | "no_camera"
  | "camera_in_use"
  | "insecure_context"
  | "not_detected"
  | "unsupported_format"
  | "unknown";

interface Props {
  onDetected: (barcode: string, format: string) => void;
  onError?: (kind: ScannerErrorKind, message: string) => void;
  active: boolean;
}

// Native BarcodeDetector uses lowercase-underscore format names.
const NATIVE_FORMATS = ["ean_13", "upc_a", "upc_e", "code_128", "code_39", "qr_code", "data_matrix"];

declare global {
  interface Window {
    BarcodeDetector?: any;
  }
}

export function BarcodeScanner({ onDetected, onError, active }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [engine, setEngine] = useState<"native" | "zxing" | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [lastAttemptAt, setLastAttemptAt] = useState<number | null>(null);
  const [videoDims, setVideoDims] = useState<{ w: number; h: number } | null>(null);
  const [, forceTick] = useState(0);

  // Re-render every 400ms while scanning so "time since last attempt" and
  // the frame counter visibly update — proof the loop is actually running.
  useEffect(() => {
    if (status !== "scanning") return;
    const id = setInterval(() => forceTick((t) => t + 1), 400);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (!active) {
      cleanup();
      setStatus("idle");
      return;
    }

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setStatus("error");
      const msg = "Camera access requires HTTPS (or localhost). Serve this app over HTTPS to scan.";
      setErrorMessage(msg);
      onError?.("insecure_context", msg);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      const msg = "This browser doesn't support camera access.";
      setErrorMessage(msg);
      onError?.("unknown", msg);
      return;
    }

    let cancelled = false;
    setStatus("starting");
    setErrorMessage(null);

    async function start() {
      let stream: MediaStream;
      try {
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: any) {
        if (cancelled) return;
        setStatus("error");
        if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError" || err?.name === "SecurityError") {
          setErrorMessage("Camera access was denied. Allow camera permission for this site in your browser's address-bar/site settings, then try again.");
          onError?.("permission_denied", "Camera permission denied.");
        } else if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") {
          setErrorMessage("No usable camera was found on this device.");
          onError?.("no_camera", "No usable camera found.");
        } else if (err?.name === "NotReadableError" || err?.name === "TrackStartError") {
          setErrorMessage("The camera is already in use by another app or browser tab. Close it and retry.");
          onError?.("camera_in_use", "Camera already in use.");
        } else {
          setErrorMessage(err?.message || "Could not start the camera.");
          onError?.("unknown", err?.message || "Could not start the camera.");
        }
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current!;
      const workCanvas = document.createElement("canvas");
      canvasRef.current = workCanvas;
      video.srcObject = stream;
      video.onloadedmetadata = () => setVideoDims({ w: video.videoWidth, h: video.videoHeight });
      await video.play().catch(() => {});
      if (cancelled) return;
      setStatus("scanning");

      // Ask for continuous autofocus where the browser exposes it — laptop
      // webcams especially tend to focus once and stop, which is fatal for
      // scanning something held at varying distances.
      try {
        const [track] = stream.getVideoTracks();
        const capabilities = track.getCapabilities?.();
        if (capabilities && "focusMode" in capabilities && (capabilities as any).focusMode?.includes("continuous")) {
          await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as any] });
        }
      } catch {
        // Non-fatal — not all browsers/cameras expose focus control.
      }

      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) setDevices(allDevices.filter((d) => d.kind === "videoinput"));
      } catch {
        // Non-fatal — switch-camera control just won't be offered.
      }

      // --- Engine 1: native BarcodeDetector (Chrome/Edge/Android) ---
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        try {
          const supported: string[] = await window.BarcodeDetector.getSupportedFormats();
          const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
          if (formats.length > 0) {
            const detector = new window.BarcodeDetector({ formats });
            setEngine("native");
            let busy = false;
            let localFrames = 0;
            const loop = async () => {
              if (cancelled) return;
              if (!busy && video.readyState >= 2 && video.videoWidth > 0) {
                busy = true;
                try {
                  const frame = sharpenVideoFrame(video, workCanvas, GUIDE_BOX_ROI);
                  let results = await detector.detect(frame);
                  if (results.length === 0) {
                    // Fallback: the code may be sitting just outside the guide box —
                    // try the full frame before giving up on this attempt.
                    const fullFrame = sharpenVideoFrame(video, workCanvas);
                    results = await detector.detect(fullFrame);
                  }
                  localFrames += 1;
                  setFrameCount(localFrames);
                  setLastAttemptAt(Date.now());
                  if (results.length > 0) {
                    onDetected(results[0].rawValue, results[0].format);
                  }
                } catch (err) {
                  console.warn("BarcodeDetector error:", err);
                } finally {
                  busy = false;
                }
              }
              rafRef.current = requestAnimationFrame(loop);
            };
            rafRef.current = requestAnimationFrame(loop);
            return;
          }
        } catch (err) {
          console.warn("Native BarcodeDetector unavailable, falling back to ZXing:", err);
        }
      }

      // --- Engine 2: ZXing fallback (Firefox, Safari, older browsers) ---
      // Loaded lazily so @zxing never enters the initial bundle and is skipped
      // entirely when the native BarcodeDetector path succeeds above.
      setEngine("zxing");
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const { BarcodeFormat, DecodeHintType, NotFoundException } = await import("@zxing/library");
      const ZXING_FORMATS = [
        BarcodeFormat.EAN_13, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX,
      ];
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints);
      let localFrames = 0;
      let lastTick = 0;
      const zxingLoop = (timestamp: number) => {
        if (cancelled) return;
        if (timestamp - lastTick >= 150 && video.readyState >= 2 && video.videoWidth > 0) {
          lastTick = timestamp;
          try {
            const frame = sharpenVideoFrame(video, workCanvas, GUIDE_BOX_ROI);
            let result;
            try {
              result = reader.decodeFromCanvas(frame);
            } catch (cropErr) {
              if (!(cropErr instanceof NotFoundException)) throw cropErr;
              // Fallback: the code may be sitting just outside the guide box —
              // try the full frame before giving up on this attempt.
              const fullFrame = sharpenVideoFrame(video, workCanvas);
              result = reader.decodeFromCanvas(fullFrame);
            }
            localFrames += 1;
            setFrameCount(localFrames);
            setLastAttemptAt(Date.now());
            onDetected(result.getText(), String(result.getBarcodeFormat()));
          } catch (err) {
            if (!(err instanceof NotFoundException)) console.warn("Scanner decode warning:", err);
            localFrames += 1;
            setFrameCount(localFrames);
            setLastAttemptAt(Date.now());
          }
        }
        rafRef.current = requestAnimationFrame(zxingLoop);
      };
      zxingControlsRef.current = { stop: () => {} }; // rAF loop is stopped via cleanup()/rafRef
      rafRef.current = requestAnimationFrame(zxingLoop);
    }

    function cleanup() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      zxingControlsRef.current?.stop();
      zxingControlsRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setFrameCount(0);
      setLastAttemptAt(null);
      setVideoDims(null);
      setEngine(null);
    }

    start();

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, deviceId]);

  if (!active) return null;

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl2 border border-border bg-black">
        <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline autoPlay />
        {status === "scanning" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-1/2 w-3/4 rounded-lg border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        )}
        {status === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white">
            <Camera className="mr-2 animate-pulse" size={16} /> Requesting camera permission…
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 p-4 text-center text-sm text-white">
            <AlertCircle size={20} className="text-out shrink-0" />
            {errorMessage}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Zap size={12} /> EAN-13 · UPC-A · UPC-E · Code128 · Code39 · QR · Data Matrix
        </p>
        {devices.length > 1 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const idx = devices.findIndex((d) => d.deviceId === deviceId);
              const next = devices[(idx + 1) % devices.length];
              setDeviceId(next.deviceId);
            }}
          >
            <RefreshCw size={13} /> Switch camera
          </Button>
        )}
      </div>

      {status === "scanning" && (
        <div className="rounded-lg border border-border bg-surface2 p-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              Engine: <strong className="text-text">{engine ?? "starting…"}</strong>
            </span>
            <span>
              Frames scanned: <strong className="text-text">{frameCount}</strong>
            </span>
            {videoDims && (
              <span>
                Resolution: <strong className="text-text">{videoDims.w}×{videoDims.h}</strong>
              </span>
            )}
            {lastAttemptAt && (
              <span>
                Last attempt: <strong className="text-text">{((Date.now() - lastAttemptAt) / 1000).toFixed(1)}s ago</strong>
              </span>
            )}
          </div>
          {frameCount === 0 && (
            <p className="mt-1.5 text-out">
              No decode attempts yet — if this stays at 0, the scan loop isn't running (a real bug — tell me if you see this).
            </p>
          )}
          {frameCount > 0 && (
            <p className="mt-1.5 text-muted">
              Only the highlighted box is analyzed — hold the packet so the barcode sits fully inside it, flat, well-lit, filling as much of the box as possible.
            </p>
          )}
        </div>
      )}
    </div>
  );
}


