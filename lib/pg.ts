import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  if (client) return client;
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Thrown here, inside a route handler's call, so it becomes a normal
    // catchable error the route can turn into a clean JSON response —
    // instead of crashing this entire module (and everything that imports
    // it: auth-store.ts, db.ts, and every route those power) the moment
    // Next.js loads it.
    throw new Error(
      "DATABASE_URL is not set. Add a real Postgres connection string (e.g. from Neon) to your environment — .env.local for local development, or your hosting provider's environment variables in production."
    );
  }
  client = neon(url);
  return client;
}

/**
 * Neon's HTTP-based driver: every query is a single stateless HTTPS request,
 * not a persistent TCP connection. This is the right driver for serverless
 * platforms like Vercel — a traditional connection-pooled driver (pg.Pool)
 * would exhaust Postgres's connection limit under serverless's
 * many-short-lived-instances model.
 *
 * Constructed lazily (on first real query) rather than at module load —
 * see getClient() above for why that matters.
 */
export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  return getClient()(strings, ...values);
}
