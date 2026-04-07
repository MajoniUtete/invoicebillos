"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

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

type ProfileForm = {
  business_name: string;
  email: string;
  phone: string;
  address: string;
  default_currency: string;
  default_notes: string;
  default_payment_terms: string;
};

const CURRENCY_OPTIONS = [
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "ZAR", label: "South African Rand" },
  { code: "NGN", label: "Nigerian Naira" },
  { code: "KES", label: "Kenyan Shilling" },
  { code: "GHS", label: "Ghanaian Cedi" },
  { code: "EGP", label: "Egyptian Pound" },
  { code: "AED", label: "UAE Dirham" },
  { code: "SAR", label: "Saudi Riyal" },
  { code: "INR", label: "Indian Rupee" },
  { code: "CNY", label: "Chinese Yuan" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "CHF", label: "Swiss Franc" },
  { code: "SEK", label: "Swedish Krona" },
  { code: "NOK", label: "Norwegian Krone" },
  { code: "DKK", label: "Danish Krone" },
  { code: "NZD", label: "New Zealand Dollar" },
  { code: "SGD", label: "Singapore Dollar" },
  { code: "HKD", label: "Hong Kong Dollar" },
  { code: "BRL", label: "Brazilian Real" },
  { code: "MXN", label: "Mexican Peso" },
  { code: "TRY", label: "Turkish Lira" },
  { code: "ZiG", label: "Zimbabwe Gold" },
];

const emptyForm: ProfileForm = {
  business_name: "",
  email: "",
  phone: "",
  address: "",
  default_currency: "EUR",
  default_notes: "Thank you for your business.",
  default_payment_terms: "Payment due within 14 days.",
};

async function fetchCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("You must be logged in.");

  return user.id;
}

export default function SettingsPage() {
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        const currentUserId = await fetchCurrentUserId();
        setUserId(currentUserId);

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUserId)
          .maybeSingle();

        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }

        if (data) {
          const profile = data as Profile;
          setForm({
            business_name: profile.business_name ?? "",
            email: profile.email ?? "",
            phone: profile.phone ?? "",
            address: profile.address ?? "",
            default_currency: profile.default_currency ?? "EUR",
            default_notes:
              profile.default_notes ?? "Thank you for your business.",
            default_payment_terms:
              profile.default_payment_terms ?? "Payment due within 14 days.",
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile.");
      }

      setLoading(false);
    }

    loadProfile();
  }, []);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!userId) {
      setError("You must be logged in.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      business_name: form.business_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      default_currency: form.default_currency,
      default_notes: form.default_notes.trim() || null,
      default_payment_terms: form.default_payment_terms.trim() || null,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setSuccess("Profile saved successfully.");
    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-10 md:px-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-emerald-300">
            InvoiceBillos Settings
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            Business profile
          </h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Save your company details here so invoices and PDFs can use your own
            business information instead of demo details.
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
            {success}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
            Loading profile...
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Business name
                </label>
                <input
                  type="text"
                  name="business_name"
                  value={form.business_name}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                  placeholder="Your business name"
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
                  placeholder="you@business.com"
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
                  placeholder="+358..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Default currency
                </label>
                <select
                  name="default_currency"
                  value={form.default_currency}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                >
                  {CURRENCY_OPTIONS.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} — {currency.label}
                    </option>
                  ))}
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
                  placeholder="Business address"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-slate-300">
                  Default notes
                </label>
                <textarea
                  name="default_notes"
                  value={form.default_notes}
                  onChange={handleChange}
                  rows={4}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                  placeholder="Default notes for invoices"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-slate-300">
                  Default payment terms
                </label>
                <textarea
                  name="default_payment_terms"
                  value={form.default_payment_terms}
                  onChange={handleChange}
                  rows={4}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                  placeholder="Payment terms"
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}