export interface OcrFieldResult {
  value: string;
  confidence: number; // 0-100
}

export interface OcrExtraction {
  rawText: string;
  overallConfidence: number;
  fields: {
    productName?: OcrFieldResult;
    brand?: OcrFieldResult;
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

const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

// ---------------------------------------------------------------------------
// Real calendar-date validation. Supports numeric and named month patterns
// (e.g. "15/10/2026", "2026-10-15", "15-OCT-2026", "OCT 2026", "11/25").
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
  } else if ((m = s.match(/^(\d{1,2})[-/\s.]([a-z]{3,9})[-/\s.](\d{2,4})$/i))) {
    da = +m[1];
    mo = MONTH_MAP[m[2].slice(0, 3).toLowerCase()] || 0;
    y = +m[3];
    if (y < 100) y += 2000;
  } else if ((m = s.match(/^([a-z]{3,9})[-/\s.](\d{1,2})[-/\s.](\d{2,4})$/i))) {
    mo = MONTH_MAP[m[1].slice(0, 3).toLowerCase()] || 0;
    da = +m[2];
    y = +m[3];
    if (y < 100) y += 2000;
  } else if ((m = s.match(/^([a-z]{3,9})[-/\s.](\d{2,4})$/i))) {
    mo = MONTH_MAP[m[1].slice(0, 3).toLowerCase()] || 0;
    da = 1;
    y = +m[2];
    if (y < 100) y += 2000;
  } else {
    return null;
  }

  if (mo < 1 || mo > 12) return null;
  if (da < 1 || da > 31) return null;
  if (y < 2015 || y > 2045) return null;

  const dt = new Date(y, mo - 1, da);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== da) return null;

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(mo)}-${pad(da)}`;
}

const DATE_SHAPE = /(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}|\d{1,2}[-/.]\d{4}|\d{1,2}[-/\s.](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/\s.]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/\s.]\d{2,4})/i;

/** Looks for a date on the same line as a keyword (MFG, EXP, etc.), or within ~20 chars of it. */
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
  const combined = new RegExp(keywords.source + "[^\\d\\w]{0,20}" + DATE_SHAPE.source, "i");
  const m = text.match(combined);
  if (m) {
    const norm = normalizeDate(m[1]);
    if (norm) return norm;
  }
  return null;
}

/** Every date-shaped substring in the text, in reading order, with its validity. */
function extractAllDateCandidates(text: string): { index: number; normalized: string | null }[] {
  const pattern = /\b(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}|\d{1,2}[-/.]\d{4}|\d{1,2}[-/\s.](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/\s.]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/\s.]\d{2,4})\b/gi;
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
 * Handles "Best Before 6 Months from Packaging" style dates.
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
 */
function resolveDates(rawText: string, foundConf: number, fallbackConf: number) {
  let mfg = findDateNear(rawText, /(MFG|MANUFACTURED|PKD|PACKED\s*ON|MFD)/i);
  let exp = findDateNear(rawText, /(EXP|EXPIRY|BEST\s*BEFORE|USE\s*BY|USE\s*BEFORE|VALID\s*TILL)/i);
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
      } else {
        // Assume single date without other info is expiry
        exp = validInOrder[0].normalized;
        expConf = fallbackConf;
      }
    } else if (!exp && validInOrder.length >= 1) {
      exp = validInOrder[validInOrder.length - 1].normalized;
      expConf = fallbackConf;
    } else if (!mfg && validInOrder.length >= 1) {
      mfg = validInOrder[0].normalized;
      mfgConf = fallbackConf;
    }
  }

  // "Best Before X Months" pattern
  if (mfg && !exp) {
    const duration = parseBestBeforeDuration(rawText);
    if (duration) {
      exp = addDuration(mfg, duration.amount, duration.unit);
      expConf = fallbackConf;
    }
  }

  return { mfg, mfgConf, exp, expConf };
}

const COMMON_NON_BATCH_WORDS = new Set([
  "BISCUIT", "BISCUITS", "COOKIE", "COOKIES", "CHOCOLATE", "SNACK", "SNACKS",
  "PRODUCT", "PRODUCTS", "BRAND", "BRITANNIA", "PARLE", "GOODDAY", "CADBURY", "NESTLE",
  "AMUL", "HALDIRAM", "MAGGI", "INGREDIENTS", "PACKAGE", "PACKAGED", "CONTAIN", "CONTAINS",
  "BEST", "BEFORE", "MONTHS", "DATE", "DATES", "MFG", "EXP", "EXPIRY", "USE", "CONSUME",
  "STORE", "COOL", "DRY", "PLACE", "AWAY", "SUNLIGHT", "VEG", "NUTRITION", "ENERGY",
  "PROTEIN", "CARBOHYDRATE", "SUGAR", "FAT", "SODIUM", "FSSAI", "CUSTOMER", "CARE",
  "FEEDBACK", "EMAIL", "ADDRESS", "MARKETED", "MANUFACTURED", "LTD", "LIMITED", "PVT",
  "PRIVATE", "WEIGHT", "QUANTITY", "PRICE", "MAXIMUM", "RETAIL", "INCLUSIVE", "TAXES",
  "BATCH", "NUMBER", "CONTROL", "ORDER"
]);

function isValidBatchCode(code: string | null | undefined): boolean {
  if (!code) return false;
  const upper = code.trim().toUpperCase();
  if (upper.length < 2 || upper.length > 25) return false;
  if (COMMON_NON_BATCH_WORDS.has(upper)) return false;

  // Real manufacturing batch/lot codes almost invariably contain numeric digits (e.g. 2310A, B102, LOT-492)
  // Pure alphabetic English words are product names or instructions, never batch codes.
  if (!/\d/.test(upper)) return false;

  // Ignore 4-digit years like 2023 or 2024
  if (/^\d{4}$/.test(upper)) return false;

  // Ignore full date strings like 12-10-2023
  if (/^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/.test(upper)) return false;

  return true;
}

function parseBatch(text: string): string | null {
  const m = text.match(/(?:BATCH|B\.?NO|B\.?N|LOT)(?:\s*(?:&|\/|AND)?\s*(?:CONTROL)?\s*(?:NO\.?|NUMBER)?)?[\s#:.-]+([A-Z0-9-]{2,20})/i);
  if (m && isValidBatchCode(m[1])) return m[1].toUpperCase();
  return null;
}

function parseLot(text: string): string | null {
  const m = text.match(/(?:LOT)(?:\s*(?:&|\/|AND)?\s*(?:CONTROL)?\s*(?:NO\.?|NUMBER)?)?[\s#:.-]+([A-Z0-9-]{2,20})/i);
  if (m && isValidBatchCode(m[1])) return m[1].toUpperCase();
  return null;
}

function parseBatchFallback(text: string, exclude: string[]): string | null {
  // Only look for alphanumeric tokens containing at least one digit
  const matches = text.match(/\b(?=[A-Z0-9-]*\d)[A-Z0-9-]{3,16}\b/gi) || [];
  const upperExclude = new Set(exclude.map((e) => e.toUpperCase()));
  for (const n of matches) {
    const upper = n.toUpperCase();
    if (!upperExclude.has(upper) && isValidBatchCode(upper)) {
      return upper;
    }
  }
  return null;
}

function parseProductTitle(rawText: string): { brand?: string; name?: string } {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 3 && l.length <= 40);

  const ignoredKeywords = /(?:MFG|EXP|BATCH|LOT|B\.?NO|MRP|RS\.?|NET|WT|WEIGHT|GRAM|KG|BEST\s*BEFORE|USE\s*BY|FSSAI|NUTRITION|INGREDIENT|CONTAIN|CUSTOMER|FEEDBACK|DATE|KEEP|STORE|COOL|DRY)/i;

  const titleLines: string[] = [];
  for (const line of lines) {
    if (!ignoredKeywords.test(line) && /[a-z]{3,}/i.test(line)) {
      titleLines.push(line);
      if (titleLines.length >= 2) break;
    }
  }

  if (titleLines.length === 0) return {};
  if (titleLines.length === 1) return { name: titleLines[0] };
  return { brand: titleLines[0], name: titleLines[1] };
}

function parseWeight(text: string): { amount: string; unit: string } | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s?(kg|g|ml|l)\b/i);
  return m ? { amount: m[1], unit: m[2].toLowerCase() } : null;
}

function parseMrp(text: string): string | null {
  const m = text.match(/(?:mrp|price|rs\.?|₹)[^\d]{0,10}(\d+(?:[.,]\d{1,2})?)/i);
  return m ? m[1] : null;
}

function parseQuantity(text: string): string | null {
  const m = text.match(/(?:qty|quantity|contents|count)[^\d]{0,10}(\d+)/i);
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
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
        return;
      }
      const img = await loadImageElement(source);
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Preprocesses image for Tesseract OCR.
 * Preserves high-quality anti-aliased grayscale gradients rather than harsh
 * 1-bit thresholding, which enables Tesseract's LSTM neural network to
 * accurately distinguish similar glyphs (e.g. 8 vs B, 0 vs O).
 */
async function preprocessForOcr(source: File | Blob | HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const scale = 2;
  const canvas = await drawSourceToCanvas(source, scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;
  const contrast = 1.35;

  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    let v = (g - 128) * contrast + 128;
    v = Math.max(0, Math.min(255, v));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Runs OCR on an image and maps the recognized text onto product fields.
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
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/-.:, #*()@+&",
      tessedit_pageseg_mode: PSM.AUTO,
    });

    const { data } = await worker.recognize(preprocessed);
    const rawText = data.text || "";
    const overall = Math.round(data.confidence ?? 60);

    const baseConf = Math.min(99, Math.max(35, overall));
    const foundConf = Math.min(99, baseConf + 4);
    const fallbackConf = Math.max(60, baseConf - 10);

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
    const title = parseProductTitle(rawText);

    function field(value: string | null, confidence: number): OcrFieldResult | undefined {
      return value ? { value, confidence } : undefined;
    }

    return {
      rawText,
      overallConfidence: overall,
      fields: {
        productName: field(title.name || null, fallbackConf),
        brand: field(title.brand || null, fallbackConf),
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
