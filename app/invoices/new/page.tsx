"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { supabase } from "@/lib/supabase/client";

type Customer = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  created_at: string;
  user_id: string;
};

type Profile = {
  id: string;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  default_currency: string;
  default_notes: string | null;
  default_payment_terms: string | null;
};

type LineItem = {
  id: string;
  itemName: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

type InvoiceForm = {
  invoiceNumber: string;
  customerId: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  taxPercent: string;
  discount: string;
  notes: string;
  paymentTerms: string;
};

function generateInvoiceNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return `INV-${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function createLineItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    itemName: "",
    description: "",
    quantity: "1",
    unitPrice: "0",
  };
}

function createEmptyForm(): InvoiceForm {
  return {
    invoiceNumber: generateInvoiceNumber(),
    customerId: "",
    currency: "USD",
    issueDate: "",
    dueDate: "",
    taxPercent: "0",
    discount: "0",
    notes: "Thank you for your business.",
    paymentTerms: "Payment due within 14 days.",
  };
}

function toMoneyNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

export default function NewInvoicePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<InvoiceForm>(createEmptyForm());
  const [lineItems, setLineItems] = useState<LineItem[]>([createLineItem()]);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    async function loadCustomersAndProfile() {
      setLoadingCustomers(true);
      setError("");

      try {
        const currentUserId = await fetchCurrentUserId();
        setUserId(currentUserId);

        const [customersResult, profileResult] = await Promise.all([
          supabase
            .from("customers")
            .select("*")
            .eq("user_id", currentUserId)
            .order("name", { ascending: true }),
          supabase
            .from("profiles")
            .select("*")
            .eq("id", currentUserId)
            .maybeSingle(),
        ]);

        if (customersResult.error) {
          setError(customersResult.error.message);
          setCustomers([]);
        } else {
          setCustomers((customersResult.data as Customer[]) ?? []);
        }

        if (profileResult.error) {
          setError(profileResult.error.message);
        } else if (profileResult.data) {
          const loadedProfile = profileResult.data as Profile;
          setProfile(loadedProfile);

          setForm((prev) => ({
            ...prev,
            currency: loadedProfile.default_currency || prev.currency,
            notes: loadedProfile.default_notes ?? prev.notes,
            paymentTerms:
              loadedProfile.default_payment_terms ?? prev.paymentTerms,
          }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data.");
        setCustomers([]);
      }

      setLoadingCustomers(false);
    }

    loadCustomersAndProfile();
  }, []);

  const selectedCustomer = useMemo(() => {
    return (
      customers.find((customer) => String(customer.id) === form.customerId) ??
      null
    );
  }, [customers, form.customerId]);

  const subtotal = useMemo(() => {
    return lineItems.reduce((sum, item) => {
      const quantity = toMoneyNumber(item.quantity);
      const unitPrice = toMoneyNumber(item.unitPrice);
      return sum + quantity * unitPrice;
    }, 0);
  }, [lineItems]);

  const taxPercent = toMoneyNumber(form.taxPercent);
  const tax = subtotal * (taxPercent / 100);
  const discount = toMoneyNumber(form.discount);
  const total = Math.max(subtotal + tax - discount, 0);

  function handleFormChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleLineItemChange(
    id: string,
    field: keyof Omit<LineItem, "id">,
    value: string
  ) {
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, createLineItem()]);
  }

  function removeLineItem(id: string) {
    setLineItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  }

  async function saveInvoice(status: "Draft" | "Pending") {
    setError("");
    setSuccess("");

    if (!userId) {
      setError("You must be logged in.");
      return;
    }

    if (!form.invoiceNumber.trim()) {
      setError("Invoice number is required.");
      return;
    }

    if (!form.customerId) {
      setError("Please select a customer.");
      return;
    }

    const validItems = lineItems.filter(
      (item) =>
        item.itemName.trim() &&
        toMoneyNumber(item.quantity) > 0 &&
        toMoneyNumber(item.unitPrice) >= 0
    );

    if (validItems.length === 0) {
      setError("Please add at least one valid line item.");
      return;
    }

    setSaving(true);

    const { data: invoiceData, error: invoiceError } = await supabase
      .from("invoices")
      .insert([
        {
          user_id: userId,
          invoice_number: form.invoiceNumber.trim(),
          customer_id: Number(form.customerId),
          issue_date: form.issueDate || null,
          due_date: form.dueDate || null,
          currency: form.currency,
          subtotal,
          tax,
          discount,
          total,
          status,
          notes: form.notes.trim() || null,
          payment_terms: form.paymentTerms.trim() || null,
        },
      ])
      .select("id")
      .single();

    if (invoiceError) {
      setError(invoiceError.message);
      setSaving(false);
      return;
    }

    const invoiceId = invoiceData.id;

    const itemsToInsert = validItems.map((item) => {
      const quantity = toMoneyNumber(item.quantity);
      const unitPrice = toMoneyNumber(item.unitPrice);
      const lineTotal = quantity * unitPrice;

      return {
        user_id: userId,
        invoice_id: invoiceId,
        item_name: item.itemName.trim(),
        description: item.description.trim() || null,
        quantity,
        unit_price: unitPrice,
        line_total: lineTotal,
      };
    });

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(itemsToInsert);

    if (itemsError) {
      setError(itemsError.message);
      setSaving(false);
      return;
    }

    setSuccess(
      `Invoice ${form.invoiceNumber} saved successfully as ${status}.`
    );

    setForm({
      ...createEmptyForm(),
      currency: profile?.default_currency || "USD",
      notes: profile?.default_notes || "Thank you for your business.",
      paymentTerms:
        profile?.default_payment_terms || "Payment due within 14 days.",
    });
    setLineItems([createLineItem()]);
    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-300">
              InvoiceBillos • New Invoice
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Create a new invoice
            </h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Your business defaults now come from your saved profile settings,
              and a customer must be selected before an invoice can be saved.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => saveInvoice("Draft")}
              disabled={saving}
              className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>

            <button
              type="button"
              onClick={() => saveInvoice("Pending")}
              disabled={saving}
              className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Invoice"}
            </button>
          </div>
        </div>

        {success ? (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
            {success}
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-xl font-semibold">Invoice details</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Invoice number
                  </label>
                  <input
                    type="text"
                    name="invoiceNumber"
                    value={form.invoiceNumber}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={form.currency}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option>USD</option>
                    <option>EUR</option>
                    <option>ZiG</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Issue date
                  </label>
                  <input
                    type="date"
                    name="issueDate"
                    value={form.issueDate}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Due date
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    value={form.dueDate}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-xl font-semibold">Customer</h2>

              <div className="mt-5 grid gap-4">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Select customer
                  </label>
                  <select
                    name="customerId"
                    value={form.customerId}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                    disabled={loadingCustomers}
                  >
                    <option value="">
                      {loadingCustomers
                        ? "Loading customers..."
                        : "Choose a customer"}
                    </option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  {selectedCustomer ? (
                    <div className="space-y-2 text-sm text-slate-300">
                      <p className="font-semibold text-white">
                        {selectedCustomer.name}
                      </p>
                      <p>{selectedCustomer.email || "-"}</p>
                      <p>{selectedCustomer.phone || "-"}</p>
                      <p>{selectedCustomer.address || "-"}</p>
                      <p>Status: {selectedCustomer.status}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      Select a customer to see their details here.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Line items</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    These items now drive the subtotal automatically.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addLineItem}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
                >
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
                {lineItems.map((item, index) => {
                  const quantity = toMoneyNumber(item.quantity);
                  const unitPrice = toMoneyNumber(item.unitPrice);
                  const lineTotal = quantity * unitPrice;

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white">
                          Item {index + 1}
                        </h3>

                        <button
                          type="button"
                          onClick={() => removeLineItem(item.id)}
                          className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-900"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm text-slate-300">
                            Item name
                          </label>
                          <input
                            type="text"
                            value={item.itemName}
                            onChange={(e) =>
                              handleLineItemChange(
                                item.id,
                                "itemName",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                            placeholder="Website design"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm text-slate-300">
                            Description
                          </label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              handleLineItemChange(
                                item.id,
                                "description",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                            placeholder="Short description"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm text-slate-300">
                            Quantity
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              handleLineItemChange(
                                item.id,
                                "quantity",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm text-slate-300">
                            Unit price
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleLineItemChange(
                                item.id,
                                "unitPrice",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="mt-4 text-sm text-slate-300">
                        Line total:{" "}
                        <span className="font-semibold text-white">
                          {form.currency} {lineTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-xl font-semibold">Adjustments</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Tax (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="taxPercent"
                    value={form.taxPercent}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                    placeholder="10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Discount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="discount"
                    value={form.discount}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-xl font-semibold">Notes and payment terms</h2>

              <div className="mt-5 grid gap-4">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Notes
                  </label>
                  <textarea
                    rows={4}
                    name="notes"
                    value={form.notes}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Payment terms
                  </label>
                  <textarea
                    rows={4}
                    name="paymentTerms"
                    value={form.paymentTerms}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-xl font-semibold">Invoice summary</h2>

              <div className="mt-5 space-y-4 text-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-slate-300">
                  <span>Subtotal</span>
                  <span>
                    {form.currency} {subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-slate-300">
                  <span>Tax</span>
                  <span>
                    {form.currency} {tax.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-slate-300">
                  <span>Tax rate</span>
                  <span>{taxPercent.toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-slate-300">
                  <span>Discount</span>
                  <span>
                    {form.currency} {discount.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-lg font-bold text-white">
                  <span>Total</span>
                  <span>
                    {form.currency} {total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-xl font-semibold">Business profile</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  {profile?.business_name || "No business name saved yet"}
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  {profile?.email || "No business email saved yet"}
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  {profile?.phone || "No business phone saved yet"}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}