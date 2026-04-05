import Link from "next/link";
const DONATION_URL = "https://buy.stripe.com/4gM4gB9dsaJv3zI5et8so00";
export default function SupportPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-12 md:px-10">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
            Support InvoiceBillos
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Help keep InvoiceBillos free for everyone
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            InvoiceBillos is built to stay simple, practical, and accessible.
            If it has helped you save time or manage your work more easily, you
            can support its growth with a donation.
          </p>
        </div>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-2xl font-semibold">Why support InvoiceBillos?</h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
              <p>Help cover hosting, email, maintenance, and development costs.</p>
              <p>Support improvements, bug fixes, and useful new features.</p>
              <p>
                Help keep InvoiceBillos free, simple, and available to more users.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-2xl font-semibold">Support the project</h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
              <p>
                Donations are completely optional, but every contribution helps
                keep InvoiceBillos running and improving.
              </p>
              <p>
                If you value the product and want to support its future, you can
                use the donation button below.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={DONATION_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Support InvoiceBillos
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
          <h2 className="text-2xl font-semibold">A small note</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            InvoiceBillos is free to use. Donations are optional and simply help
            support stability, maintenance, and future improvements.
          </p>
        </section>
      </div>
    </main>
  );
}