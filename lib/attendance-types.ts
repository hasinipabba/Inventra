// ---------------------------------------------------------------------------
// Types for the Attendance module. Kept in its own file (rather than folded
// into lib/types.ts) so the whole feature — types, db access, API routes,
// components — can be reviewed, changed, or removed as one independent unit.
// ---------------------------------------------------------------------------

/** Final computed status for a day's attendance record. */
export type AttendanceStatus = "present" | "absent" | "half-day" | "late";

/** Live UI state for the staff Clock In / Clock Out card. */
export type AttendanceDayState = "not-checked-in" | "checked-in" | "checked-out";

export interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  email: string;
  /** Calendar date this record belongs to, "YYYY-MM-DD" (Asia/Kolkata). */
  date: string;
  /** ISO timestamp of clock-in, or null if not yet clocked in. */
  checkInTime: string | null;
  /** ISO timestamp of clock-out, or null if not yet clocked out. */
  checkOutTime: string | null;
  /** Hours worked, computed automatically at clock-out (0 until then). */
  totalHours: number;
  attendanceStatus: AttendanceStatus;
  /** Minutes late relative to office start time (0 if on time). */
  lateMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSettings {
  /** Office start time as "HH:MM" in 24-hour format, e.g. "09:00". */
  officeStartTime: string;
}

export interface AttendanceAdminOverview {
  totalStaff: number;
  presentToday: number;
  absentToday: number;
  lateArrivals: number;
  checkedIn: number;
  checkedOut: number;
  date: string;
}

/** Error codes the API routes translate into user-facing messages + HTTP status. */
export type AttendanceErrorCode =
  | "ALREADY_CLOCKED_IN"
  | "ALREADY_CLOCKED_OUT"
  | "NOT_CLOCKED_IN"
  | "INVALID_TIME";

export class AttendanceError extends Error {
  code: AttendanceErrorCode;
  status: number;
  constructor(code: AttendanceErrorCode, message: string, status = 409) {
    super(message);
    this.name = "AttendanceError";
    this.code = code;
    this.status = status;
  }
}
