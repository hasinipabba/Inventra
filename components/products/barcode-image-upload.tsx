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

  function padCanvas(canvas: HTMLCanvasElement, padding = 24): HTMLCanvasElement {
    const padded = document.createElement("canvas");
    padded.width = canvas.width + padding * 2;
    padded.height = canvas.height + padding * 2;
    const ctx = padded.getContext("2d", { willReadFrequently: true });
    if (!ctx) return canvas;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, padded.width, padded.height);
    ctx.drawImage(canvas, padding, padding);
    return padded;
  }

  function rotateCanvas(canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
    if (degrees % 360 === 0) return canvas;
    const rotated = document.createElement("canvas");
    const ctx = rotated.getContext("2d", { willReadFrequently: true });
    if (!ctx) return canvas;
    if (degrees === 90 || degrees === 270) {
      rotated.width = canvas.height;
      rotated.height = canvas.width;
    } else {
      rotated.width = canvas.width;
      rotated.height = canvas.height;
    }
    ctx.translate(rotated.width / 2, rotated.height / 2);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    return rotated;
  }

  async function decodeCrop(cropCanvas: HTMLCanvasElement, originalFile: File) {
    lastCanvasRef.current = cropCanvas;
    setPendingFile(null);
    setBusy(true);
    setError(null);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const { BarcodeFormat, DecodeHintType } = await import("@zxing/library");
      const SUPPORTED_FORMATS = [
        BarcodeFormat.EAN_13,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.ITF,
      ];
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, SUPPORTED_FORMATS);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints);

      const padded = padCanvas(cropCanvas, 24);
      const rotations = [0, 90, 180, 270];

      // Strategy 1: ZXing on padded crop across all 4 orientations (handles rotated/vertical barcodes)
      for (const deg of rotations) {
        try {
          const rotCanvas = rotateCanvas(padded, deg);
          const result = reader.decodeFromCanvas(rotCanvas);
          const text = result.getText()?.trim();
          if (text) {
            onDetected(text, String(result.getBarcodeFormat()));
            return;
          }
        } catch {
          // continue
        }
      }

      // Strategy 2: Native BarcodeDetector (Chrome/Edge/Android GPU accelerated)
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        try {
          const supported = await window.BarcodeDetector.getSupportedFormats();
          const linearFormats = ["ean_13", "upc_a", "code_128", "code_39", "qr_code"];
          const formats = linearFormats.filter((f) => supported.includes(f));
          if (formats.length > 0) {
            const detector = new window.BarcodeDetector({ formats });
            for (const deg of [0, 90]) {
              const rot = rotateCanvas(padded, deg);
              const results = await detector.detect(rot).catch(() => []);
              if (results && results.length > 0) {
                onDetected(results[0].rawValue.trim(), results[0].format);
                return;
              }
            }
          }
        } catch {
          // ignore
        }
      }

      // Strategy 3: Contrast boosted + scaled (2x) crop
      try {
        const sharpened = sharpenImageToCanvas(padded, { upscale: 2, binarizeOutput: false });
        for (const deg of [0, 90]) {
          const rot = rotateCanvas(sharpened, deg);
          const result = reader.decodeFromCanvas(rot);
          const text = result.getText()?.trim();
          if (text) {
            onDetected(text, String(result.getBarcodeFormat()));
            return;
          }
        }
      } catch {
        // ignore
      }

      // Strategy 4: The original full uncropped image
      try {
        const img = await loadImageElement(originalFile);
        const result = await reader.decodeFromImageElement(img);
        const text = result.getText()?.trim();
        if (text) {
          onDetected(text, String(result.getBarcodeFormat()));
          return;
        }
      } catch {
        // ignore
      }

      // Strategy 5: OCR Fallback — Read the human-readable 8-14 digit numbers printed directly under the barcode bars
      try {
        const { runOcr } = await import("./ocr-extract");
        const ocrCrop = await runOcr(padded).catch(() => null);
        let digits = ocrCrop?.rawText.match(/\b(?:\d[\s-]?){8,14}\b/);

        if (!digits) {
          const img = await loadImageElement(originalFile);
          const fullCanvas = document.createElement("canvas");
          fullCanvas.width = img.naturalWidth;
          fullCanvas.height = img.naturalHeight;
          const ctx = fullCanvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const ocrFull = await runOcr(fullCanvas).catch(() => null);
            digits = ocrFull?.rawText.match(/\b(?:\d[\s-]?){8,14}\b/);
          }
        }

        if (digits) {
          const barcodeClean = digits[0].replace(/[\s-]/g, "");
          if (barcodeClean.length >= 8 && barcodeClean.length <= 14) {
            onDetected(barcodeClean, "OCR_BARCODE_NUMBERS");
            return;
          }
        }
      } catch {
        // ignore
      }

      setError(
        "Could not detect barcode bars or printed numbers in this photo. Please crop tightly to the barcode (including the numbers underneath), or type the code in the 'Manual Entry' tab."
      );
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
        confirmLabel="Decode Barcode"
        hintText="Drag a box around the barcode bars and the numbers printed below them."
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
