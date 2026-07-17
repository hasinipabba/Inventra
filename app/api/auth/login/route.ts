import { NextRequest, NextResponse } from "next/server";
import { findAuthUserByEmail, verifyPassword } from "@/lib/auth-store";
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  let user;
  try {
    user = await findAuthUserByEmail(email);
  } catch (err) {
    console.error("Login lookup failed:", err);
    return NextResponse.json({ error: "Server isn't able to reach the database right now. Check DATABASE_URL and try again." }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  if (!user.passwordHash || !user.salt) {
    return NextResponse.json({ error: "This account signs in with Google. Use \"Continue with Google\" instead." }, { status: 401 });
  }
  if (!verifyPassword(password, { passwordHash: user.passwordHash, salt: user.salt })) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = await signSession({ sub: user.id, email: user.email, name: user.name, role: user.role, image: user.image ?? undefined });

  const res = NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
