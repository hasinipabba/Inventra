// Minimal Google OAuth 2.0 (Authorization Code flow) helper — deliberately
// dependency-free (plain fetch), matching the rest of this project's style.
// This is not Auth.js — it plugs straight into the existing signed-cookie
// session system in lib/session.ts.

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified?: boolean;
  name: string;
  picture?: string;
}

/**
 * The URL Google redirects back to after consent. Override with
 * GOOGLE_REDIRECT_URI in production if it differs from the request's own
 * origin (e.g. behind a proxy) — otherwise it's derived automatically so
 * this works out of the box on localhost and on your deployed domain alike.
 */
export function getGoogleRedirectUri(requestOrigin: string): string {
  return process.env.GOOGLE_REDIRECT_URI || `${requestOrigin}/api/auth/google/callback`;
}

export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchanges the one-time authorization code for tokens, then fetches the
 * user's profile. Throws on any failure — callers should catch and redirect
 * to /login with a friendly error rather than let this bubble to a 500 page.
 */
export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<GoogleProfile> {
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    throw new Error("google_token_exchange_failed");
  }
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    throw new Error("google_token_exchange_failed");
  }

  const profileRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!profileRes.ok) {
    throw new Error("google_profile_fetch_failed");
  }
  const profile = (await profileRes.json()) as GoogleProfile;
  if (!profile.email) {
    throw new Error("google_profile_fetch_failed");
  }
  return profile;
}
