import type { ProductStatus } from "./types";

/**
 * Product Health & Expiry Evaluator
 * ----------------------------------------------------------------------------
 * Centralized, deterministic calculator for product status and healthScore.
 * Eliminates inconsistent or hardcoded initial statuses ("healthy", 80/100)
 * across the application pipeline.
 *
 * Evaluation Hierarchy (highest to lowest priority):
 * 1. Expired (expiryDate < today)           -> status: "expired",  healthScore: 0
 * 2. Out of stock (stock <= 0)              -> status: "out",      healthScore: 0
 * 3. Expiring soon (0 <= days <= 30)        -> status: "expiring", healthScore: 15..55
 * 4. Low stock (0 < stock <= minStock)      -> status: "low",      healthScore: 30..65
 * 5. Healthy stock (stock > minStock)       -> status: "healthy",  healthScore: 80..100
 */

export interface ProductHealthResult {
  status: ProductStatus;
  healthScore: number;
  daysUntilExpiry: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
  reason: string;
}

export interface ProductHealthInput {
  stock?: number | null;
  minStock?: number | null;
  expiryDate?: string | null;
}

/**
 * Parses date string in multiple common formats:
 * - YYYY-MM-DD or YYYY/MM/DD
 * - DD-MM-YYYY or DD/MM/YYYY
 * - YYYY-MM or MM-YYYY (assumes end of month)
 * - Standard ISO/JS parseable strings
 *
 * Returns year, month (0-indexed), and day without UTC/local timezone shifts.
 */
export function parseDateParts(dateStr: string | null | undefined): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // YYYY-MM-DD or YYYY/MM/DD
  const mIso = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (mIso) {
    const year = parseInt(mIso[1], 10);
    const month = parseInt(mIso[2], 10) - 1;
    const day = parseInt(mIso[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const mDmy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (mDmy) {
    const day = parseInt(mDmy[1], 10);
    const month = parseInt(mDmy[2], 10) - 1;
    const year = parseInt(mDmy[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }

  // YYYY-MM (treat as expiring on the last day of the month)
  const mYm = trimmed.match(/^(\d{4})[-/](\d{1,2})$/);
  if (mYm) {
    const year = parseInt(mYm[1], 10);
    const month = parseInt(mYm[2], 10) - 1;
    if (month >= 0 && month <= 11) {
      const lastDay = new Date(year, month + 1, 0).getDate();
      return { year, month, day: lastDay };
    }
  }

  // MM-YYYY (treat as expiring on the last day of the month)
  const mMmy = trimmed.match(/^(\d{1,2})[-/](\d{4})$/);
  if (mMmy) {
    const month = parseInt(mMmy[1], 10) - 1;
    const year = parseInt(mMmy[2], 10);
    if (month >= 0 && month <= 11) {
      const lastDay = new Date(year, month + 1, 0).getDate();
      return { year, month, day: lastDay };
    }
  }

  // Fallback to JS Date parser
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth(),
    day: parsed.getDate(),
  };
}

/**
 * Calculates whole days until expiry relative to `now`.
 * Negative values mean the date has already passed (expired).
 * 0 means expires today.
 * Positive values mean days remaining.
 */
export function getDaysUntilExpiry(expiryDateStr: string | null | undefined, now: Date = new Date()): number | null {
  const parts = parseDateParts(expiryDateStr);
  if (!parts) return null;

  const expiry = new Date(parts.year, parts.month, parts.day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((expiry.getTime() - today.getTime()) / msPerDay);
}

/**
 * Comprehensive calculator for product status and health score.
 */
export function calculateProductHealth(
  input: ProductHealthInput,
  now: Date = new Date()
): ProductHealthResult {
  const stock = Number.isFinite(Number(input.stock)) ? Number(input.stock) : 0;
  const minStock = Number.isFinite(Number(input.minStock)) ? Number(input.minStock) : 0;
  const daysUntilExpiry = getDaysUntilExpiry(input.expiryDate, now);

  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;

  // 1. Expired has absolute top priority — expired food/medicine cannot be used
  if (isExpired) {
    const overdue = Math.abs(daysUntilExpiry!);
    return {
      status: "expired",
      healthScore: 0,
      daysUntilExpiry,
      isExpired: true,
      isExpiringSoon: false,
      reason: `Expired ${overdue} day${overdue === 1 ? "" : "s"} ago (${input.expiryDate})`,
    };
  }

  // 2. Out of stock (when not expired)
  if (stock <= 0) {
    return {
      status: "out",
      healthScore: 0,
      daysUntilExpiry,
      isExpired: false,
      isExpiringSoon,
      reason: "Out of stock",
    };
  }

  // 3. Expiring soon (within 30 days)
  if (isExpiringSoon) {
    // Health score degrades from 55 down to 15 as it approaches expiry
    const score = Math.max(15, Math.min(55, Math.round(15 + (daysUntilExpiry! / 30) * 40)));
    return {
      status: "expiring",
      healthScore: score,
      daysUntilExpiry,
      isExpired: false,
      isExpiringSoon: true,
      reason: `Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"} (${input.expiryDate})`,
    };
  }

  // 4. Low stock (stock > 0 and stock <= minStock)
  if (stock <= minStock) {
    const effectiveMin = Math.max(1, minStock);
    const ratio = Math.max(0, Math.min(1, stock / effectiveMin));
    const score = Math.max(30, Math.min(65, Math.round(30 + ratio * 35)));
    return {
      status: "low",
      healthScore: score,
      daysUntilExpiry,
      isExpired: false,
      isExpiringSoon: false,
      reason: `Low stock: ${stock}/${minStock} units`,
    };
  }

  // 5. Healthy (stock > minStock and shelf-life is fine)
  const effectiveMin = Math.max(1, minStock);
  const surplus = Math.max(0, stock - effectiveMin);
  const bonus = Math.min(20, Math.round((surplus / effectiveMin) * 20));
  const score = Math.min(100, Math.max(80, 80 + bonus));

  return {
    status: "healthy",
    healthScore: score,
    daysUntilExpiry,
    isExpired: false,
    isExpiringSoon: false,
    reason: `Healthy stock: ${stock} units`,
  };
}

/**
 * Returns a shallow copy of the product object with dynamically recalculated
 * `status` and `healthScore`.
 */
export function applyProductHealth<T extends ProductHealthInput & Record<string, any>>(
  item: T,
  now: Date = new Date()
): T & { status: ProductStatus; healthScore: number } {
  const result = calculateProductHealth(item, now);
  return {
    ...item,
    status: result.status,
    healthScore: result.healthScore,
  };
}
