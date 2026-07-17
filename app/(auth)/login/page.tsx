"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, ScanBarcode, Mail, Lock } from "lucide-react";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";

// Friendly copy for the error codes /api/auth/google/callback can redirect
// back with (see that route for when each one fires).
const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_cancelled: "Google sign-in was cancelled.",
  google_invalid_state: "That sign-in link expired or was already used. Please try again.",
  google_failed: "Couldn't sign you in with Google right now. Please try again.",
  google_not_configured: "Google sign-in isn't set up yet on this server.",
};

// This page calls the real /api/auth/login route below, which checks
// credentials against lib/auth-store.ts and sets a signed session cookie.
// A demo account is seeded automatically: admin@inventra.example / Admin@123
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const googleErrorCode = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  function handleGoogleSignIn() {
    setGoogleLoading(true);
    window.location.href = "/api/auth/google";
  }

  function validate() {
    const next: typeof errors = {};
    if (!email) next.email = "Enter your work email.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors({ form: data.error || "Something went wrong. Try again." });
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setErrors({ form: "Couldn't reach the server. Try again." });
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthBrandPanel tagline="Catch expiry risk before it costs you." />

      <div className="flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ScanBarcode size={16} />
            </span>
            <span className="font-display text-base font-semibold">Inventra</span>
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted">Sign in to keep your inventory ahead of expiry.</p>

          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/[0.05] px-3 py-2 text-xs text-muted">
            Demo account: <span className="font-mono text-text">admin@inventra.example</span> / <span className="font-mono text-text">Admin@123</span>
          </div>

          {(errors.form || (!errors.form && googleErrorCode)) && (
            <p className="mt-3 rounded-lg border border-out/20 bg-out/[0.06] px-3 py-2 text-xs text-out">
              {errors.form || GOOGLE_ERROR_MESSAGES[googleErrorCode ?? ""] || "Something went wrong signing in with Google."}
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-muted">
                Email
              </label>
              <div className="relative">
                <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="h-11 w-full rounded-lg border border-border bg-surface2 pl-9 pr-3 text-sm outline-none placeholder:text-muted focus:border-primary"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-out">{errors.email}</p>}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-medium text-muted">
                  Password
                </label>
                <Link href="#" className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-lg border border-border bg-surface2 pl-9 pr-10 text-sm outline-none placeholder:text-muted focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-out">{errors.password}</p>}
            </div>

            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border accent-[#3B82F6]"
              />
              Remember me on this device
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>

            <div className="relative py-1 text-center">
              <span className="relative z-10 bg-bg px-3 text-[11px] uppercase tracking-wide text-muted">or</span>
              <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-border" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface text-sm font-medium hover:bg-surface2 disabled:opacity-70"
            >
              {googleLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Redirecting to Google…
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l6-6C34.5 6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l6-6C34.5 6 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                    <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.4 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39.6 16.2 44 24 44z" />
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.3 5.3C40.7 36.5 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-muted">
            New to Inventra?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
