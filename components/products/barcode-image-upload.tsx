"use client";

import { useRef, useState } from "react";
import { ImageUp, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sharpenImageToCanvas, loadImageElement } from "./image-preprocess";
import { ImageCropSelector } from "./image-crop";

interface Props {
  onDetected: (barcode: string, format: string) => void;
  onOcrFallback?: (canvas: HTMLCanvasElement) => void;
}

/**
 * Decodes a real barcode/QR code from a still image the user uploads or
 * captures — no camera stream required.
 */
export function BarcodeImageUpload({ onDetected, onOcrFallback }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastCanvasRef = useRef<HTMLCanvasElement | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPendingFile(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function decodeCrop(cropCanvas: HTMLCanvasElement, originalFile: File) {
    lastCanvasRef.current = cropCanvas;
    setPendingFile(null);
    setBusy(true);
    setError(null);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const { BarcodeFormat, DecodeHintType, NotFoundException } = await import("@zxing/library");
      const SUPPORTED_FORMATS = [
        BarcodeFormat.EAN_13, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX,
      ];
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, SUPPORTED_FORMATS);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints);

      // Attempt 1: sharpened + binarized crop
      try {
        const sharpened = sharpenImageToCanvas(cropCanvas, { upscale: 2, binarizeOutput: true });
        const result = reader.decodeFromCanvas(sharpened);
        onDetected(result.getText(), String(result.getBarcodeFormat()));
        return;
      } catch (err) {
        if (!(err instanceof NotFoundException)) console.warn("Sharpened crop decode error:", err);
      }

      // Attempt 2: raw crop, unscaled
      try {
        const result = reader.decodeFromCanvas(cropCanvas);
        onDetected(result.getText(), String(result.getBarcodeFormat()));
        return;
      } catch (err) {
        if (!(err instanceof NotFoundException)) console.warn("Raw crop decode error:", err);
      }

      // Attempt 3: the original full image
      try {
        const img = await loadImageElement(originalFile);
        const result = await reader.decodeFromImageElement(img);
        onDetected(result.getText(), String(result.getBarcodeFormat()));
        return;
      } catch (err) {
        if (!(err instanceof NotFoundException)) console.warn("Full-image decode error:", err);
      }

      setError("No standard barcode bars detected in this crop. If this is a product expiry/batch label, use OCR below.");
    } catch (err: any) {
      setError(err?.message || "Couldn't read that image.");
    } finally {
      setBusy(false);
    }
  }

  if (pendingFile) {
    return (
      <ImageCropSelector
        file={pendingFile}
        onCancel={() => setPendingFile(null)}
        onConfirm={(canvas) => decodeCrop(canvas, pendingFile)}
      />
    );
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <Button type="button" variant="secondary" className="w-full" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Sharpening & reading barcode…
          </>
        ) : (
          <>
            <ImageUp size={14} /> Upload barcode photo
          </>
        )}
      </Button>
      {error && (
        <div className="space-y-2 rounded-lg border border-out/25 bg-out/5 p-2.5">
          <p className="flex items-start gap-1 text-xs text-out">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {error}
          </p>
          {onOcrFallback && lastCanvasRef.current && (
            <Button
              type="button"
              size="sm"
              variant="primary"
              className="w-full text-xs"
              onClick={() => {
                if (lastCanvasRef.current && onOcrFallback) {
                  onOcrFallback(lastCanvasRef.current);
                }
              }}
            >
              Scan as Expiry / Batch Label with OCR
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
