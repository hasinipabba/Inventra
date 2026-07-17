import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(d: string) {
  if (d === "—") return d;
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function timeAgo(d: string) {
  if (d === "—") return d;
  return formatDate(d);
}

/**
 * Downscales an image file to a JPEG data URL so task photos stay small
 * enough to store as JSON in Postgres (no blob storage configured for this
 * project). Long edge capped at maxDim, quality set for a good size/clarity
 * tradeoff for warehouse photos.
 */
export function fileToCompressedDataUrl(file: File, maxDim = 1280, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read file"));
    reader.onload = () => {
      img.onerror = () => reject(new Error("Couldn't decode image"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unavailable"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
