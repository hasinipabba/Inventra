"use client";

import { useState, useRef } from "react";
import { Camera, Loader2, ScanText, AlertTriangle, FileText, ImageUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runOcr, LOW_CONFIDENCE_THRESHOLD, type OcrExtraction } from "./ocr-extract";
import { OcrCameraCapture } from "./ocr-camera-capture";
import { ImageCropSelector } from "./image-crop";

interface Props { onExtracted: (extraction: OcrExtraction) => void; barcode?: string; }

/** Connects camera and image upload acquisition UI to the OCR engine. */
export function OcrCapture({ onExtracted, barcode }: Props) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [noDatesFound, setNoDatesFound] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function runOnCrop(canvas: HTMLCanvasElement) {
    setCameraOpen(false);
    setCropFile(null);
    setError(null);
    setRawText(null);
    setNoDatesFound(false);
    setProgress(0);
    try {
      const extraction = await runOcr(canvas, setProgress, { excludeCode: barcode });
      setRawText(extraction.rawText);
      setNoDatesFound(!extraction.fields.mfgDate && !extraction.fields.expiryDate);
      onExtracted(extraction);
    } catch (cause) {
      console.error("OCR failed:", cause);
      setError("Couldn't read that label crop. Retake or re-crop with the expiry code filling the guide box.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="space-y-2">
      {cameraOpen && <OcrCameraCapture onClose={() => setCameraOpen(false)} onUsePhoto={runOnCrop} />}

      {cropFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xl space-y-3 rounded-xl border border-border bg-surface p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div>
                <p className="text-sm font-semibold">Crop Label for OCR</p>
                <p className="text-xs text-muted">Crop tightly to the printed expiry or batch line for highest accuracy.</p>
              </div>
              <button
                type="button"
                className="rounded p-1 text-muted hover:bg-surface2 hover:text-text"
                onClick={() => setCropFile(null)}
              >
                <X size={16} />
              </button>
            </div>
            <ImageCropSelector
              file={cropFile}
              onCancel={() => setCropFile(null)}
              onConfirm={runOnCrop}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setCameraOpen(true)}
          disabled={progress !== null}
        >
          {progress !== null ? (
            <><Loader2 size={13} className="animate-spin" /> Reading label… {progress}%</>
          ) : (
            <><Camera size={13} /> Camera OCR</>
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={progress !== null}
        >
          <ImageUp size={13} /> Upload photo
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setCropFile(file);
              e.target.value = "";
            }
          }}
        />
      </div>

      <p className="flex items-center gap-1 text-xs text-muted">
        <ScanText size={12} /> Scan printed expiry, manufacturing, batch, MRP or net weight.
      </p>
      {error && <p className="flex items-center gap-1 text-xs text-out"><AlertTriangle size={12} /> {error}</p>}
      {noDatesFound && <p className="flex items-center gap-1 text-xs text-low"><AlertTriangle size={12} /> No date was confidently found. Retake with a tighter expiry-code crop.</p>}
      {rawText !== null && (
        <>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-primary underline"
            onClick={() => setShowRaw((v) => !v)}
          >
            <FileText size={12} /> {showRaw ? "Hide" : "Show"} raw OCR text
          </button>
          {showRaw && (
            <pre className="max-h-36 overflow-y-auto rounded-lg border border-border bg-surface2 p-2 text-[11px] leading-snug text-muted whitespace-pre-wrap">
              {rawText || "(no text detected)"}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

export { LOW_CONFIDENCE_THRESHOLD };

