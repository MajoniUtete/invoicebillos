import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline",
  description:
    "InvoiceBillos is offline right now. Reconnect to sync your latest customers and invoices.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-16 md:px-10">
        <div className="w-full rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl md:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
            Offline mode
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            InvoiceBillos is still here, even without a connection.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            You can reopen pages that were already cached on this device. Live
            invoice and customer data will refresh automatically once you are
            back online.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/"
              className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Go to Home
            </Link>
            <Link
              href="/dashboard"
              className="rounded-2xl border border-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Try Dashboard
            </Link>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <h2 className="text-lg font-semibold">What works offline</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                The installable app shell, your cached routes, and the saved
                interface assets continue to load.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <h2 className="text-lg font-semibold">What needs connection</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                New Supabase reads and writes will resume when the device is
                online again.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
