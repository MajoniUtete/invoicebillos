"use client";

import Script from "next/script";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const TURNSTILE_SITE_KEY = "0x4AAAAAAC6rJE0zGtAnE6oT";

export default function LoginForm({ nextUrl }: { nextUrl: string }) {
  const router = useRouter();
  const captchaContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"login" | "signup" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.replace("/dashboard");
      }
    });
  }, [router]);

  function renderTurnstile() {
    if (!captchaContainerRef.current || !window.turnstile) return;

    captchaContainerRef.current.innerHTML = "";

    turnstileWidgetIdRef.current = window.turnstile.render(
      captchaContainerRef.current,
      {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "dark",
        callback: (token: string) => {
          setCaptchaToken(token);
          setError("");
        },
        "expired-callback": () => {
          setCaptchaToken("");
        },
        "error-callback": () => {
          setCaptchaToken("");
          setError("Security check failed. Please refresh and try again.");
        },
      }
    );
  }

  useEffect(() => {
    if (!turnstileReady) return;
    renderTurnstile();

    return () => {
      if (window.turnstile && turnstileWidgetIdRef.current) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
      }
    };
  }, [turnstileReady]);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("login");
    setMessage("");
    setError("");

    if (!captchaToken) {
      setError("Please complete the security check and try again.");
      setBusy(null);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        captchaToken,
      },
    });

    if (error) {
      setError(error.message);
      setBusy(null);
      return;
    }

    if (window.turnstile && turnstileWidgetIdRef.current) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
    }
    setCaptchaToken("");

    router.push(nextUrl);
    router.refresh();
    setBusy(null);
  }

  async function handleSignup() {
    setBusy("signup");
    setMessage("");
    setError("");

    if (!captchaToken) {
      setError("Please complete the security check and try again.");
      setBusy(null);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        captchaToken,
      },
    });

    if (window.turnstile && turnstileWidgetIdRef.current) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
    }
    setCaptchaToken("");

    if (error) {
      setError(error.message);
      setBusy(null);
      return;
    }

    setMessage(
      "Account created. If email confirmation is enabled in Supabase, confirm your email before logging in."
    );
    setBusy(null);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setTurnstileReady(true)}
      />

      <div className="mx-auto flex max-w-7xl px-6 py-16 md:px-10">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
            InvoiceBillos Auth
          </p>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Login or create your account
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-300">
            Access your dashboard, customers, invoices, and PDF workflow from a
            protected account.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                placeholder="Minimum 6 characters"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Security check
              </label>
              <div
                ref={captchaContainerRef}
                className="min-h-[65px] rounded-xl border border-slate-700 bg-slate-950 p-2"
              />
              <p className="mt-2 text-xs text-slate-400">
                Complete the security check before logging in or creating an
                account.
              </p>
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                {message}
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={busy !== null}
                className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
              >
                {busy === "login" ? "Logging in..." : "Log in"}
              </button>

              <button
                type="button"
                onClick={handleSignup}
                disabled={busy !== null}
                className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
              >
                {busy === "signup" ? "Creating account..." : "Create account"}
              </button>
            </div>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
            <Link href="/forgot-password" className="hover:text-white">
              Forgot password?
            </Link>
            <Link href="/" className="hover:text-white">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}