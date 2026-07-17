// Session tokens: a small signed, tamper-proof cookie value.
// Uses Web Crypto (SubtleCrypto), which is available both in the Next.js
// Edge middleware runtime and in the Node runtime used by API routes — so
// this one module works everywhere without extra dependencies.

const encoder = new TextEncoder();

// Dev fallback so auth works out of the box. Set AUTH_SECRET in your real
// environment before deploying — anyone with this string can forge sessions.
const SECRET = process.env.AUTH_SECRET || "inventra-dev-secret-change-me";

export const SESSION_COOKIE = "inventra_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  sub: string; // user id
  email: string;
  name: string;
  role: "Admin" | "Store Staff";
  image?: string; // avatar URL, set for Google-linked accounts
  exp: number; // unix seconds
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signSession(payload: Omit<SessionPayload, "exp">, maxAgeSeconds = SESSION_MAX_AGE_SECONDS): Promise<string> {
  const full: SessionPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + maxAgeSeconds };
  const body = toBase64Url(encoder.encode(JSON.stringify(full)));
  const key = await getKey();
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body) as BufferSource);
  const sigStr = toBase64Url(new Uint8Array(sig));
  return `${body}.${sigStr}`;
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const key = await getKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(sig) as BufferSource,
      encoder.encode(body) as BufferSource
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body) as BufferSource)) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
