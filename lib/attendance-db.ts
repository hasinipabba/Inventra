import { sql } from "./pg";
import { listStaff } from "./db";
import type { AttendanceRecord, AttendanceSettings, AttendanceAdminOverview } from "./attendance-types";
import { AttendanceError } from "./attendance-types";
import { computeLateMinutes, computeTotalHours, todayDateString } from "./attendance-utils";

// ---------------------------------------------------------------------------
// Schema + access for the Attendance module. Deliberately its own file with
// its own lazily-initialized, cached `ready()` — independent of lib/db.ts's
// schema setup — so this module can be reasoned about (and, if needed,
// dropped) entirely on its own.
//
// The (staffId, date) UNIQUE constraint is declared directly inside the
// CREATE TABLE statement below rather than being bolted on afterwards with a
// separate ALTER TABLE. That matters: an ON CONFLICT clause only works if a
// matching unique/exclusion constraint actually exists on the table it's
// run against, and a table created before such a constraint was added would
// silently lack it forever, turning every conflicting insert into a hard
// 42P10 error instead of the "already clocked in" business error it should
// be. Defining it inline means any environment creating this table for the
// first time gets the constraint atomically with the table itself.
// ---------------------------------------------------------------------------

let schemaReady: Promise<void> | null = null;
function ready(): Promise<void> {
  if (!schemaReady) {
    schemaReady = initSchema().catch((err) => {
      schemaReady = null; // allow retry on next call instead of caching a permanent failure
      throw err;
    });
  }
  return schemaReady;
}

async function initSchema() {
  await sql`CREATE TABLE IF NOT EXISTS attendance_records (
    id TEXT PRIMARY KEY,
    "staffId" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    email TEXT,
    date TEXT NOT NULL,
    "checkInTime" TEXT,
    "checkOutTime" TEXT,
    "totalHours" NUMERIC DEFAULT 0,
    "attendanceStatus" TEXT DEFAULT 'present',
    "lateMinutes" INT DEFAULT 0,
    "createdAt" TEXT,
    "updatedAt" TEXT,
    UNIQUE ("staffId", date)
  )`;

  await sql`CREATE TABLE IF NOT EXISTS attendance_settings (
    id INT PRIMARY KEY DEFAULT 1,
    "officeStartTime" TEXT DEFAULT '09:00'
  )`;

  await sql`INSERT INTO attendance_settings (id, "officeStartTime")
             VALUES (1, '09:00')
             ON CONFLICT (id) DO NOTHING`;

  // Helpful for the admin dashboard's date-range / "this month" filters and
  // for keeping each staff member's own history lookups fast.
  await sql`CREATE INDEX IF NOT EXISTS attendance_records_date_idx ON attendance_records (date)`;
  await sql`CREATE INDEX IF NOT EXISTS attendance_records_staff_idx ON attendance_records ("staffId")`;
}

function normalize(row: any): AttendanceRecord {
  return {
    id: row.id,
    staffId: row.staffId,
    staffName: row.staffName,
    email: row.email ?? "",
    date: row.date,
    checkInTime: row.checkInTime ?? null,
    checkOutTime: row.checkOutTime ?? null,
    totalHours: Number(row.totalHours) || 0,
    attendanceStatus: row.attendanceStatus,
    lateMinutes: Number(row.lateMinutes) || 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ---------- Settings ----------
export async function getAttendanceSettings(): Promise<AttendanceSettings> {
  await ready();
  const rows = (await sql`SELECT * FROM attendance_settings WHERE id = 1`) as any[];
  return { officeStartTime: rows[0]?.officeStartTime ?? "09:00" };
}

export async function setAttendanceSettings(settings: AttendanceSettings): Promise<AttendanceSettings> {
  await ready();
  await sql`INSERT INTO attendance_settings (id, "officeStartTime")
             VALUES (1, ${settings.officeStartTime})
             ON CONFLICT (id) DO UPDATE SET "officeStartTime" = EXCLUDED."officeStartTime"`;
  return settings;
}

// ---------- Reads ----------
export async function getTodayForStaff(staffId: string, date: string): Promise<AttendanceRecord | null> {
  await ready();
  const rows = (await sql`SELECT * FROM attendance_records WHERE "staffId" = ${staffId} AND date = ${date} LIMIT 1`) as any[];
  return rows[0] ? normalize(rows[0]) : null;
}

export interface AttendanceHistoryFilter {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  month?: string; // YYYY-MM
}

export async function listAttendanceForStaff(staffId: string, filter: AttendanceHistoryFilter = {}): Promise<AttendanceRecord[]> {
  await ready();
  let rows: any[];
  if (filter.from && filter.to) {
    rows = (await sql`SELECT * FROM attendance_records WHERE "staffId" = ${staffId} AND date BETWEEN ${filter.from} AND ${filter.to} ORDER BY date DESC`) as any[];
  } else if (filter.month) {
    rows = (await sql`SELECT * FROM attendance_records WHERE "staffId" = ${staffId} AND date LIKE ${filter.month + "%"} ORDER BY date DESC`) as any[];
  } else {
    rows = (await sql`SELECT * FROM attendance_records WHERE "staffId" = ${staffId} ORDER BY date DESC LIMIT 120`) as any[];
  }
  return rows.map(normalize);
}

export interface AttendanceAdminFilter {
  from?: string;
  to?: string;
  search?: string; // matches staff name or email
}

export async function listAttendanceAdmin(filter: AttendanceAdminFilter = {}): Promise<AttendanceRecord[]> {
  await ready();
  let rows: any[];
  if (filter.from && filter.to) {
    rows = (await sql`SELECT * FROM attendance_records WHERE date BETWEEN ${filter.from} AND ${filter.to} ORDER BY date DESC, "staffName" ASC`) as any[];
  } else {
    rows = (await sql`SELECT * FROM attendance_records ORDER BY date DESC, "staffName" ASC LIMIT 1000`) as any[];
  }
  let records = rows.map(normalize);
  if (filter.search && filter.search.trim()) {
    const q = filter.search.trim().toLowerCase();
    records = records.filter((r) => r.staffName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  }
  return records;
}

export async function getAdminOverview(date: string = todayDateString()): Promise<AttendanceAdminOverview> {
  await ready();
  const [staffList, todayRows] = await Promise.all([listStaff(), sql`SELECT * FROM attendance_records WHERE date = ${date}`]);
  const records = (todayRows as any[]).map(normalize);
  const totalStaff = staffList.length;
  const presentToday = records.length;
  const absentToday = Math.max(0, totalStaff - presentToday);
  const lateArrivals = records.filter((r) => r.lateMinutes > 0).length;
  const checkedIn = records.filter((r) => r.checkInTime && !r.checkOutTime).length;
  const checkedOut = records.filter((r) => r.checkOutTime).length;
  return { totalStaff, presentToday, absentToday, lateArrivals, checkedIn, checkedOut, date };
}

// ---------- Writes ----------
export interface StaffIdentity {
  id: string;
  name: string;
  email: string;
}

/**
 * Clocks a staff member in for `date`. Relies on the (staffId, date) UNIQUE
 * constraint: if a row already exists for today, the INSERT is a no-op (0
 * rows returned) and we surface that as a friendly "already clocked in"
 * error rather than a raw DB error.
 */
export async function clockIn(staff: StaffIdentity, date: string, nowIso: string): Promise<AttendanceRecord> {
  await ready();
  const settings = await getAttendanceSettings();
  const lateMinutes = computeLateMinutes(nowIso, settings.officeStartTime);
  const status = lateMinutes > 0 ? "late" : "present";
  const id = `att-${staff.id}-${date}`;

  const rows = (await sql`
    INSERT INTO attendance_records (id, "staffId", "staffName", email, date, "checkInTime", "checkOutTime", "totalHours", "attendanceStatus", "lateMinutes", "createdAt", "updatedAt")
    VALUES (${id}, ${staff.id}, ${staff.name}, ${staff.email}, ${date}, ${nowIso}, NULL, 0, ${status}, ${lateMinutes}, ${nowIso}, ${nowIso})
    ON CONFLICT ("staffId", date) DO NOTHING
    RETURNING *
  `) as any[];

  if (rows.length === 0) {
    throw new AttendanceError("ALREADY_CLOCKED_IN", "You've already clocked in today.");
  }
  return normalize(rows[0]);
}

/**
 * Clocks a staff member out for `date`. Computes total hours and the final
 * attendance status automatically — callers never pass these in.
 */
export async function clockOut(staffId: string, date: string, nowIso: string): Promise<AttendanceRecord> {
  await ready();
  const existing = await getTodayForStaff(staffId, date);
  if (!existing || !existing.checkInTime) {
    throw new AttendanceError("NOT_CLOCKED_IN", "You need to clock in before you can clock out.");
  }
  if (existing.checkOutTime) {
    throw new AttendanceError("ALREADY_CLOCKED_OUT", "You've already clocked out today.");
  }
  if (new Date(nowIso).getTime() <= new Date(existing.checkInTime).getTime()) {
    throw new AttendanceError("INVALID_TIME", "Clock-out time can't be before clock-in time.", 400);
  }

  const totalHours = computeTotalHours(existing.checkInTime, nowIso);
  const hoursStatus = totalHours < 4 ? "half-day" : "present";
  const finalStatus = existing.lateMinutes > 0 ? "late" : hoursStatus;

  const rows = (await sql`
    UPDATE attendance_records
    SET "checkOutTime" = ${nowIso}, "totalHours" = ${totalHours}, "attendanceStatus" = ${finalStatus}, "updatedAt" = ${nowIso}
    WHERE id = ${existing.id}
    RETURNING *
  `) as any[];
  return normalize(rows[0]);
}
