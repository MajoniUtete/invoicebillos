import Link from "next/link";

const featureCards = [
  {
    title: "Create invoices fast",
    description:
      "Build professional invoices in minutes with clear totals, due dates, notes, payment terms, and PDF export.",
  },
  {
    title: "Manage customers",
    description:
      "Keep customer names, phone numbers, email addresses, and account status in one organized place.",
  },
  {
    title: "Track invoice progress",
    description:
      "See drafts, pending invoices, paid invoices, and overdue invoices without needing another tool.",
  },
  {
    title: "Use your own business profile",
    description:
      "Your invoices and PDFs can now use your own business name, email, phone, address, and defaults.",
  },
];

const launchChecks = [
  "Protected login and logout",
  "Per-user data ownership",
  "Row Level Security in Supabase",
  "Customer create, edit, and delete",
  "Invoice create, edit, status update, and delete",
  "PDF export with profile-based invoice details",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-slate-800">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:px-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
              InvoiceBillos
            </p>

            <div className="mt-4 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300">
              Free to use • Donation supported
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
              Invoicing that stays simple, useful, and accessible.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              InvoiceBillos helps freelancers, side hustles, small businesses,
              and growing teams create invoices, manage customers, track status,
              and export clean PDFs from one place.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/invoices/new"
                className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Create Invoice
              </Link>

              <Link
                href="/dashboard"
                className="rounded-2xl border border-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
              >
                Open Dashboard
              </Link>

              <Link
                href="/support"
                className="rounded-2xl border border-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
              >
                Support InvoiceBillos
              </Link>
            </div>

            <div className="mt-10 grid gap-4 text-sm text-slate-300 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                Free to use
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                Secure user accounts
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                PDF export
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                    Launch status
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">
                    Ready for real use
                  </h2>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Live
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {launchChecks.map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-800">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
              What InvoiceBillos does
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              Built to help you invoice with less friction.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              Instead of juggling spreadsheets, notes, and different tools,
              InvoiceBillos gives you one focused place to create, manage, and
              polish invoices with confidence.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featureCards.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
              >
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-800">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:px-10 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
              Free model
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">
              Free first. Supported by people who value it.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              InvoiceBillos is designed to stay usable without forcing people
              into a payment wall too early. If users like it and want to help
              it grow, they can support it through donations.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/support"
                className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Support InvoiceBillos
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
              Launch note
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">
              Built to improve through real use and feedback.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              InvoiceBillos is already live and functional. The goal now is to
              keep improving reliability, polish, and the everyday workflow for
              real users.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
              >
                Login
              </Link>
              <Link
                href="/settings"
                className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
              >
                Business Settings
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 md:p-10">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                Start now
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
                Create invoices, manage customers, and keep your workflow clean.
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                The foundation is already live. Now the focus is on making it
                more polished, more helpful, and more trusted with every update.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/customers"
                className="rounded-2xl border border-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
              >
                Open Customers
              </Link>
              <Link
                href="/invoices"
                className="rounded-2xl border border-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
              >
                Open Invoices
              </Link>
              <Link
                href="/invoices/new"
                className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Create New Invoice
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}