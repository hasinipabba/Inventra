/**
 * Notification Emails
 * ----------------------------------------------------------------------------
 * One reusable function per inventory automation event. Each function only
 * formats a subject/body and delegates to `sendEmail` (lib/email/mailer.ts)
 * — no business/decision logic lives here. Callers (the existing checker
 * loops) decide *when* a finding is real and not a duplicate; these
 * functions only decide *how it looks* as an email.
 *
 * All functions return whatever `sendEmail` returns
 * (`{ success: boolean; error?: string }`) and never throw, so calling code
 * in the automation modules can await them without its own try/catch and
 * without any risk of an email failure interrupting the run.
 */

import { sendEmail, type SendEmailResult } from "@/lib/email/mailer";

/** Shared HTML wrapper so every email has consistent, readable formatting. */
function renderEmailHtml(title: string, rows: [label: string, value: string][]): string {
  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#555;">${label}</td><td style="padding:4px 0;font-weight:600;">${value}</td></tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#111;">
      <h2 style="margin:0 0 12px;">${title}</h2>
      <table cellspacing="0" cellpadding="0">${rowsHtml}</table>
    </div>
  `.trim();
}

/** Shared plain-text fallback, matching the same field order as the HTML version. */
function renderEmailText(title: string, rows: [label: string, value: string][]): string {
  const lines = rows.map(([label, value]) => `${label}: ${value}`);
  return [title, "", ...lines].join("\n");
}

export interface ExpiredEmailInput {
  productName: string;
  batchId: string;
  expiryDate: string;
  daysExpired: number;
}

/**
 * Sends the "Expired Product Alert" email for a batch whose expiry date has
 * already passed. Called from `runExpiryChecker()` right after it creates
 * the corresponding in-app notification for an "expired" finding.
 */
export async function sendExpiredEmail(input: ExpiredEmailInput): Promise<SendEmailResult> {
  const title = "🚨 Expired Product Alert";
  const rows: [string, string][] = [
    ["Product Name", input.productName],
    ["Batch ID", input.batchId],
    ["Expiry Date", input.expiryDate],
    ["Days Expired", String(input.daysExpired)],
  ];

  return sendEmail({
    subject: title,
    html: renderEmailHtml(title, rows),
    text: renderEmailText(title, rows),
  });
}

export interface ExpiringSoonEmailInput {
  productName: string;
  batchId: string;
  expiryDate: string;
  daysRemaining: number;
}

/**
 * Sends the "Expiring Soon" email for a batch within the expiry warning
 * window. Called from `runExpiryChecker()` right after it creates the
 * corresponding in-app notification for an "expiring-soon" finding.
 */
export async function sendExpiringSoonEmail(input: ExpiringSoonEmailInput): Promise<SendEmailResult> {
  const title = "⚠ Expiring Soon";
  const rows: [string, string][] = [
    ["Product Name", input.productName],
    ["Batch ID", input.batchId],
    ["Expiry Date", input.expiryDate],
    ["Days Remaining", String(input.daysRemaining)],
  ];

  return sendEmail({
    subject: title,
    html: renderEmailHtml(title, rows),
    text: renderEmailText(title, rows),
  });
}

export interface LowStockEmailInput {
  productName: string;
  currentStock: number;
  minimumStock: number;
}

/**
 * Sends the "Low Stock Alert" email. Called from `runLowStockChecker()`
 * right after it creates the corresponding in-app notification for a
 * "low-stock" finding.
 */
export async function sendLowStockEmail(input: LowStockEmailInput): Promise<SendEmailResult> {
  const title = "📦 Low Stock Alert";
  const rows: [string, string][] = [
    ["Product Name", input.productName],
    ["Current Stock", String(input.currentStock)],
    ["Minimum Stock", String(input.minimumStock)],
  ];

  return sendEmail({
    subject: title,
    html: renderEmailHtml(title, rows),
    text: renderEmailText(title, rows),
  });
}

export interface OutOfStockEmailInput {
  productName: string;
  warehouse: string;
}

/**
 * Sends the "Out Of Stock" email. Called from `runLowStockChecker()` right
 * after it creates the corresponding in-app notification for an
 * "out-of-stock" finding.
 */
export async function sendOutOfStockEmail(input: OutOfStockEmailInput): Promise<SendEmailResult> {
  const title = "❌ Out Of Stock";
  const rows: [string, string][] = [
    ["Product Name", input.productName],
    ["Warehouse", input.warehouse],
  ];

  return sendEmail({
    subject: title,
    html: renderEmailHtml(title, rows),
    text: renderEmailText(title, rows),
  });
}

export interface PurchaseRequestEmailInput {
  productName: string;
  recommendedQuantity: number;
  warehouse: string;
}

/**
 * Sends the "Purchase Request Created" email. Called from
 * `runPurchaseRequestAutomation()` right after it creates the corresponding
 * in-app notification for a newly auto-generated purchase request.
 */
export async function sendPurchaseRequestEmail(input: PurchaseRequestEmailInput): Promise<SendEmailResult> {
  const title = "🛒 Purchase Request Created";
  const rows: [string, string][] = [
    ["Product Name", input.productName],
    ["Recommended Quantity", String(input.recommendedQuantity)],
    ["Warehouse", input.warehouse],
  ];

  return sendEmail({
    subject: title,
    html: renderEmailHtml(title, rows),
    text: renderEmailText(title, rows),
  });
}