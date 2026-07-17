"use client";

import { useState } from "react";
import { Camera, Loader2, ScanText, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runOcr, LOW_CONFIDENCE_THRESHOLD, type OcrExtraction } from "./ocr-extract";
import { OcrCameraCapture } from "./ocr-camera-capture";

interface Props { onExtracted: (extraction: OcrExtraction) => void; barcode?: string; }

/** Connects the camera acquisition UI to the pre-existing OCR implementation. */
export function OcrCapture({ onExtracted, barcode }: Props) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [noDatesFound, setNoDatesFound] = useState(false);

  async function runOnCrop(canvas: HTMLCanvasElement) {
    setCameraOpen(false); setError(null); setRawText(null); setNoDatesFound(false); setProgress(0);
    try {
      const extraction = await runOcr(canvas, setProgress, { excludeCode: barcode });
      setRawText(extraction.rawText); setNoDatesFound(!extraction.fields.mfgDate && !extraction.fields.expiryDate); onExtracted(extraction);
    } catch (cause) { console.error("OCR failed:", cause); setError("Couldn't read that label crop. Retake it with the expiry code filling the guide box."); }
    finally { setProgress(null); }
  }

  return <div className="space-y-2">
    {cameraOpen && <OcrCameraCapture onClose={() => setCameraOpen(false)} onUsePhoto={runOnCrop} />}
    <Button type="button" variant="secondary" onClick={() => setCameraOpen(true)} disabled={progress !== null}>
      {progress !== null ? <><Loader2 size={14} className="animate-spin" /> Reading label… {progress}%</> : <><Camera size={14} /> Capture label for OCR</>}
    </Button>
    <p className="flex items-center gap-1 text-xs text-muted"><ScanText size={12} /> Capture the printed expiry, manufacturing, batch or lot code.</p>
    {error && <p className="flex items-center gap-1 text-xs text-out"><AlertTriangle size={12} /> {error}</p>}
    {noDatesFound && <p className="flex items-center gap-1 text-xs text-low"><AlertTriangle size={12} /> No date was confidently found. Retake with a tighter expiry-code crop.</p>}
    {rawText !== null && <><button type="button" className="flex items-center gap-1 text-xs text-primary underline" onClick={() => setShowRaw((value) => !value)}><FileText size={12} /> {showRaw ? "Hide" : "Show"} raw OCR text</button>{showRaw && <pre className="max-h-36 overflow-y-auto rounded-lg border border-border bg-surface2 p-2 text-[11px] leading-snug text-muted whitespace-pre-wrap">{rawText || "(no text detected)"}</pre>}</>}
  </div>;
}

export { LOW_CONFIDENCE_THRESHOLD };
