"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type InvoiceRecord = {
  id: number;
  invoice_number: string;
  customer_id: number | null;
  issue_date: string | null;
  due_date: string | null;
  currency: string;
  subtotal: number | string;
  tax: number | string;
  discount: number | string;
  total: number | string;
  status: string;
  notes: string | null;
  payment_terms: string | null;
  created_at: string;
  user_id: string;
};

type CustomerRecord = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
};

type ProfileRecord = {
  id: string;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  default_currency: string;
  default_notes: string | null;
  default_payment_terms: string | null;
};

type InvoiceItemRecord = {
  id: number;
  item_name: string;
  description: string | null;
  quantity: number | string;
  unit_price: number | string;
  line_total: number | string;
  user_id: string;
};

type EditableLineItem = {
  id: number | null;
  localId: string;
  item_name: string;
  description: string;
  quantity: string;
  unit_price: string;
};

function displayText(value: string | null | undefined) {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
}

function statusClasses(status: string) {
  switch (status) {
    case "Paid":
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 print:bg-transparent print:text-black print:border-slate-300";
    case "Pending":
      return "bg-amber-500/15 text-amber-300 border border-amber-500/20 print:bg-transparent print:text-black print:border-slate-300";
    case "Overdue":
      return "bg-rose-500/15 text-rose-300 border border-rose-500/20 print:bg-transparent print:text-black print:border-slate-300";
    default:
      return "bg-slate-700/40 text-slate-300 border border-slate-700 print:bg-transparent print:text-black print:border-slate-300";
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

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB");
}

function cleanText(value: string | null | undefined) {
  if (!value) return "-";
  return value.replace(/\s+/g, " ").trim();
}

function createEditableItem(item?: InvoiceItemRecord): EditableLineItem {
  return {
    id: item?.id ?? null,
    localId: crypto.randomUUID(),
    item_name: item?.item_name ?? "",
    description: item?.description ?? "",
    quantity: String(item?.quantity ?? "1"),
    unit_price: String(item?.unit_price ?? "0"),
  };
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

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params?.id ? String(params.id) : "";

  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [items, setItems] = useState<InvoiceItemRecord[]>([]);
  const [editableItems, setEditableItems] = useState<EditableLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editMode, setEditMode] = useState(false);

  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("Draft");
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [taxPercent, setTaxPercent] = useState("0");
  const [discount, setDiscount] = useState("0");

  async function loadInvoiceDetail() {
    if (!invoiceId) {
      setError("Invoice ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const currentUserId = await fetchCurrentUserId();

      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", Number(invoiceId))
        .eq("user_id", currentUserId)
        .single();

      if (invoiceError || !invoiceData) {
        setError(invoiceError?.message || "Invoice not found.");
        setLoading(false);
        return;
      }

      const invoiceRecord = invoiceData as InvoiceRecord;
      setInvoice(invoiceRecord);

      const [itemResult, customerResult, profileResult] = await Promise.all([
        supabase
          .from("invoice_items")
          .select("*")
          .eq("invoice_id", invoiceRecord.id)
          .eq("user_id", currentUserId)
          .order("id", { ascending: true }),
        invoiceRecord.customer_id
          ? supabase
              .from("customers")
              .select("*")
              .eq("id", invoiceRecord.customer_id)
              .eq("user_id", currentUserId)
              .single()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUserId)
          .maybeSingle(),
      ]);

      if (itemResult.error) {
        setError(itemResult.error.message);
        setLoading(false);
        return;
      }

      const loadedItems = (itemResult.data as InvoiceItemRecord[]) ?? [];
      setItems(loadedItems);
      setEditableItems(
        loadedItems.length > 0
          ? loadedItems.map((item) => createEditableItem(item))
          : [createEditableItem()]
      );

      if (customerResult?.error) {
        setError(customerResult.error.message);
        setLoading(false);
        return;
      }

      setCustomer((customerResult?.data as CustomerRecord | null) ?? null);

      if (profileResult.error) {
        setError(profileResult.error.message);
        setLoading(false);
        return;
      }

      setProfile((profileResult.data as ProfileRecord | null) ?? null);

      setIssueDate(invoiceRecord.issue_date ?? "");
      setDueDate(invoiceRecord.due_date ?? "");
      setStatus(invoiceRecord.status);
      setNotes(invoiceRecord.notes ?? "");
      setPaymentTerms(invoiceRecord.payment_terms ?? "");

      const invoiceSubtotal = toNumber(invoiceRecord.subtotal);
      const invoiceTaxAmount = toNumber(invoiceRecord.tax);
      const derivedTaxPercent =
        invoiceSubtotal > 0 ? (invoiceTaxAmount / invoiceSubtotal) * 100 : 0;

      setTaxPercent(String(derivedTaxPercent));
      setDiscount(String(invoiceRecord.discount ?? "0"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoice.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadInvoiceDetail();
  }, [invoiceId]);

  const subtotal = useMemo(() => {
    return editableItems.reduce((sum, item) => {
      return sum + toNumber(item.quantity) * toNumber(item.unit_price);
    }, 0);
  }, [editableItems]);

  const taxPercentNumber = toNumber(taxPercent);
  const taxNumber = subtotal * (taxPercentNumber / 100);
  const discountNumber = toNumber(discount);
  const total = Math.max(subtotal + taxNumber - discountNumber, 0);

  function handlePrint() {
    window.print();
  }

  function handleItemChange(
    localId: string,
    field: keyof Omit<EditableLineItem, "id" | "localId">,
    value: string
  ) {
    setEditableItems((prev) =>
      prev.map((item) =>
        item.localId === localId ? { ...item, [field]: value } : item
      )
    );
  }

  function addItem() {
    setEditableItems((prev) => [...prev, createEditableItem()]);
  }

  function removeItem(localId: string) {
    setEditableItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((item) => item.localId !== localId);
    });
  }

  async function handleSaveChanges() {
    if (!invoice) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const currentUserId = await fetchCurrentUserId();

      const validItems = editableItems.filter(
        (item) =>
          item.item_name.trim() &&
          toNumber(item.quantity) > 0 &&
          toNumber(item.unit_price) >= 0
      );

      if (validItems.length === 0) {
        setError("Please keep at least one valid line item.");
        setSaving(false);
        return;
      }

      const { error: updateInvoiceError } = await supabase
        .from("invoices")
        .update({
          issue_date: issueDate || null,
          due_date: dueDate || null,
          status,
          notes: notes.trim() || null,
          payment_terms: paymentTerms.trim() || null,
          tax: taxNumber,
          discount: discountNumber,
          subtotal,
          total,
        })
        .eq("id", invoice.id)
        .eq("user_id", currentUserId);

      if (updateInvoiceError) {
        setError(updateInvoiceError.message);
        setSaving(false);
        return;
      }

      const existingIds = items.map((item) => item.id);
      const keptIds = validItems
        .map((item) => item.id)
        .filter((id): id is number => id !== null);

      const idsToDelete = existingIds.filter((id) => !keptIds.includes(id));

      if (idsToDelete.length > 0) {
        const { error: deleteItemsError } = await supabase
          .from("invoice_items")
          .delete()
          .in("id", idsToDelete)
          .eq("user_id", currentUserId);

        if (deleteItemsError) {
          setError(deleteItemsError.message);
          setSaving(false);
          return;
        }
      }

      for (const item of validItems) {
        const quantity = toNumber(item.quantity);
        const unitPrice = toNumber(item.unit_price);
        const lineTotal = quantity * unitPrice;

        if (item.id !== null) {
          const { error: updateItemError } = await supabase
            .from("invoice_items")
            .update({
              item_name: item.item_name.trim(),
              description: item.description.trim() || null,
              quantity,
              unit_price: unitPrice,
              line_total: lineTotal,
            })
            .eq("id", item.id)
            .eq("user_id", currentUserId);

          if (updateItemError) {
            setError(updateItemError.message);
            setSaving(false);
            return;
          }
        } else {
          const { error: insertItemError } = await supabase
            .from("invoice_items")
            .insert({
              user_id: currentUserId,
              invoice_id: invoice.id,
              item_name: item.item_name.trim(),
              description: item.description.trim() || null,
              quantity,
              unit_price: unitPrice,
              line_total: lineTotal,
            });

          if (insertItemError) {
            setError(insertItemError.message);
            setSaving(false);
            return;
          }
        }
      }

      await loadInvoiceDetail();
      setEditMode(false);
      setSuccess("Invoice updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update invoice.");
    }

    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white print:bg-white print:text-black">
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10 print:max-w-none print:px-0 print:py-0">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between print:hidden">
          <div>
            <p className="text-sm font-medium text-emerald-300">
              InvoiceBillos • Invoice Detail
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              {editMode ? "Edit invoice" : "View invoice"}
            </h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              View, print, and now fully edit this invoice.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/invoices"
              className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-900"
            >
              Back to Invoices
            </Link>

            {editMode ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(false);
                    loadInvoiceDetail();
                  }}
                  className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-900"
                >
                  Edit Invoice
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  Download PDF
                </button>
              </>
            )}
          </div>
        </div>

        {success ? (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200 print:hidden">
            {success}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300 print:hidden">
            Loading invoice...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200 print:hidden">
            Failed to load invoice: {error}
          </div>
        ) : !invoice ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300 print:hidden">
            Invoice not found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-sm print:rounded-none print:border-0 print:shadow-none print:text-[12px] print:leading-[1.35]">
            <div className="border-b border-slate-200 px-8 py-8 print:px-6 print:py-5">
              <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">
                    InvoiceBillos
                  </p>
                  <h2 className="mt-4 text-5xl font-bold tracking-tight">
                    INVOICE
                  </h2>
                  <p className="mt-3 text-sm text-slate-500">
                    Simple invoicing for everyone
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-sm text-slate-500">Invoice number</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {invoice.invoice_number}
                  </p>

                  <div className="mt-4">
                    {editMode ? (
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                          invoice.status
                        )}`}
                      >
                        {invoice.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 border-b border-slate-200 px-8 py-6 print:px-6 print:py-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  From
                </p>
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  {displayText(profile?.business_name) ? (
                    <p className="text-lg font-semibold text-slate-900">
                      {displayText(profile?.business_name)}
                    </p>
                  ) : null}
                  {displayText(profile?.email) ? (
                    <p>{displayText(profile?.email)}</p>
                  ) : null}
                  {displayText(profile?.phone) ? (
                    <p>{displayText(profile?.phone)}</p>
                  ) : null}
                  {displayText(profile?.address) ? (
                    <p>{displayText(profile?.address)}</p>
                  ) : null}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Bill To
                </p>
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  {customer ? (
                    <>
                      <p className="text-lg font-semibold text-slate-900">
                        {displayText(customer.name)}
                      </p>
                      {displayText(customer.email) ? (
                        <p>{displayText(customer.email)}</p>
                      ) : null}
                      {displayText(customer.phone) ? (
                        <p>{displayText(customer.phone)}</p>
                      ) : null}
                      {displayText(customer.address) ? (
                        <p>{displayText(customer.address)}</p>
                      ) : null}
                    </>
                  ) : (
                    <p className="italic text-slate-500">
                      Customer not selected
                    </p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Invoice Info
                </p>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <div className="flex justify-between gap-4">
                    <span>Issue date</span>
                    {editMode ? (
                      <input
                        type="date"
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        className="rounded-lg border border-slate-300 px-2 py-1"
                      />
                    ) : (
                      <span className="font-medium text-slate-900">
                        {formatDate(invoice.issue_date)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Due date</span>
                    {editMode ? (
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="rounded-lg border border-slate-300 px-2 py-1"
                      />
                    ) : (
                      <span className="font-medium text-slate-900">
                        {formatDate(invoice.due_date)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Currency</span>
                    <span className="font-medium text-slate-900">
                      {invoice.currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 print:px-6 print:py-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  Line items
                </h3>
                {editMode ? (
                  <button
                    type="button"
                    onClick={addItem}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
                  >
                    Add Item
                  </button>
                ) : null}
              </div>

              {editableItems.length === 0 ? (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No line items found for this invoice.
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs text-slate-500 print:text-[11px]">
                        <th className="px-3 py-3 font-medium">Item</th>
                        <th className="px-3 py-3 font-medium">Description</th>
                        <th className="px-3 py-3 font-medium">Qty</th>
                        <th className="px-3 py-3 font-medium">Unit price</th>
                        <th className="px-3 py-3 font-medium">Line total</th>
                        {editMode ? (
                          <th className="px-3 py-3 font-medium">Action</th>
                        ) : null}
                      </tr>
                    </thead>

                    <tbody>
                      {editableItems.map((item) => {
                        const lineTotal =
                          toNumber(item.quantity) * toNumber(item.unit_price);

                        return (
                          <tr
                            key={item.localId}
                            className="border-b border-slate-100 break-inside-avoid"
                          >
                            <td className="px-3 py-4 text-sm text-slate-900">
                              {editMode ? (
                                <input
                                  type="text"
                                  value={item.item_name}
                                  onChange={(e) =>
                                    handleItemChange(
                                      item.localId,
                                      "item_name",
                                      e.target.value
                                    )
                                  }
                                  className="w-full rounded-lg border border-slate-300 px-2 py-1"
                                />
                              ) : (
                                <span className="font-medium">
                                  {cleanText(item.item_name)}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-4 text-sm text-slate-700">
                              {editMode ? (
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) =>
                                    handleItemChange(
                                      item.localId,
                                      "description",
                                      e.target.value
                                    )
                                  }
                                  className="w-full rounded-lg border border-slate-300 px-2 py-1"
                                />
                              ) : (
                                cleanText(item.description)
                              )}
                            </td>
                            <td className="px-3 py-4 text-sm text-slate-700">
                              {editMode ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleItemChange(
                                      item.localId,
                                      "quantity",
                                      e.target.value
                                    )
                                  }
                                  className="w-24 rounded-lg border border-slate-300 px-2 py-1"
                                />
                              ) : (
                                toNumber(item.quantity).toFixed(2)
                              )}
                            </td>
                            <td className="px-3 py-4 text-sm text-slate-700">
                              {editMode ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(e) =>
                                    handleItemChange(
                                      item.localId,
                                      "unit_price",
                                      e.target.value
                                    )
                                  }
                                  className="w-28 rounded-lg border border-slate-300 px-2 py-1"
                                />
                              ) : (
                                formatMoney(invoice.currency, item.unit_price)
                              )}
                            </td>
                            <td className="px-3 py-4 text-sm font-medium text-slate-900">
                              {formatMoney(invoice.currency, lineTotal)}
                            </td>
                            {editMode ? (
                              <td className="px-3 py-4 text-sm">
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.localId)}
                                  className="rounded-lg border border-rose-300 px-3 py-1 text-rose-700"
                                >
                                  Remove
                                </button>
                              </td>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="grid gap-6 border-t border-slate-200 px-8 py-6 print:px-6 print:py-4 md:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-8">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Notes
                  </h3>
                  {editMode ? (
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  ) : (
                    <p className="mt-4 text-sm leading-7 text-slate-700">
                      {cleanText(invoice.notes)}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Payment Terms
                  </h3>
                  {editMode ? (
                    <textarea
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      rows={4}
                      className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  ) : (
                    <p className="mt-4 text-sm leading-7 text-slate-700">
                      {cleanText(invoice.payment_terms)}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-semibold text-slate-900">
                  Invoice Summary
                </h3>

                <div className="mt-5 space-y-4 text-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-slate-700">
                    <span>Subtotal</span>
                    <span>{formatMoney(invoice.currency, subtotal)}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-slate-700">
                    <span>Tax</span>
                    {editMode ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={taxPercent}
                          onChange={(e) => setTaxPercent(e.target.value)}
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1"
                        />
                        <span className="text-xs text-slate-500">%</span>
                      </div>
                    ) : (
                      <span>{formatMoney(invoice.currency, taxNumber)}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-slate-700">
                    <span>Tax rate</span>
                    <span>{taxPercentNumber.toFixed(2)}%</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-slate-700">
                    <span>Discount</span>
                    {editMode ? (
                      <input
                        type="number"
                        step="0.01"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="w-28 rounded-lg border border-slate-300 px-2 py-1"
                      />
                    ) : (
                      <span>
                        {formatMoney(invoice.currency, discountNumber)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-lg font-bold text-slate-900">
                    <span>Total</span>
                    <span>{formatMoney(invoice.currency, total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 px-8 py-4 print:px-6 print:py-3 text-center text-xs text-slate-500">
              Generated by InvoiceBillos
            </div>
          </div>
        )}
      </div>
    </main>
  );
}