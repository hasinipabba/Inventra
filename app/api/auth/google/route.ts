import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { buildGoogleAuthUrl, getGoogleRedirectUri } from "@/lib/google-oauth";

const STATE_COOKIE = "google_oauth_state";

export async function GET(req: NextRequest) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(url);
  }

  // Random, single-use value we can check for on the way back — protects
  // against CSRF (an attacker tricking a browser into completing someone
  // else's OAuth flow).
  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = getGoogleRedirectUri(req.nextUrl.origin);
  const authUrl = buildGoogleAuthUrl(redirectUri, state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10, // 10 minutes — just long enough for the round trip through Google
  });
  return res;
}
