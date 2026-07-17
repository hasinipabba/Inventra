import { NextRequest, NextResponse } from "next/server";
import { createAuthUser, findAuthUserByEmail } from "@/lib/auth-store";
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role = body?.role === "Admin" ? "Admin" : "Store Staff";

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  try {
    if (await findAuthUserByEmail(email)) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const user = await createAuthUser({ name, email, password, role });
    const token = await signSession({ sub: user.id, email: user.email, name: user.name, role: user.role });

    const res = NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (err) {
    console.error("Signup failed:", err);
    return NextResponse.json({ error: "Server isn't able to reach the database right now. Check DATABASE_URL and try again." }, { status: 500 });
  }
}
