import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { Session } from "@supabase/supabase-js";
import { randomUUID } from "expo-crypto";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File } from "expo-file-system";
import { secureStorage, supabase } from "./lib/backend";
import { invoiceHtml } from "./lib/pdf.mjs";
import { calculateFormInvoice } from "../lib/finance/money.mjs";

type Customer = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
};
type Invoice = {
  id: number;
  invoice_number: string;
  total: string | number;
  currency: string;
  status: string;
};
type Line = {
  item_name: string;
  description: string;
  quantity: string;
  unit_price: string;
};
type Draft = {
  requestId: string;
  submitted: boolean;
  invoice_number: string;
  customer_id: string;
  currency: string;
  issue_date: string;
  due_date: string;
  tax_percent: string;
  discount: string;
  notes: string;
  payment_terms: string;
  lines: Line[];
};
const line = (): Line => ({
  item_name: "",
  description: "",
  quantity: "1",
  unit_price: "0",
});
const emptyDraft = (): Draft => ({
  requestId: randomUUID(),
  submitted: false,
  invoice_number: `INV-${randomUUID()}`,
  customer_id: "",
  currency: "EUR",
  issue_date: new Date().toISOString().slice(0, 10),
  due_date: "",
  tax_percent: "0",
  discount: "0",
  notes: "",
  payment_terms: "",
  lines: [line()],
});
const emptyCustomer = () => ({
  id: null as number | null,
  name: "",
  email: "",
  phone: "",
  address: "",
  status: "Active",
});
const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : (error as { message?: string })?.message || "The operation failed.";

function Field({
  label,
  value,
  onChange,
  secure = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  secure?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={styles.input}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        autoCapitalize="none"
        editable={!disabled}
      />
    </View>
  );
}
export default function App() {
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (active) {
          setSession(data.session);
          setError(error?.message || "");
          setReady(true);
        }
      })
      .catch((error) => {
        if (active) {
          setError(errorMessage(error));
          setReady(true);
        }
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.safe}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {!ready ? (
            <Text>Opening secure storage…</Text>
          ) : session ? (
            <Workspace key={session.user.id} session={session} />
          ) : (
            <Login initialError={error} />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
function Login({ initialError }: { initialError: string }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(initialError),
    [busy, setBusy] = useState(false);
  async function login() {
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      setPassword("");
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>InvoiceBillos</Text>
      <Text>Sign in to your existing account.</Text>
      <Field label="Email" value={email} onChange={setEmail} />
      <Field label="Password" value={password} onChange={setPassword} secure />
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <Button
        title={busy ? "Signing in…" : "Sign in"}
        disabled={busy}
        onPress={login}
      />
      <Text>
        Use invoicebillos.com for account recovery and registration. Native
        CAPTCHA support requires configuration if CAPTCHA is enforced by the
        project.
      </Text>
    </ScrollView>
  );
}
function Workspace({ session }: { session: Session }) {
  const [tab, setTab] = useState<"invoices" | "customers" | "draft">(
    "invoices",
  );
  const [customers, setCustomers] = useState<Customer[]>([]),
    [invoices, setInvoices] = useState<Invoice[]>([]),
    [customer, setCustomer] = useState(emptyCustomer());
  const [draft, setDraft] = useState<Draft>(emptyDraft),
    [draftReady, setDraftReady] = useState(false),
    [draftStatus, setDraftStatus] = useState("Opening draft…");
  const [error, setError] = useState(""),
    [info, setInfo] = useState(""),
    [busy, setBusy] = useState(false);
  const latestDraft = useRef(draft),
    mounted = useRef(true),
    draftKey = `draft.${session.user.id}`;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    secureStorage
      .getItem(draftKey)
      .then((raw) => {
        if (!active) return;
        if (raw) {
          const stored = JSON.parse(raw) as Draft;
          if (
            !Array.isArray(stored.lines) ||
            !stored.requestId ||
            typeof stored.submitted !== "boolean"
          )
            throw new Error("Draft format is invalid");
          latestDraft.current = stored;
          setDraft(stored);
        }
        setDraftReady(true);
        setDraftStatus(
          raw ? "Draft recovered from secure storage" : "Ready for a new draft",
        );
      })
      .catch((error) => {
        if (active) {
          setError(errorMessage(error));
          setDraftStatus("Draft unavailable; existing data was preserved.");
        }
      });
    return () => {
      active = false;
    };
  }, [draftKey]);
  async function verify() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (data.user?.id !== session.user.id)
      throw new Error("Please sign in again.");
    return data.user.id;
  }
  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await task();
    } catch (error) {
      if (mounted.current) setError(errorMessage(error));
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function refresh() {
    await run(async () => {
      const id = await verify();
      const [c, i] = await Promise.all([
        supabase.from("customers").select("*").eq("user_id", id).order("name"),
        supabase
          .from("invoices")
          .select("id,invoice_number,total,currency,status")
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      if (c.error) throw c.error;
      if (i.error) throw i.error;
      if (!mounted.current) return;
      setCustomers(c.data ?? []);
      setInvoices(i.data ?? []);
      setInfo("Records refreshed.");
    });
  }
  function edit(next: Draft) {
    if (latestDraft.current.submitted) return;
    const changed = { ...next, requestId: randomUUID() };
    latestDraft.current = changed;
    setDraft(changed);
    setDraftStatus("Saving draft…");
    void secureStorage
      .setItem(draftKey, JSON.stringify(changed))
      .then(() => {
        if (mounted.current && latestDraft.current === changed)
          setDraftStatus("Draft saved securely on this device");
      })
      .catch((error) => {
        if (mounted.current) {
          setDraftStatus("Draft was not saved");
          setError(errorMessage(error));
        }
      });
  }
  function editField(
    field: keyof Omit<Draft, "lines" | "requestId" | "submitted">,
    value: string,
  ) {
    edit({ ...latestDraft.current, [field]: value });
  }
  function editLine(index: number, field: keyof Line, value: string) {
    edit({
      ...latestDraft.current,
      lines: latestDraft.current.lines.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    });
  }
  async function saveInvoice() {
    await run(async () => {
      if (!draftReady) throw new Error("Wait for draft recovery.");
      await verify();
      const current = latestDraft.current;
      calculateFormInvoice(
        current.lines.map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unit_price,
        })),
        current.tax_percent,
        current.discount,
        current.currency,
      );
      if (current.lines.some((item) => !item.item_name.trim()))
        throw new Error("Every line needs a name.");
      const pending = { ...current, submitted: true };
      await secureStorage.setItem(draftKey, JSON.stringify(pending));
      latestDraft.current = pending;
      setDraft(pending);
      setDraftStatus("Awaiting confirmation; retry preserves this request");
      const { requestId, submitted, lines, ...header } = pending;
      void submitted;
      const { error } = await supabase.rpc("save_invoice", {
        p_request_id: requestId,
        p_invoice: { ...header, status: "Draft" },
        p_items: lines,
      });
      if (error) {
        if (["22023", "42501", "23505"].includes(error.code)) {
          const editable = {
            ...pending,
            submitted: false,
            requestId: randomUUID(),
          };
          await secureStorage.setItem(draftKey, JSON.stringify(editable));
          latestDraft.current = editable;
          setDraft(editable);
        }
        throw error;
      }
      const fresh = emptyDraft();
      await secureStorage.setItem(draftKey, JSON.stringify(fresh));
      latestDraft.current = fresh;
      setDraft(fresh);
      setDraftStatus("Invoice saved; new draft ready");
      setInfo("Invoice saved. Refresh invoices to view it.");
      setTab("invoices");
    });
  }
  async function saveCustomer() {
    await run(async () => {
      const id = await verify();
      if (!customer.name.trim()) throw new Error("Customer name is required.");
      const values = {
        name: customer.name.trim(),
        email: customer.email.trim() || null,
        phone: customer.phone.trim() || null,
        address: customer.address.trim() || null,
        status: customer.status,
      };
      const result = customer.id
        ? await supabase
            .from("customers")
            .update(values)
            .eq("id", customer.id)
            .eq("user_id", id)
            .select("id")
            .single()
        : await supabase
            .from("customers")
            .insert({ ...values, user_id: id })
            .select("id")
            .single();
      if (result.error) throw result.error;
      setCustomer(emptyCustomer());
      setInfo("Customer saved. Refresh to update the list.");
    });
  }
  function deleteCustomer(item: Customer) {
    Alert.alert("Delete customer?", item.name, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          void run(async () => {
            const id = await verify();
            const { error } = await supabase
              .from("customers")
              .delete()
              .eq("id", item.id)
              .eq("user_id", id);
            if (error) throw error;
            setCustomers((rows) => rows.filter((row) => row.id !== item.id));
          }),
      },
    ]);
  }
  async function shareInvoice(row: Invoice) {
    await run(async () => {
      const id = await verify();
      const result = await supabase
        .from("invoices")
        .select("*")
        .eq("id", row.id)
        .eq("user_id", id)
        .single();
      if (result.error) throw result.error;
      const invoice = result.data;
      const [items, customer, profile] = await Promise.all([
        supabase
          .from("invoice_items")
          .select("*")
          .eq("invoice_id", row.id)
          .eq("user_id", id)
          .order("id"),
        invoice.customer_id
          ? supabase
              .from("customers")
              .select("*")
              .eq("id", invoice.customer_id)
              .eq("user_id", id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("profiles")
          .select("business_name,email,address,phone")
          .eq("id", id)
          .maybeSingle(),
      ]);
      if (items.error) throw items.error;
      if (customer.error) throw customer.error;
      if (profile.error) throw profile.error;
      if (!(await Sharing.isAvailableAsync()))
        throw new Error("Sharing is unavailable on this device.");
      const { uri } = await Print.printToFileAsync({
        html: invoiceHtml(
          invoice,
          items.data,
          invoice.customer_snapshot ?? customer.data,
          invoice.business_snapshot ?? profile.data,
        ),
      });
      try {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
          dialogTitle: `Invoice ${row.invoice_number}`,
        });
      } finally {
        try {
          new File(uri).delete();
        } catch {
          /* Best-effort temporary-file cleanup. */
        }
      }
    });
  }
  let total = "—";
  try {
    total = calculateFormInvoice(
      draft.lines.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.unit_price,
      })),
      draft.tax_percent,
      draft.discount,
      draft.currency,
    ).total;
  } catch {
    /* Incomplete drafts have no total. */
  }
  const locked = !draftReady || busy || draft.submitted;
  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>InvoiceBillos</Text>
        <Button
          title="Sign out"
          disabled={busy}
          onPress={() =>
            void run(async () => {
              const { error } = await supabase.auth.signOut({ scope: "local" });
              if (error) throw error;
            })
          }
        />
      </View>
      <Text>{session.user.email}</Text>
      <View style={styles.nav}>
        {(["invoices", "customers", "draft"] as const).map((item) => (
          <Button
            key={item}
            title={item === "draft" ? "New invoice" : item}
            disabled={busy || tab === item}
            onPress={() => setTab(item)}
          />
        ))}
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {!!error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
        {!!info && <Text accessibilityLiveRegion="polite">{info}</Text>}
        {tab !== "draft" && (
          <Button
            title={busy ? "Working…" : "Refresh records"}
            disabled={busy}
            onPress={refresh}
          />
        )}
        {tab === "invoices" && (
          <>
            <Text style={styles.heading}>Invoices</Text>
            {!invoices.length && (
              <Text>Refresh to load invoices. Network access is required.</Text>
            )}
            {invoices.map((invoice) => (
              <View key={invoice.id} style={styles.card}>
                <Text style={styles.heading}>{invoice.invoice_number}</Text>
                <Text>
                  {invoice.currency} {invoice.total} · {invoice.status}
                </Text>
                <Button
                  title="Generate PDF and share"
                  disabled={busy}
                  onPress={() => shareInvoice(invoice)}
                />
              </View>
            ))}
          </>
        )}
        {tab === "customers" && (
          <>
            <Text style={styles.heading}>
              {customer.id ? "Edit customer" : "Add customer"}
            </Text>
            {(["name", "email", "phone", "address"] as const).map((field) => (
              <Field
                key={field}
                label={field}
                value={customer[field]}
                onChange={(value) =>
                  setCustomer({ ...customer, [field]: value })
                }
                disabled={busy}
              />
            ))}
            <Button
              title="Save customer"
              disabled={busy}
              onPress={saveCustomer}
            />
            {!!customer.id && (
              <Button
                title="Cancel edit"
                onPress={() => setCustomer(emptyCustomer())}
              />
            )}
            <Text style={styles.heading}>Customers</Text>
            {customers.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text>{item.name}</Text>
                <Text>{item.email}</Text>
                <View style={styles.nav}>
                  <Button
                    title="Edit"
                    disabled={busy}
                    onPress={() =>
                      setCustomer({
                        id: item.id,
                        name: item.name,
                        email: item.email ?? "",
                        phone: item.phone ?? "",
                        address: item.address ?? "",
                        status: item.status,
                      })
                    }
                  />
                  <Button
                    title="Delete"
                    color="#b91c1c"
                    disabled={busy}
                    onPress={() => deleteCustomer(item)}
                  />
                </View>
              </View>
            ))}
          </>
        )}
        {tab === "draft" && (
          <>
            <Text style={styles.heading}>Invoice draft</Text>
            <Text accessibilityLiveRegion="polite">{draftStatus}</Text>
            <Text>
              One draft per account is retained in secure storage on this device
              after sign-out. Publishing requires a connection.
            </Text>
            <Button
              title="Save local draft now"
              disabled={!draftReady || busy}
              onPress={() =>
                void run(async () => {
                  await secureStorage.setItem(
                    draftKey,
                    JSON.stringify(latestDraft.current),
                  );
                  setDraftStatus("Draft saved securely on this device");
                })
              }
            />
            {(
              [
                "invoice_number",
                "currency",
                "issue_date",
                "due_date",
                "tax_percent",
                "discount",
                "notes",
                "payment_terms",
              ] as const
            ).map((field) => (
              <Field
                key={field}
                label={field.replaceAll("_", " ")}
                value={draft[field]}
                onChange={(value) => editField(field, value)}
                disabled={locked}
              />
            ))}
            <Text style={styles.heading}>Customer</Text>
            <Text>
              {customers.find((item) => String(item.id) === draft.customer_id)
                ?.name || "Refresh customer records to choose a customer"}
            </Text>
            {customers.map((item) => (
              <Button
                key={item.id}
                title={`${String(item.id) === draft.customer_id ? "✓ " : ""}${item.name}`}
                disabled={locked}
                onPress={() => editField("customer_id", String(item.id))}
              />
            ))}
            <Text style={styles.heading}>Line items</Text>
            {draft.lines.map((item, index) => (
              <View key={index} style={styles.card}>
                {(
                  [
                    "item_name",
                    "description",
                    "quantity",
                    "unit_price",
                  ] as const
                ).map((field) => (
                  <Field
                    key={field}
                    label={`Line ${index + 1} ${field.replaceAll("_", " ")}`}
                    value={item[field]}
                    onChange={(value) => editLine(index, field, value)}
                    disabled={locked}
                  />
                ))}
                <Button
                  title="Remove line"
                  disabled={locked || draft.lines.length === 1}
                  onPress={() =>
                    edit({
                      ...draft,
                      lines: draft.lines.filter((_, i) => i !== index),
                    })
                  }
                />
              </View>
            ))}
            <Button
              title="Add line"
              disabled={locked || draft.lines.length >= 200}
              onPress={() =>
                edit({ ...draft, lines: [...draft.lines, line()] })
              }
            />
            <Text style={styles.heading}>
              Total {draft.currency} {total}
            </Text>
            <Button
              title={
                busy
                  ? "Saving…"
                  : draft.submitted
                    ? "Retry invoice save"
                    : "Save invoice to account"
              }
              disabled={!draftReady || busy}
              onPress={saveInvoice}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
    flexWrap: "wrap",
  },
  content: { padding: 20, paddingBottom: 48, gap: 12 },
  title: { fontSize: 26, fontWeight: "700", color: "#0f172a" },
  heading: { fontSize: 19, fontWeight: "600", marginTop: 12, color: "#0f172a" },
  field: { gap: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#0f172a",
  },
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    gap: 8,
    backgroundColor: "#fff",
  },
  error: { color: "#b91c1c", padding: 12, backgroundColor: "#fef2f2" },
});
