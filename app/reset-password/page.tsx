"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

function getHashParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(hash);
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    async function prepareRecoverySession() {
      setError("");

      const code = searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!mounted) return;

        if (error) {
          setError(error.message);
          return;
        }

        setIsRecoveryFlow(true);
        setReady(true);
        return;
      }

      const hashParams = getHashParams();
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");

      if (type === "recovery" && accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!mounted) return;

        if (error) {
          setError(error.message);
          return;
        }

        setIsRecoveryFlow(true);
        setReady(true);
        return;
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;

        if (event === "PASSWORD_RECOVERY" && session) {
          setIsRecoveryFlow(true);
          setReady(true);
        }
      });

      unsubscribe = () => subscription.unsubscribe();
    }

    prepareRecoverySession();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [searchParams]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    await supabase.auth.signOut();
    setMessage("Password updated successfully. Redirecting to login...");
    setBusy(false);

    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 1200);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex max-w-7xl px-6 py-16 md:px-10">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
            InvoiceBillos Auth
          </p>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Reset your password
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-300">
            Enter your new password below.
          </p>

          {!ready ? (
            <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
              Waiting for a valid password recovery session...
            </div>
          ) : !isRecoveryFlow ? (
            <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              Open this page from a password reset email link to set a new password.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  New password
                </label>
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
                  Confirm password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  placeholder="Repeat your new password"
                />
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

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
              >
                {busy ? "Updating..." : "Update password"}
              </button>
            </form>
          )}

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