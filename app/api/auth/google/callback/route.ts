import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode, getGoogleRedirectUri } from "@/lib/google-oauth";
import { findOrCreateGoogleUser } from "@/lib/auth-store";
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/session";

const STATE_COOKIE = "google_oauth_state";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const loginUrl = new URL("/login", req.url);

  // Google appends ?error=access_denied (etc.) when the user cancels on the
  // consent screen instead of approving.
  const googleError = searchParams.get("error");
  if (googleError) {
    loginUrl.searchParams.set("error", "google_cancelled");
    return NextResponse.redirect(loginUrl);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = req.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    loginUrl.searchParams.set("error", "google_invalid_state");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const redirectUri = getGoogleRedirectUri(req.nextUrl.origin);
    const profile = await exchangeGoogleCode(code, redirectUri);
    const user = await findOrCreateGoogleUser({
      email: profile.email,
      name: profile.name,
      sub: profile.sub,
      picture: profile.picture,
    });

    const token = await signSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image ?? undefined,
    });

    // Land on "/", which reads the fresh session cookie set just below and
    // dispatches to /admin/dashboard or /staff/dashboard by role.
    const res = NextResponse.redirect(new URL("/", req.url));
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch (err) {
    console.error("Google login failed:", err);
    loginUrl.searchParams.set("error", "google_failed");
    return NextResponse.redirect(loginUrl);
  }
}
