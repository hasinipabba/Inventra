import crypto from "crypto";
import { sql } from "./pg";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  // Null for accounts created via Google — there's no password to check.
  passwordHash: string | null;
  salt: string | null;
  role: "Admin" | "Store Staff";
  createdAt: string;
  // "credentials" for email/password accounts, "google" for Google sign-in.
  provider: "credentials" | "google";
  providerId: string | null;
  image: string | null;
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

export function createPasswordFields(password: string): { passwordHash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  return { passwordHash: hashPassword(password, salt), salt };
}

export function verifyPassword(password: string, user: { passwordHash: string; salt: string }): boolean {
  const candidate = hashPassword(password, user.salt);
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(user.passwordHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

let schemaReady: Promise<void> | null = null;
function ready(): Promise<void> {
  if (!schemaReady) {
    schemaReady = initSchema().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

async function initSchema() {
  await sql`CREATE TABLE IF NOT EXISTS auth_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL,
    "createdAt" TEXT NOT NULL
  )`;

  // Migration for Google sign-in support. Safe to run on every boot: DROP
  // NOT NULL / ADD COLUMN IF NOT EXISTS are no-ops once already applied.
  // Google-only accounts have no password, so those columns must allow NULL.
  await sql`ALTER TABLE auth_users ALTER COLUMN "passwordHash" DROP NOT NULL`;
  await sql`ALTER TABLE auth_users ALTER COLUMN salt DROP NOT NULL`;
  await sql`ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'credentials'`;
  await sql`ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS "providerId" TEXT`;
  await sql`ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS image TEXT`;

  // Seed a demo account so the login page works immediately without signing
  // up first. Change or remove this account before using this in production.
  const rows = (await sql`SELECT COUNT(*)::int AS count FROM auth_users`) as { count: number }[];
  if (rows[0].count === 0) {
    const demo = createPasswordFields("Admin@123");
    await sql`INSERT INTO auth_users (id, name, email, "passwordHash", salt, role, "createdAt", provider)
               VALUES (${"auth-demo-admin"}, ${"Ananya Sharma"}, ${"admin@inventra.example"}, ${demo.passwordHash}, ${demo.salt}, ${"Admin"}, ${new Date().toISOString()}, ${"credentials"})
               ON CONFLICT (id) DO NOTHING`;
  }
}

export async function findAuthUserByEmail(email: string): Promise<AuthUser | null> {
  await ready();
  const normalized = email.trim().toLowerCase();
  const rows = (await sql`SELECT * FROM auth_users WHERE LOWER(email) = ${normalized} LIMIT 1`) as AuthUser[];
  return rows[0] ?? null;
}

export async function findAuthUserById(id: string): Promise<AuthUser | null> {
  await ready();
  const rows = (await sql`SELECT * FROM auth_users WHERE id = ${id} LIMIT 1`) as AuthUser[];
  return rows[0] ?? null;
}

export async function createAuthUser(input: { name: string; email: string; password: string; role: "Admin" | "Store Staff" }): Promise<AuthUser> {
  await ready();
  const { passwordHash, salt } = createPasswordFields(input.password);
  const user: AuthUser = {
    id: `auth-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    passwordHash,
    salt,
    role: input.role,
    createdAt: new Date().toISOString(),
    provider: "credentials",
    providerId: null,
    image: null,
  };
  await sql`INSERT INTO auth_users (id, name, email, "passwordHash", salt, role, "createdAt")
             VALUES (${user.id}, ${user.name}, ${user.email}, ${user.passwordHash}, ${user.salt}, ${user.role}, ${user.createdAt})`;
  return user;
}

/**
 * Login-or-signup for Google. If the email already has an account (whether
 * it originally signed up with a password or with Google), we log into that
 * same account and just refresh its Google linkage — role is left untouched.
 * If it's a brand-new email, we create a fresh account with the default
 * "Store Staff" role, same as the signup route's default.
 */
export async function findOrCreateGoogleUser(profile: { email: string; name: string; sub: string; picture?: string }): Promise<AuthUser> {
  await ready();
  const normalized = profile.email.trim().toLowerCase();
  const image = profile.picture ?? null;

  const existing = (await sql`SELECT * FROM auth_users WHERE LOWER(email) = ${normalized} LIMIT 1`) as AuthUser[];
  if (existing[0]) {
    const updated = (await sql`
      UPDATE auth_users
      SET provider = 'google', "providerId" = ${profile.sub}, image = ${image}
      WHERE id = ${existing[0].id}
      RETURNING *
    `) as AuthUser[];
    return updated[0];
  }

  const user: AuthUser = {
    id: `auth-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: profile.name?.trim() || normalized.split("@")[0],
    email: normalized,
    passwordHash: null,
    salt: null,
    role: "Store Staff",
    createdAt: new Date().toISOString(),
    provider: "google",
    providerId: profile.sub,
    image,
  };
  await sql`
    INSERT INTO auth_users (id, name, email, "passwordHash", salt, role, "createdAt", provider, "providerId", image)
    VALUES (${user.id}, ${user.name}, ${user.email}, ${null}, ${null}, ${user.role}, ${user.createdAt}, 'google', ${user.providerId}, ${user.image})
  `;
  return user;
}
