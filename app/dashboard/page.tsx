"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type CustomerRow = {
  id: number;
  status: string;
};

type CustomerName = {
  name: string;
};

type InvoiceRow = {
  id: number;
  invoice_number: string;
  due_date: string | null;
  currency: string;
  total: number | string;
  status: string;
  created_at: string;
  customer: CustomerName | null;
};

type InvoiceRowRaw = {
  id: number;
  invoice_number: string;
  due_date: string | null;
  currency: string;
  total: number | string;
  status: string;
  created_at: string;
  customer: CustomerName | CustomerName[] | null;
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(
  currency: string,
  value: number | string | null | undefined
) {
  return `${currency} ${toNumber(value).toFixed(2)}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusClasses(status: string) {
  switch (status) {
    case "Paid":
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
    case "Pending":
      return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
    case "Overdue":
      return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
    case "Draft":
      return "bg-slate-700/40 text-slate-300 border border-slate-700";
    default:
      return "bg-slate-700/40 text-slate-300 border border-slate-700";
  }
}

function normalizeInvoiceRows(rows: InvoiceRowRaw[]): InvoiceRow[] {
  return rows.map((row) => ({
    ...row,
    customer: Array.isArray(row.customer)
      ? row.customer[0] ?? null
      : row.customer ?? null,
  }));
}

export default function DashboardPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");

      const [customersResult, invoicesResult] = await Promise.all([
        supabase
          .from("customers")
          .select("id, status")
          .order("id", { ascending: false }),
        supabase
          .from("invoices")
          .select(
            `
              id,
              invoice_number,
              due_date,
              currency,
              total,
              status,
              created_at,
              customer:customers(name)
            `
          )
          .order("created_at", { ascending: false }),
      ]);

      if (customersResult.error) {
        setError(customersResult.error.message);
        setLoading(false);
        return;
      }

      if (invoicesResult.error) {
        setError(invoicesResult.error.message);
        setLoading(false);
        return;
      }

      setCustomers((customersResult.data as CustomerRow[]) ?? []);
      setInvoices(
        normalizeInvoiceRows(
          ((invoicesResult.data ?? []) as unknown as InvoiceRowRaw[])
        )
      );
      setLoading(false);
    }

    loadDashboard();
  }, []);

  const totalCustomers = customers.length;

  const activeCustomers = useMemo(() => {
    return customers.filter((customer) => customer.status === "Active").length;
  }, [customers]);

  const totalInvoices = invoices.length;

  const paidAmount = useMemo(() => {
    return invoices
      .filter((invoice) => invoice.status === "Paid")
      .reduce((sum, invoice) => sum + toNumber(invoice.total), 0);
  }, [invoices]);

  const pendingAmount = useMemo(() => {
    return invoices
      .filter((invoice) => invoice.status === "Pending")
      .reduce((sum, invoice) => sum + toNumber(invoice.total), 0);
  }, [invoices]);

  const overdueCount = useMemo(() => {
    return invoices.filter((invoice) => invoice.status === "Overdue").length;
  }, [invoices]);

  const recentInvoices = useMemo(() => {
    return invoices.slice(0, 5);
  }, [invoices]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-300">
              InvoiceBillos Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Business overview
            </h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Live stats and recent invoice activity from Supabase.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/customers"
              className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-900"
            >
              Customers
            </Link>
            <Link
              href="/invoices/new"
              className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              New Invoice
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
            Failed to load dashboard: {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
            Loading dashboard...
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <p className="text-sm text-slate-400">Total customers</p>
                <h2 className="mt-3 text-3xl font-bold text-white">
                  {totalCustomers}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  All customers saved in the system
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <p className="text-sm text-slate-400">Active customers</p>
                <h2 className="mt-3 text-3xl font-bold text-white">
                  {activeCustomers}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Customers currently marked as active
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <p className="text-sm text-slate-400">Total invoices</p>
                <h2 className="mt-3 text-3xl font-bold text-white">
                  {totalInvoices}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Invoices created in the system
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <p className="text-sm text-slate-400">Paid amount</p>
                <h2 className="mt-3 text-3xl font-bold text-white">
                  USD {paidAmount.toFixed(2)}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Total of invoices marked as paid
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <p className="text-sm text-slate-400">Pending amount</p>
                <h2 className="mt-3 text-3xl font-bold text-white">
                  USD {pendingAmount.toFixed(2)}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Invoices still waiting for payment
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <p className="text-sm text-slate-400">Overdue invoices</p>
                <h2 className="mt-3 text-3xl font-bold text-white">
                  {overdueCount}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Invoices that are past due
                </p>
              </div>
            </section>

            <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Recent invoice activity</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Latest real invoice records from your database
                  </p>
                </div>

                <Link
                  href="/invoices"
                  className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-900"
                >
                  View all invoices
                </Link>
              </div>

              {recentInvoices.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
                  No invoices found yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-3">
                    <thead>
                      <tr className="text-left text-sm text-slate-400">
                        <th className="pb-2 font-medium">Invoice</th>
                        <th className="pb-2 font-medium">Customer</th>
                        <th className="pb-2 font-medium">Amount</th>
                        <th className="pb-2 font-medium">Due date</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentInvoices.map((invoice) => (
                        <tr key={invoice.id} className="bg-slate-950">
                          <td className="rounded-l-xl px-4 py-4 text-white">
                            <Link
                              href={`/invoices/${invoice.id}`}
                              className="font-medium text-emerald-300 hover:text-emerald-200"
                            >
                              {invoice.invoice_number}
                            </Link>
                          </td>

                          <td className="px-4 py-4 text-slate-300">
                            {invoice.customer?.name ?? "-"}
                          </td>

                          <td className="px-4 py-4 text-slate-300">
                            {formatMoney(invoice.currency, invoice.total)}
                          </td>

                          <td className="px-4 py-4 text-slate-300">
                            {formatDate(invoice.due_date)}
                          </td>

                          <td className="rounded-r-xl px-4 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                                invoice.status
                              )}`}
                            >
                              {invoice.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}