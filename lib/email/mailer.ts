/**
 * Mailer (transport layer)
 * ----------------------------------------------------------------------------
 * Thin, reusable wrapper around Nodemailer. Contains no domain knowledge
 * (no product/batch/purchase-request logic) — that lives in
 * `lib/email/notificationEmails.ts`. This file only knows how to create,
 * cache, verify, and send through a single SMTP transporter.
 *
 * Design notes:
 * - The transporter is created once and cached in module scope (`cachedTransporter`),
 *   not recreated per email — Nodemailer transporters are designed to be
 *   reused, and recreating one per send would waste a new connection/pool
 *   setup every time.
 * - All SMTP configuration comes from environment variables. No credentials
 *   or addresses are hardcoded anywhere in this file.
 * - `sendEmail` NEVER throws. Every failure (missing config, connection
 *   error, auth failure, etc.) is caught, logged, and returned as
 *   `{ success: false, error }` instead. This is what guarantees email
 *   sending can never interrupt the automation workflows that call it —
 *   callers can simply `await sendEmail(...)` with no try/catch of their own.
 */

import nodemailer, {type Transporter } from "nodemailer";

let cachedTransporter: Transporter | null = null;

/**
 * Reads and validates the SMTP environment variables required to create a
 * transporter. Returns `null` (rather than throwing) if configuration is
 * incomplete, so callers can log a clear message and skip sending instead
 * of crashing.
 */
function readSmtpConfig(): { host: string; port: number; user: string; pass: string } | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) return null;

  const parsedPort = Number(port);
  if (!Number.isFinite(parsedPort)) return null;

  return { host, port: parsedPort, user, pass };
}

/**
 * Returns the shared Nodemailer transporter, creating it once on first use
 * and caching it for every subsequent call (a single transporter instance
 * is reused, never recreated per email). Returns `null` if SMTP
 * configuration is missing/invalid — callers treat this as "email disabled."
 */
function getTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  const config = readSmtpConfig();
  if (!config) {
    console.warn("[mailer] SMTP configuration is incomplete (SMTP_HOST/PORT/USER/PASS) — email sending is disabled.");
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465, // true for port 465 (implicit TLS), false for 587/others (STARTTLS)
    auth: { user: config.user, pass: config.pass },
  });

  return cachedTransporter;
}

/**
 * Verifies the shared transporter can actually connect and authenticate
 * with the configured SMTP server. Never throws — returns `false` and logs
 * on any failure (missing config, network error, bad credentials, etc.).
 * Not required to succeed for the app or automation to keep running; useful
 * for diagnostics (e.g. calling it once at startup or from a health check).
 */
export async function verifyTransporter(): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;

  try {
    await transporter.verify();
    console.log("[mailer] SMTP transporter verified successfully.");
    return true;
  } catch (err) {
    console.error("[mailer] SMTP transporter verification failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

export interface SendEmailInput {
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Sends a single email using the shared transporter, to the recipient(s)
 * configured in `EMAIL_TO`, from the address configured in `EMAIL_FROM`.
 *
 * Never throws. Every failure mode (SMTP not configured, connection error,
 * send rejected, etc.) is caught and logged, returning
 * `{ success: false, error }` instead — so automation code can call this
 * and continue processing regardless of outcome.
 */
export async function sendEmail({ subject, html, text }: SendEmailInput): Promise<SendEmailResult> {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      const error = "Email not sent: SMTP is not configured.";
      console.warn(`[mailer] ${error}`);
      return { success: false, error };
    }

    const from = process.env.EMAIL_FROM;
    const to = process.env.EMAIL_TO;
    if (!from || !to) {
      const error = "Email not sent: EMAIL_FROM or EMAIL_TO is not configured.";
      console.warn(`[mailer] ${error}`);
      return { success: false, error };
    }

    await transporter.sendMail({ from, to, subject, html, text });
    console.log(`[mailer] Email sent: "${subject}" -> ${to}`);
    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[mailer] Failed to send email "${subject}":`, error);
    return { success: false, error };
  }
}