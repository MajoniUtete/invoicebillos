"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [message, setMessage] = useState("Confirming your reset link...");
  const [error, setError] = useState("");

  useEffect(() => {
    async function confirmRecovery() {
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const next = searchParams.get("next") || "/reset-password";

      if (!token_hash || type !== "recovery") {
        setError("Invalid or missing recovery link.");
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: "recovery",
      });

      if (error) {
        setError(error.message);
        return;
      }

      setMessage("Recovery link confirmed. Redirecting...");
      router.replace(`${next}?fromRecovery=1`);
      router.refresh();
    }

    confirmRecovery();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex max-w-7xl px-6 py-16 md:px-10">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
            InvoiceBillos Auth
          </p>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Confirm password reset
          </h1>

          {error ? (
            <div className="mt-8 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              {error}
            </div>
          ) : (
            <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
              {message}
            </div>
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

export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 text-white">
          <div className="mx-auto flex max-w-7xl px-6 py-16 md:px-10">
            <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                InvoiceBillos Auth
              </p>
              <h1 className="mt-4 text-3xl font-bold tracking-tight">
                Confirm password reset
              </h1>
              <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
                Loading...
              </div>
            </div>
          </div>
        </main>
      }
    >
      <ConfirmContent />
    </Suspense>
  );
}