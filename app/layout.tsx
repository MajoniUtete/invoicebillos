import type { Metadata } from "next";
import Link from "next/link";
import AuthButtons from "./components/auth-buttons";
import "./globals.css";

export const metadata: Metadata = {
  title: "InvoiceBillos",
  description: "Simple invoicing for everyone",
  applicationName: "InvoiceBillos",
  icons: {
    icon: "/invoicebillos-icon.svg",
    shortcut: "/invoicebillos-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white antialiased print:bg-white print:text-black">
        <div className="min-h-screen bg-slate-950 text-white print:bg-white print:text-black">
          <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur print:hidden">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 md:px-10">
              <Link href="/" className="text-xl font-bold tracking-tight">
                <span className="text-emerald-400">Invoice</span>Billos
              </Link>

              <nav className="hidden items-center gap-6 md:flex">
                <Link
                  href="/"
                  className="text-sm font-medium text-slate-300 transition hover:text-white"
                >
                  Home
                </Link>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-slate-300 transition hover:text-white"
                >
                  Dashboard
                </Link>
                <Link
                  href="/customers"
                  className="text-sm font-medium text-slate-300 transition hover:text-white"
                >
                  Customers
                </Link>
                <Link
                  href="/invoices"
                  className="text-sm font-medium text-slate-300 transition hover:text-white"
                >
                  Invoices
                </Link>
                <Link
  href="/settings"
  className="text-sm font-medium text-slate-300 transition hover:text-white"
>
  Settings
</Link>
              <Link
  href="/support"
  className="text-sm font-medium text-slate-300 transition hover:text-white"
>
  Support
</Link>
</nav>

              <div className="flex items-center gap-3">
                <Link
                  href="/invoices/new"
                  className="hidden rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 md:inline-flex"
                >
                  New Invoice
                </Link>
                <AuthButtons />
              </div>
            </div>
          </header>

          {children}

          <footer className="border-t border-slate-800 bg-slate-950 print:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-sm text-slate-400 md:px-10 md:flex-row md:items-center md:justify-between">
              <p>© 2026 InvoiceBillos. Simple invoicing for everyone.</p>
              <div className="flex gap-4">
                <Link href="/" className="hover:text-white">
                  Home
                </Link>
                <Link href="/customers" className="hover:text-white">
                  Customers
                </Link>
                <Link href="/invoices" className="hover:text-white">
                  Invoices
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}