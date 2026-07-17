"use client";

import { useEffect, useRef, useState } from "react";
import { Crop, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  file: File;
  onCancel: () => void;
  onConfirm: (canvas: HTMLCanvasElement) => void;
}

interface Rect {
  x: number; // 0-1, fraction of displayed image width
  y: number;
  w: number;
  h: number;
}

/**
 * Lets the person drag a box around just the batch/expiry code before OCR
 * runs. This matters far more than any pixel-filter: running OCR on an
 * entire product label pulls in barcode bars, price text, and other
 * graphics as garbage characters that drown out the actual date code.
 * Cropping tightly to just that code is the single biggest accuracy lever
 * available for small dot-matrix print.
 */
export function ImageCropSelector({ file, onCancel, onConfirm }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ startX: number; startY: number } | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function relativePos(e: React.PointerEvent) {
    const bounds = containerRef.current!.getBoundingClientRect();
    return {
      x: Math.min(Math.max((e.clientX - bounds.left) / bounds.width, 0), 1),
      y: Math.min(Math.max((e.clientY - bounds.top) / bounds.height, 0), 1),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    const pos = relativePos(e);
    draggingRef.current = { startX: pos.x, startY: pos.y };
    setRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    const pos = relativePos(e);
    const { startX, startY } = draggingRef.current;
    setRect({
      x: Math.min(startX, pos.x),
      y: Math.min(startY, pos.y),
      w: Math.abs(pos.x - startX),
      h: Math.abs(pos.y - startY),
    });
  }
  function onPointerUp() {
    draggingRef.current = null;
  }

  const hasSelection = !!rect && rect.w > 0.02 && rect.h > 0.02;

  function confirm() {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let sx = 0,
      sy = 0,
      sw = img.naturalWidth,
      sh = img.naturalHeight;
    if (hasSelection && rect) {
      sx = rect.x * img.naturalWidth;
      sy = rect.y * img.naturalHeight;
      sw = rect.w * img.naturalWidth;
      sh = rect.h * img.naturalHeight;
    }
    canvas.width = sw;
    canvas.height = sh;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    onConfirm(canvas);
  }

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Crop size={12} /> Drag a box around just the batch/expiry code — cropping tightly is the #1 way to improve accuracy.
      </p>
      <div
        ref={containerRef}
        className="relative touch-none select-none overflow-hidden rounded-lg border border-border bg-black"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {imgUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img ref={imgRef} src={imgUrl} alt="Captured label" className="block w-full select-none" draggable={false} />
        )}
        {rect && rect.w > 0 && rect.h > 0 && (
          <div
            className="pointer-events-none absolute border-2 border-primary bg-primary/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
            style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%` }}
          />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X size={13} /> Cancel
        </Button>
        {hasSelection && (
          <Button size="sm" variant="secondary" onClick={() => setRect(null)}>
            Reset selection
          </Button>
        )}
        <Button size="sm" variant="primary" onClick={confirm}>
          {hasSelection ? "Extract text from selection" : "Extract text from full image"}
        </Button>
      </div>
    </div>
  );
}
