"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { supabase } from "@/lib/supabase/client";

type CustomerName = {
  name: string;
};

type InvoiceRow = {
  id: number;
  invoice_number: string;
  issue_date: string | null;
  due_date: string | null;
  currency: string;
  subtotal: number | string;
  tax: number | string;
  discount: number | string;
  total: number | string;
  status: string;
  created_at: string;
  customer: CustomerName | null;
  user_id: string;
};

type InvoiceRowRaw = {
  id: number;
  invoice_number: string;
  issue_date: string | null;
  due_date: string | null;
  currency: string;
  subtotal: number | string;
  tax: number | string;
  discount: number | string;
  total: number | string;
  status: string;
  created_at: string;
  customer: CustomerName | CustomerName[] | null;
  user_id: string;
};

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

function normalizeInvoiceRows(rows: InvoiceRowRaw[]): InvoiceRow[] {
  return rows.map((row) => ({
    ...row,
    customer: Array.isArray(row.customer)
      ? row.customer[0] ?? null
      : row.customer ?? null,
  }));
}

async function fetchCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("You must be logged in.");

  return user.id;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userId, setUserId] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    async function loadInvoices() {
      setLoading(true);
      setError("");

      try {
        const currentUserId = await fetchCurrentUserId();
        setUserId(currentUserId);

        const { data, error } = await supabase
          .from("invoices")
          .select(
            `
              id,
              invoice_number,
              issue_date,
              due_date,
              currency,
              subtotal,
              tax,
              discount,
              total,
              status,
              created_at,
              user_id,
              customer:customers(name)
            `
          )
          .eq("user_id", currentUserId)
          .order("created_at", { ascending: false });

        if (error) {
          setError(error.message);
          setInvoices([]);
        } else {
          const normalizedRows = normalizeInvoiceRows(
            ((data ?? []) as unknown as InvoiceRowRaw[])
          );
          setInvoices(normalizedRows);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invoices.");
        setInvoices([]);
      }

      setLoading(false);
    }

    loadInvoices();
  }, []);

  async function refreshInvoices() {
    if (!userId) return;

    const { data, error } = await supabase
      .from("invoices")
      .select(
        `
          id,
          invoice_number,
          issue_date,
          due_date,
          currency,
          subtotal,
          tax,
          discount,
          total,
          status,
          created_at,
          user_id,
          customer:customers(name)
        `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setInvoices([]);
    } else {
      const normalizedRows = normalizeInvoiceRows(
        ((data ?? []) as unknown as InvoiceRowRaw[])
      );
      setInvoices(normalizedRows);
    }
  }

  async function handleStatusChange(invoiceId: number, status: string) {
    if (!userId) {
      setError("You must be logged in.");
      return;
    }

    setError("");
    setSuccess("");
    setUpdatingId(invoiceId);

    const { error } = await supabase
      .from("invoices")
      .update({ status })
      .eq("id", invoiceId)
      .eq("user_id", userId);

    if (error) {
      setError(error.message);
      setUpdatingId(null);
      return;
    }

    await refreshInvoices();
    setSuccess("Invoice status updated successfully.");
    setUpdatingId(null);
  }

  async function handleDeleteInvoice(invoiceId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this invoice?"
    );

    if (!confirmed) return;

    if (!userId) {
      setError("You must be logged in.");
      return;
    }

    setError("");
    setSuccess("");
    setDeletingId(invoiceId);

    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoiceId)
      .eq("user_id", userId);

    if (error) {
      setError(error.message);
      setDeletingId(null);
      return;
    }

    await refreshInvoices();
    setSuccess("Invoice deleted successfully.");
    setDeletingId(null);
  }

  const filteredInvoices = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return invoices;

    return invoices.filter((invoice) => {
      return (
        invoice.invoice_number.toLowerCase().includes(term) ||
        (invoice.customer?.name ?? "").toLowerCase().includes(term) ||
        invoice.status.toLowerCase().includes(term) ||
        invoice.currency.toLowerCase().includes(term)
      );
    });
  }, [invoices, search]);

  const totalInvoices = invoices.length;

  const paidThisMonth = invoices
    .filter((invoice) => invoice.status === "Paid")
    .reduce((sum, invoice) => sum + toNumber(invoice.total), 0);

  const pendingAmount = invoices
    .filter((invoice) => invoice.status === "Pending")
    .reduce((sum, invoice) => sum + toNumber(invoice.total), 0);

  const overdueCount = invoices.filter(
    (invoice) => invoice.status === "Overdue"
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-300">
              InvoiceBillos Invoices
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Manage invoices with clarity
            </h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              This page now shows only the invoices that belong to your account.
            </p>
          </div>

          <div className="flex gap-3">
            <button className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-900">
              Export List
            </button>
            <Link
              href="/invoices/new"
              className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              New Invoice
            </Link>
          </div>
        </div>

        {success ? (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
            {success}
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
            Failed to load invoices: {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-sm text-slate-400">Total invoices</p>
            <h2 className="mt-3 text-3xl font-bold text-white">
              {totalInvoices}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              All invoices created in your account
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-sm text-slate-400">Paid amount</p>
            <h2 className="mt-3 text-3xl font-bold text-white">
              USD {paidThisMonth.toFixed(2)}
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
              Invoices waiting for payment
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-sm text-slate-400">Overdue</p>
            <h2 className="mt-3 text-3xl font-bold text-white">
              {overdueCount}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Invoices past the due date
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Invoice list</h2>
              <p className="mt-1 text-sm text-slate-400">
                Click an invoice number to open its detail page.
              </p>
            </div>

            <div className="w-full md:w-80">
              <input
                type="text"
                placeholder="Search invoices"
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setSearch(e.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
              Loading invoices...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
              No invoices found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-sm text-slate-400">
                    <th className="pb-2 font-medium">Invoice</th>
                    <th className="pb-2 font-medium">Customer</th>
                    <th className="pb-2 font-medium">Issue date</th>
                    <th className="pb-2 font-medium">Due date</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="bg-slate-950">
                      <td className="rounded-l-xl px-4 py-4">
                        <div>
                          <Link
                            href={`/invoices/${invoice.id}`}
                            className="font-medium text-emerald-300 hover:text-emerald-200"
                          >
                            {invoice.invoice_number}
                          </Link>
                          <p className="mt-1 text-xs text-slate-400">
                            Invoice ID: {invoice.id}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {invoice.customer?.name ?? "-"}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {invoice.issue_date || "-"}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {invoice.due_date || "-"}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {formatMoney(invoice.currency, invoice.total)}
                      </td>

                      <td className="px-4 py-4">
                        <select
                          value={invoice.status}
                          onChange={(e) =>
                            handleStatusChange(invoice.id, e.target.value)
                          }
                          disabled={updatingId === invoice.id}
                          className={`rounded-xl px-3 py-2 text-xs font-semibold outline-none ${statusClasses(
                            invoice.status
                          )}`}
                        >
                          <option value="Draft">Draft</option>
                          <option value="Pending">Pending</option>
                          <option value="Paid">Paid</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                      </td>

                      <td className="rounded-r-xl px-4 py-4">
                        <button
                          type="button"
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          disabled={deletingId === invoice.id}
                          className="rounded-lg border border-rose-700 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-950/40 disabled:opacity-60"
                        >
                          {deletingId === invoice.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}