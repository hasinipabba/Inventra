/**
 * Lightweight image preprocessing shared by the upload-scan, OCR, and
 * live-camera paths: grayscale + contrast boost + binarization + unsharp
 * mask style edge sharpening. This is standard pre-processing for
 * barcode/OCR decoding — it increases the contrast between bars/text and
 * background, which is what decoders actually key off of, especially on
 * blurry phone photos or low-quality webcam frames.
 */

/**
 * Bradley/Roth adaptive thresholding via an integral image (summed-area
 * table): each pixel is compared against the *local* mean brightness in a
 * window around it, rather than one global cutoff for the whole image.
 *
 * This is the actual fix for uneven/low-light photos: a single global
 * threshold (Otsu) picks one brightness cutoff for the entire frame, so a
 * shadow or glare across part of a barcode/date code gets crushed to solid
 * black or blown out to solid white — destroying exactly the region the
 * decoder needs. A local threshold adapts per-region, so it survives uneven
 * lighting across the frame.
 */
export function adaptiveThresholdMask(gray: Uint8ClampedArray, width: number, height: number, t = 0.15): Uint8Array {
  const windowSize = Math.max(15, Math.floor(Math.min(width, height) / 8));
  const half = Math.floor(windowSize / 2);

  // Integral image (1-indexed, so row/col 0 is an implicit zero border).
  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    const rowOff = (y + 1) * (width + 1);
    const prevRowOff = y * (width + 1);
    for (let x = 0; x < width; x++) {
      rowSum += gray[y * width + x];
      integral[rowOff + x + 1] = integral[prevRowOff + x + 1] + rowSum;
    }
  }

  function areaSum(x1: number, y1: number, x2: number, y2: number): number {
    const a = integral[y1 * (width + 1) + x1];
    const b = integral[y1 * (width + 1) + (x2 + 1)];
    const c = integral[(y2 + 1) * (width + 1) + x1];
    const d = integral[(y2 + 1) * (width + 1) + (x2 + 1)];
    return d - b - c + a;
  }

  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const y1 = Math.max(0, y - half);
    const y2 = Math.min(height - 1, y + half);
    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - half);
      const x2 = Math.min(width - 1, x + half);
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      const mean = areaSum(x1, y1, x2, y2) / count;
      const idx = y * width + x;
      mask[idx] = gray[idx] > mean * (1 - t) ? 255 : 0;
    }
  }
  return mask;
}

function grayscaleAndContrast(data: Uint8ClampedArray, contrast: number) {
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    let v = (gray - 128) * contrast + 128;
    v = Math.max(0, Math.min(255, v));
    data[i] = data[i + 1] = data[i + 2] = v;
  }
}

/** Simple 3x3 unsharp mask: sharpened = original + amount * (original - blurred). */
function unsharpMask(ctx: CanvasRenderingContext2D, width: number, height: number, amount = 0.6) {
  const src = ctx.getImageData(0, 0, width, height);
  const out = ctx.createImageData(width, height);
  const s = src.data;
  const o = out.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        o[i] = o[i + 1] = o[i + 2] = s[i];
        o[i + 3] = 255;
        continue;
      }
      // 3x3 box blur on the (already grayscaled) red channel.
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          sum += s[((y + dy) * width + (x + dx)) * 4];
        }
      }
      const blurred = sum / 9;
      const original = s[i];
      let sharpened = original + amount * (original - blurred);
      sharpened = Math.max(0, Math.min(255, sharpened));
      o[i] = o[i + 1] = o[i + 2] = sharpened;
      o[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

/**
 * Full-quality sharpen for a static uploaded/captured image: grayscale +
 * contrast + unsharp mask + upscale, with an optional binarization pass
 * (recommended for barcodes; usually skipped for general OCR photos where
 * some grayscale nuance still helps tesseract).
 */
export function sharpenImageToCanvas(
  img: HTMLImageElement | HTMLCanvasElement,
  opts: { upscale?: number; binarizeOutput?: boolean } = {}
): HTMLCanvasElement {
  const { upscale = 2, binarizeOutput = true } = opts;
  const srcW = "naturalWidth" in img ? img.naturalWidth : img.width;
  const srcH = "naturalHeight" in img ? img.naturalHeight : img.height;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(srcW * upscale);
  canvas.height = Math.round(srcH * upscale);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  grayscaleAndContrast(imageData.data, 1.5);
  ctx.putImageData(imageData, 0, 0);
  unsharpMask(ctx, canvas.width, canvas.height, 0.7);

  if (binarizeOutput) {
    const sharpened = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = sharpened.data;
    const gray = new Uint8ClampedArray(canvas.width * canvas.height);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) gray[p] = d[i];
    const mask = adaptiveThresholdMask(gray, canvas.width, canvas.height);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) d[i] = d[i + 1] = d[i + 2] = mask[p];
    ctx.putImageData(sharpened, 0, 0);
  }
  return canvas;
}

export interface FrameRoi {
  /** 0-1 fractions of the video frame, matching the visible guide-box overlay. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Cheaper, real-time-safe sharpen for live camera frames: crops to the
 * given region of interest (so decoding only ever looks at what's actually
 * inside the on-screen guide box — not the whole scene, which is mostly
 * hands/face/background clutter), upscales that crop for more effective
 * resolution, then grayscale + contrast + binarize. No unsharp mask here —
 * too slow to run every frame at camera resolution.
 */
export function sharpenVideoFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement, roi?: FrameRoi): HTMLCanvasElement {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const region = roi ?? { x: 0, y: 0, w: 1, h: 1 };
  const sx = region.x * vw;
  const sy = region.y * vh;
  const sw = region.w * vw;
  const sh = region.h * vh;

  // Upscale the cropped region back up so a small on-screen box still gives
  // the decoder plenty of pixels to work with.
  const scale = roi ? Math.min(2, 1280 / Math.max(sw, 1)) : 1;
  const outW = Math.round(sw * scale);
  const outH = Math.round(sh * scale);
  if (canvas.width !== outW) canvas.width = outW;
  if (canvas.height !== outH) canvas.height = outH;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);
  const imageData = ctx.getImageData(0, 0, outW, outH);
  grayscaleAndContrast(imageData.data, 1.4);
  const d = imageData.data;
  const gray = new Uint8ClampedArray(outW * outH);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) gray[p] = d[i];
  const mask = adaptiveThresholdMask(gray, outW, outH);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) d[i] = d[i + 1] = d[i + 2] = mask[p];
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function loadImageElement(file: File | Blob): Promise<HTMLImageElement> {
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
