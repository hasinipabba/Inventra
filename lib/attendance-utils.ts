// ---------------------------------------------------------------------------
// Date/time helpers for the Attendance module, isolated in their own file.
//
// The app (and its staff) run on Indian time regardless of which timezone the
// Node/serverless process itself happens to be in, so every "what calendar
// day is this" and "what time of day is this" question is answered in
// Asia/Kolkata explicitly, rather than relying on the server's local TZ.
// ---------------------------------------------------------------------------

const TZ = "Asia/Kolkata";

/** Today's date as "YYYY-MM-DD" in Asia/Kolkata. */
export function todayDateString(): string {
  return dateStringOf(new Date());
}

/** A given instant's calendar date as "YYYY-MM-DD" in Asia/Kolkata. */
export function dateStringOf(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

/** Minutes since midnight (Asia/Kolkata) for a given instant. */
function minutesSinceMidnight(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(instant);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

function timeStringToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((v) => Number(v));
  return (h || 0) * 60 + (m || 0);
}

/** Minutes a clock-in falls after the configured office start time (0 if on time or early). */
export function computeLateMinutes(checkInIso: string, officeStartTime: string): number {
  const checkInMinutes = minutesSinceMidnight(new Date(checkInIso));
  const startMinutes = timeStringToMinutes(officeStartTime);
  return Math.max(0, checkInMinutes - startMinutes);
}

/** Hours worked between two ISO timestamps, rounded to 2 decimal places (never negative). */
export function computeTotalHours(checkInIso: string, checkOutIso: string): number {
  const ms = new Date(checkOutIso).getTime() - new Date(checkInIso).getTime();
  const hours = Math.max(0, ms / 3_600_000);
  return Math.round(hours * 100) / 100;
}

/** Formats an ISO timestamp as a HH:MM AM/PM clock time in Asia/Kolkata, or a placeholder. */
export function formatTimeIST(iso: string | null | undefined, placeholder = "—"): string {
  if (!iso) return placeholder;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return placeholder;
  return d.toLocaleTimeString("en-IN", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: true });
}

/** Start (inclusive) date string for "this week" (Mon–Sun) containing today, Asia/Kolkata. */
export function startOfWeekString(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const weekdayIdx = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(map.weekday);
  const asUtc = new Date(Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day)));
  asUtc.setUTCDate(asUtc.getUTCDate() - (weekdayIdx < 0 ? 0 : weekdayIdx));
  return asUtc.toISOString().slice(0, 10);
}

/** First day of the current month, "YYYY-MM-DD", Asia/Kolkata. */
export function startOfMonthString(): string {
  const today = todayDateString();
  return `${today.slice(0, 7)}-01`;
}

/** Yesterday's date as "YYYY-MM-DD", Asia/Kolkata. */
export function yesterdayDateString(): string {
  const today = todayDateString();
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
