"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
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

type CustomerForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  status: string;
};

const emptyForm: CustomerForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  status: "Active",
};

function statusClasses(status: string) {
  switch (status) {
    case "Active":
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
    case "Pending":
      return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
    case "Overdue":
      return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
    default:
      return "bg-slate-700/40 text-slate-300 border border-slate-700";
  }
}

async function fetchCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error("You must be logged in.");
  }

  return user.id;
}

async function fetchCustomersForUser(userId: string) {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return {
    data: (data as Customer[]) ?? [],
    error,
  };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [userId, setUserId] = useState("");
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);

  useEffect(() => {
    async function loadCustomers() {
      setLoading(true);
      setError("");

      try {
        const currentUserId = await fetchCurrentUserId();
        setUserId(currentUserId);

        const result = await fetchCustomersForUser(currentUserId);

        if (result.error) {
          setError(result.error.message);
          setCustomers([]);
        } else {
          setCustomers(result.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load customers.");
        setCustomers([]);
      }

      setLoading(false);
    }

    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return customers;

    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(term) ||
        (customer.email ?? "").toLowerCase().includes(term) ||
        (customer.phone ?? "").toLowerCase().includes(term) ||
        (customer.address ?? "").toLowerCase().includes(term) ||
        customer.status.toLowerCase().includes(term)
      );
    });
  }, [customers, search]);

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(
    (customer) => customer.status === "Active"
  ).length;
  const outstandingAccounts = customers.filter(
    (customer) => customer.status === "Pending" || customer.status === "Overdue"
  ).length;
  const topCustomerValue = "$0.00";

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function resetFormState() {
    setForm(emptyForm);
    setEditingCustomerId(null);
    setShowForm(false);
  }

  function startCreateMode() {
    setSuccess("");
    setError("");
    setForm(emptyForm);
    setEditingCustomerId(null);
    setShowForm((prev) => !prev);
  }

  function startEditMode(customer: Customer) {
    setSuccess("");
    setError("");
    setEditingCustomerId(customer.id);
    setForm({
      name: customer.name,
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      status: customer.status,
    });
    setShowForm(true);
  }

  async function refreshCustomers() {
    if (!userId) return;

    const result = await fetchCustomersForUser(userId);

    if (result.error) {
      setError(result.error.message);
      setCustomers([]);
    } else {
      setCustomers(result.data);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Customer name is required.");
      return;
    }

    if (!userId) {
      setError("You must be logged in.");
      return;
    }

    setSaving(true);

    if (editingCustomerId !== null) {
      const { error: updateError } = await supabase
        .from("customers")
        .update({
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          status: form.status,
        })
        .eq("id", editingCustomerId)
        .eq("user_id", userId);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      await refreshCustomers();
      setSuccess("Customer updated successfully.");
      resetFormState();
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("customers").insert([
      {
        user_id: userId,
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        status: form.status,
      },
    ]);

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    await refreshCustomers();
    setSuccess("Customer added successfully.");
    resetFormState();
    setSaving(false);
  }

  async function handleDeleteCustomer(customerId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this customer?"
    );

    if (!confirmed) return;

    if (!userId) {
      setError("You must be logged in.");
      return;
    }

    setError("");
    setSuccess("");
    setDeletingId(customerId);

    const { error: deleteError } = await supabase
      .from("customers")
      .delete()
      .eq("id", customerId)
      .eq("user_id", userId);

    if (deleteError) {
      setError(deleteError.message);
      setDeletingId(null);
      return;
    }

    await refreshCustomers();

    if (editingCustomerId === customerId) {
      resetFormState();
    }

    setSuccess("Customer deleted successfully.");
    setDeletingId(null);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-300">
              InvoiceBillos Customers
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Manage your customers in one place
            </h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              This page shows only the customers that belong to your account.
            </p>
          </div>

          <div className="flex gap-3">
            <button className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-900">
              Import Customers
            </button>
            <button
              onClick={startCreateMode}
              className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              {showForm && editingCustomerId === null ? "Close Form" : "Add Customer"}
            </button>
          </div>
        </div>

        {success ? (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
            {success}
          </div>
        ) : null}

        {error && !loading ? (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
            {error}
          </div>
        ) : null}

        {showForm ? (
          <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="mb-5">
              <h2 className="text-xl font-semibold">
                {editingCustomerId !== null ? "Edit customer" : "Add new customer"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {editingCustomerId !== null
                  ? "Update this customer in your account."
                  : "This form saves directly into your account."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Customer name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                  placeholder="customer@email.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                  placeholder="+263..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Status
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                >
                  <option>Active</option>
                  <option>Pending</option>
                  <option>Overdue</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-slate-300">
                  Address
                </label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows={4}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                  placeholder="Customer address"
                />
              </div>

              <div className="md:col-span-2 flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? editingCustomerId !== null
                      ? "Updating..."
                      : "Saving..."
                    : editingCustomerId !== null
                    ? "Update Customer"
                    : "Save Customer"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    resetFormState();
                  }}
                  className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-900"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-sm text-slate-400">Total customers</p>
            <h2 className="mt-3 text-3xl font-bold text-white">
              {totalCustomers}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              All customers saved in your account
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
            <p className="text-sm text-slate-400">Outstanding accounts</p>
            <h2 className="mt-3 text-3xl font-bold text-white">
              {outstandingAccounts}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Customers marked pending or overdue
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-sm text-slate-400">Top customer value</p>
            <h2 className="mt-3 text-3xl font-bold text-white">
              {topCustomerValue}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              This will update when invoices are connected
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Customer list</h2>
              <p className="mt-1 text-sm text-slate-400">
                Live data from your account only
              </p>
            </div>

            <div className="w-full md:w-80">
              <input
                type="text"
                placeholder="Search customers"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
              Loading customers...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
              No customers found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-sm text-slate-400">
                    <th className="pb-2 font-medium">Customer</th>
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Phone</th>
                    <th className="pb-2 font-medium">Address</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="bg-slate-950">
                      <td className="rounded-l-xl px-4 py-4">
                        <div>
                          <p className="font-medium text-white">
                            {customer.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Customer ID: {customer.id}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {customer.email || "-"}
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {customer.phone || "-"}
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {customer.address || "-"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                            customer.status
                          )}`}
                        >
                          {customer.status}
                        </span>
                      </td>
                      <td className="rounded-r-xl px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEditMode(customer)}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomer(customer.id)}
                            disabled={deletingId === customer.id}
                            className="rounded-lg border border-rose-700 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-950/40 disabled:opacity-60"
                          >
                            {deletingId === customer.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
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