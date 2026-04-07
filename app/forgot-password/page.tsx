"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setBusy(true);
    setError("");
    setSuccess("");

    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent("/reset-password")}`,
    });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    setSuccess(
      "If that email exists in the system, a password reset link has been sent. Check your inbox and spam folder."
    );
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex max-w-7xl px-6 py-16 md:px-10">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
            InvoiceBillos Auth
          </p>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Forgot your password?
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-300">
            Enter your email address and we will send you a password reset link.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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

            {error ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                {success}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {busy ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <div className="mt-6 text-sm text-slate-400">
            <Link href="/login" className="hover:text-white">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
