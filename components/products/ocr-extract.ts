import { adaptiveThresholdMask } from "./image-preprocess";

export interface OcrFieldResult {
  value: string;
  confidence: number; // 0-100
}

export interface OcrExtraction {
  rawText: string;
  overallConfidence: number;
  fields: {
    expiryDate?: OcrFieldResult;
    mfgDate?: OcrFieldResult;
    batchNumber?: OcrFieldResult;
    lotNumber?: OcrFieldResult;
    mrp?: OcrFieldResult;
    netWeight?: OcrFieldResult;
    quantity?: OcrFieldResult;
  };
}

/** Confidence below this threshold means the field must be highlighted for manual verification. */
export const LOW_CONFIDENCE_THRESHOLD = 65;

// ---------------------------------------------------------------------------
// Real calendar-date validation. This is what actually makes dates
// trustworthy: a plain regex will happily accept "17/0404" or "40/13/2026" —
// this rejects anything that isn't a real, plausible packaging-label date.
// ---------------------------------------------------------------------------
function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  let y: number, mo: number, da: number;
  let m: RegExpMatchArray | null;

  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) {
    y = +m[1]; mo = +m[2]; da = +m[3];
  } else if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) {
    da = +m[1]; mo = +m[2]; y = +m[3];
  } else if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/))) {
    da = +m[1]; mo = +m[2]; y = 2000 + +m[3];
  } else if ((m = s.match(/^(\d{1,2})[-/.](\d{4})$/))) {
    mo = +m[1]; y = +m[2]; da = 1;
  } else {
    return null;
  }

  if (mo < 1 || mo > 12) return null;
  if (da < 1 || da > 31) return null;
  if (y < 2015 || y > 2040) return null;

  const dt = new Date(y, mo - 1, da);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== da) return null;

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(mo)}-${pad(da)}`;
}

const DATE_SHAPE = /(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}|\d{1,2}[-/.]\d{4})/;

/** Looks for a date on the same line as a keyword (MFG, EXP, etc.), or within ~15 chars of it anywhere in the text. */
function findDateNear(text: string, keywords: RegExp): string | null {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (keywords.test(line)) {
      const found = line.match(DATE_SHAPE);
      if (found) {
        const norm = normalizeDate(found[1]);
        if (norm) return norm;
      }
    }
  }
  const combined = new RegExp(keywords.source + "[^\\d]{0,15}" + DATE_SHAPE.source, "i");
  const m = text.match(combined);
  if (m) {
    const norm = normalizeDate(m[1]);
    if (norm) return norm;
  }
  return null;
}

/** Every date-shaped substring in the text, in reading order, with its validity. */
function extractAllDateCandidates(text: string): { index: number; normalized: string | null }[] {
  const pattern = /\b(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}|\d{1,2}[-/.]\d{4})\b/g;
  const out: { index: number; normalized: string | null }[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    out.push({ index: m.index, normalized: normalizeDate(m[1]) });
  }
  return out;
}

/** Adds a day/month/year duration to a normalized yyyy-mm-dd date. */
function addDuration(dateStr: string, amount: number, unit: "day" | "month" | "year"): string {
  const [y, mo, da] = dateStr.split("-").map(Number);
  const dt = new Date(y, mo - 1, da);
  if (unit === "day") dt.setDate(dt.getDate() + amount);
  else if (unit === "month") dt.setMonth(dt.getMonth() + amount);
  else dt.setFullYear(dt.getFullYear() + amount);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/**
 * Many packaged goods (very common on Indian FMCG/grocery labels) print
 * "Best Before 6 Months from Packaging" instead of a literal expiry date.
 * Detects that pattern so expiry can be computed from the mfg date.
 */
function parseBestBeforeDuration(text: string): { amount: number; unit: "day" | "month" | "year" } | null {
  const m = text.match(/best\s*before\s*(\d+)\s*(day|days|month|months|year|years)/i);
  if (!m) return null;
  const amount = parseInt(m[1], 10);
  const unitRaw = m[2].toLowerCase();
  const unit: "day" | "month" | "year" = unitRaw.startsWith("day") ? "day" : unitRaw.startsWith("month") ? "month" : "year";
  return { amount, unit };
}

/**
 * Resolves manufacturing + expiry dates from raw OCR text.
 *
 * 1. Look for a date next to explicit keywords (MFG/PKD.../EXP/BEST BEFORE...).
 *    High-confidence path, covers most clean labels.
 * 2. If a keyword got garbled by OCR (very common on small dot-matrix print),
 *    fall back to every date-shaped, calendar-valid string on the whole
 *    label. Manufacturing date is printed before expiry on real packaging,
 *    so with two survivors: earliest in reading order = mfg, latest = expiry.
 * 3. With only one salvageable date and no keyword match, check whether a
 *    *rejected* (invalid) date sits before or after it — that position hints
 *    whether it was the first or second date on the label. If genuinely
 *    ambiguous, leave both blank rather than guess wrong — the UI asks for
 *    manual entry instead of silently showing a wrong date.
 */
function resolveDates(rawText: string, foundConf: number, fallbackConf: number) {
  let mfg = findDateNear(rawText, /(MFG|MANUFACTURED|PKD|PACKED\s*ON)/i);
  let exp = findDateNear(rawText, /(EXP|EXPIRY|BEST\s*BEFORE|USE\s*BY|USE\s*BEFORE)/i);
  let mfgConf = mfg ? foundConf : 0;
  let expConf = exp ? foundConf : 0;

  if (!mfg || !exp) {
    const candidates = extractAllDateCandidates(rawText);
    const seen = new Set<string>();
    const validInOrder = candidates.filter((c) => {
      if (!c.normalized || c.normalized === mfg || c.normalized === exp) return false;
      if (seen.has(c.normalized)) return false;
      seen.add(c.normalized);
      return true;
    });

    if (!mfg && !exp && validInOrder.length >= 2) {
      mfg = validInOrder[0].normalized;
      exp = validInOrder[validInOrder.length - 1].normalized;
      mfgConf = fallbackConf;
      expConf = fallbackConf;
    } else if (!mfg && !exp && validInOrder.length === 1) {
      const idx = validInOrder[0].index;
      const rejectedAfter = candidates.some((c) => !c.normalized && c.index > idx);
      const rejectedBefore = candidates.some((c) => !c.normalized && c.index < idx);
      if (rejectedAfter && !rejectedBefore) {
        mfg = validInOrder[0].normalized;
        mfgConf = fallbackConf;
      } else if (rejectedBefore && !rejectedAfter) {
        exp = validInOrder[0].normalized;
        expConf = fallbackConf;
      }
      // else: ambiguous — leave both blank, don't guess.
    } else if (!exp && validInOrder.length >= 1) {
      exp = validInOrder[validInOrder.length - 1].normalized;
      expConf = fallbackConf;
    } else if (!mfg && validInOrder.length >= 1) {
      mfg = validInOrder[0].normalized;
      mfgConf = fallbackConf;
    }
  }

  // "Best Before 6 Months from Packaging" style labels — no literal expiry
  // date is printed at all, so compute one from the mfg date + duration.
  if (mfg && !exp) {
    const duration = parseBestBeforeDuration(rawText);
    if (duration) {
      exp = addDuration(mfg, duration.amount, duration.unit);
      expConf = fallbackConf;
    }
  }

  return { mfg, mfgConf, exp, expConf };
}

function parseBatch(text: string): string | null {
  const m = text.match(/(?:BATCH)[\s#:.-]*([A-Z0-9-]{3,15})/i);
  return m ? m[1].toUpperCase() : null;
}
function parseLot(text: string): string | null {
  const m = text.match(/(?:LOT)\s*(?:NO\.?)?[\s#:.-]*([A-Z0-9-]{3,15})/i);
  return m ? m[1].toUpperCase() : null;
}
/**
 * Excludes the barcode that was just scanned (and any other known
 * already-assigned values) from batch-number guesses. Without this, a
 * label photo that includes the barcode's own printed digits — extremely
 * common, since the barcode number is usually printed right under the
 * bars — gets mistaken for the batch code.
 */
function parseBatchFallback(text: string, exclude: string[]): string | null {
  const matches = text.match(/\b\d{4,13}\b/g) || [];
  for (const n of matches) if (!exclude.includes(n)) return n;
  return null;
}
function parseWeight(text: string): { amount: string; unit: string } | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s?(kg|g|ml|l)\b/i);
  return m ? { amount: m[1], unit: m[2].toLowerCase() } : null;
}
function parseMrp(text: string): string | null {
  const m = text.match(/mrp[^\d]{0,10}(\d+(?:[.,]\d{1,2})?)/i);
  return m ? m[1] : null;
}
function parseQuantity(text: string): string | null {
  const m = text.match(/(?:qty|quantity|contents)[^\d]{0,10}(\d+)/i);
  return m ? m[1] : null;
}

function loadImageElement(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function drawSourceToCanvas(source: File | Blob | HTMLCanvasElement, scale: number): Promise<HTMLCanvasElement> {
  return new Promise(async (resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      if (source instanceof HTMLCanvasElement) {
        canvas.width = Math.round(source.width * scale);
        canvas.height = Math.round(source.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D context unavailable");
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
        return;
      }
      const img = await loadImageElement(source);
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Grayscale + contrast boost + Otsu binarization + 3x upscale. Crops and
 * small, low-contrast dot-matrix print (expiry/batch codes) benefit far
 * more from binarization than from a flat contrast boost — this is what
 * actually fixes garbled OCR on printed date codes, as opposed to just
 * making the existing noise more visible.
 */
async function preprocessForOcr(source: File | Blob | HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const scale = 3;
  const canvas = await drawSourceToCanvas(source, scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;
  const contrast = 1.5;
  const gray = new Uint8ClampedArray(canvas.width * canvas.height);

  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    let v = (g - 128) * contrast + 128;
    v = Math.max(0, Math.min(255, v));
    gray[p] = v;
  }

  const threshold = adaptiveThresholdMask(gray, canvas.width, canvas.height);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const v = threshold[p];
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Runs real OCR on an image (captured from camera or uploaded) and maps the
 * recognized text onto known label patterns. Dates are calendar-validated,
 * not just regex-matched, so garbled OCR output is rejected rather than
 * silently accepted as a date.
 *
 * `opts.excludeCode` should be the barcode that was just scanned — labels
 * routinely print that same number right under the bars, and without
 * excluding it explicitly it gets mistaken for the batch code.
 */
export async function runOcr(
  image: File | Blob | HTMLCanvasElement,
  onProgress?: (pct: number) => void,
  opts?: { excludeCode?: string }
): Promise<OcrExtraction> {
  const { createWorker, PSM } = await import("tesseract.js");
  const preprocessed = await preprocessForOcr(image);

  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) onProgress(Math.round(m.progress * 100));
    },
  });

  try {
    // Batch/expiry/lot codes are only ever letters, digits, and a handful of
    // punctuation marks. Restricting tesseract to that alphabet stops it
    // from "recognizing" barcode bars or price-tag symbols as garbage
    // characters (§, ¢, £, etc.) that then pollute every downstream regex.
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/-.:, ",
      // PSM 6 = "assume a single uniform block of text". Much better than the
      // default automatic layout analysis for a cropped, mostly-text label
      // region instead of a full page.
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    });

    const { data } = await worker.recognize(preprocessed);
    const rawText = data.text || "";
    const overall = Math.round(data.confidence ?? 60);

    const baseConf = Math.min(99, Math.max(35, overall));
    const foundConf = Math.min(99, baseConf + 4); // keyword-matched — high trust
    const fallbackConf = Math.max(60, baseConf - 10); // positionally guessed — flagged for review

    const { mfg, mfgConf, exp, expConf } = resolveDates(rawText, foundConf, fallbackConf);

    const batchKeyword = parseBatch(rawText);
    const weight = parseWeight(rawText);
    let batch = batchKeyword;
    let batchConf = batch ? foundConf : 0;
    if (!batch) {
      const exclude = [weight?.amount, mfg, exp, opts?.excludeCode].filter(Boolean) as string[];
      batch = parseBatchFallback(rawText, exclude);
      if (batch) batchConf = fallbackConf;
    }

    const mrp = parseMrp(rawText);
    const qty = parseQuantity(rawText);
    const lot = parseLot(rawText);

    function field(value: string | null, confidence: number): OcrFieldResult | undefined {
      return value ? { value, confidence } : undefined;
    }

    return {
      rawText,
      overallConfidence: overall,
      fields: {
        mfgDate: field(mfg, mfgConf),
        expiryDate: field(exp, expConf),
        batchNumber: field(batch, batchConf),
        lotNumber: field(lot, lot ? foundConf : 0),
        mrp: field(mrp, mrp ? foundConf : 0),
        netWeight: field(weight ? `${weight.amount}${weight.unit}` : null, weight ? foundConf : 0),
        quantity: field(qty, qty ? foundConf : 0),
      },
    };
  } finally {
    await worker.terminate();
  }
}
