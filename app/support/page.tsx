import Link from "next/link";

const DONATION_URL = "#";

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-12 md:px-10">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
            Support InvoiceBillos
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Keep InvoiceBillos free and useful for everyone
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            InvoiceBillos is built to stay simple, practical, and accessible.
            If it helps you, you can support its growth with a donation.
          </p>
        </div>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-2xl font-semibold">Why support it?</h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
              <p>Help cover hosting, email, and development costs.</p>
              <p>Support improvements, bug fixes, and new features.</p>
              <p>Help keep the product open and easy to access for more users.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-2xl font-semibold">How to support</h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
              <p>
                Add your real donation link later by editing the
                <span className="mx-1 rounded bg-slate-800 px-2 py-1 font-mono text-xs text-emerald-300">
                  DONATION_URL
                </span>
                constant in this file.
              </p>
              <p>
                For now, this page is ready and the button below is in place for
                your future donation link.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={DONATION_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Donate to InvoiceBillos
              </a>

              <Link
                href="/"
                className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
              >
                Back to home
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-2xl font-semibold">Launch note</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            InvoiceBillos is currently free to use. Donations are optional and
            help keep the service stable and improving over time.
          </p>
        </section>
      </div>
    </main>
  );
}