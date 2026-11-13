import { assertLocalTestOrigin } from "./local-test-origin.mjs";
process.on("uncaughtException", (error) => {
  console.error(
    "FAIL:",
    String(error.message)
      .split("\n")[0]
      .replace(/https?:\/\/\S+/g, "[URL redacted]"),
  );
  process.exit(1);
});
/** Genuine local Auth + PostgREST tests. Never accepts a production URL. */
import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { completeRecovery, recoveryRedirect } from "../mobile/lib/recovery.mjs";
const config = JSON.parse(
  fs.readFileSync(new URL("../dev/backend.local.json", import.meta.url)),
);
assertLocalTestOrigin(config);
const key = config.PUBLISHABLE_KEY || config.ANON_KEY;
let dropResponse = false;
function client() {
  return createClient(config.API_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false, flowType: "pkce" },
    global: {
      fetch: async (url, options) => {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(15000),
        });
        if (dropResponse && String(url).includes("/rpc/save_invoice")) {
          dropResponse = false;
          throw new TypeError("Injected response loss after commit");
        }
        return response;
      },
    },
  });
}
const admin = createClient(config.API_URL, config.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function mailLink(email, subject) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const list = await fetch("http://127.0.0.1:54324/api/v1/messages").then(
      (r) => r.json(),
    );
    const item = list.messages?.find(
      (m) =>
        m.To?.some((to) => to.Address === email) &&
        (!subject || m.Subject.toLowerCase().includes(subject)),
    );
    if (item) {
      const details = await fetch(
        `http://127.0.0.1:54324/api/v1/message/${item.ID}`,
      ).then((r) => r.json());
      const html = details.HTML || details.Text || "";
      const links = [...html.matchAll(/https?:[^\s"<>]+/g)].map((m) =>
        m[0].replaceAll("&amp;", "&"),
      );
      const link = links.find((link) => link.includes("/auth/v1/verify"));
      if (link) return link;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Local confirmation email was not captured");
}
async function follow(link) {
  assert.equal(new URL(link).host, new URL(config.API_URL).host);
  const result = await fetch(link, { redirect: "manual" });
  assert.ok([302, 303].includes(result.status));
  return result.headers.get("location");
}
const accounts = [0, 1].map(() => ({
  email: `qa-${randomUUID()}@example.test`,
  password: `Qa!${randomUUID()}`,
  id: null,
}));
const [a, b] = [client(), client()];
let succeeded = false;
const check = (label) => console.log(`PASS: ${label}`);
try {
  for (const [i, c] of [a, b].entries()) {
    const user = accounts[i];
    const signup = await c.auth.signUp({
      email: user.email,
      password: user.password,
    });
    assert.ifError(signup.error);
    user.id = signup.data.user.id;
    assert.equal(signup.data.session, null);
    assert.ok(
      (await c.auth.signInWithPassword(user)).error,
      "Unconfirmed email cannot log in",
    );
    const location = await follow(await mailLink(user.email, "confirm"));
    const code = new URL(location).searchParams.get("code");
    assert.ok(code);
    assert.ifError((await c.auth.exchangeCodeForSession(code)).error);
    assert.ifError((await c.auth.signOut()).error);
    assert.ifError((await c.auth.signInWithPassword(user)).error);
  }
  check("two genuine signups, email confirmation and password login");
  const customers = [];
  for (const [c, user] of [
    [a, accounts[0]],
    [b, accounts[1]],
  ]) {
    assert.ifError(
      (
        await c
          .from("profiles")
          .insert({ id: user.id, business_name: "QA Business" })
      ).error,
    );
    const result = await c
      .from("customers")
      .insert({ user_id: user.id, name: `QA ${user.id}`, email: user.email })
      .select()
      .single();
    assert.ifError(result.error);
    customers.push(result.data);
  }
  assert.deepEqual(
    (await b.from("customers").select("*").eq("id", customers[0].id)).data,
    [],
  );
  assert.deepEqual(
    (await b.from("customers").delete().eq("id", customers[0].id).select())
      .data,
    [],
  );
  assert.ok(
    (
      await b
        .from("customers")
        .insert({ user_id: accounts[0].id, name: "Forbidden owner" })
    ).error,
  );
  assert.ok(
    (
      await b
        .from("customers")
        .update({ name: "forbidden" })
        .eq("id", customers[0].id)
        .select()
        .single()
    ).error,
  );
  assert.ok(
    (
      await a
        .from("profiles")
        .update({ subscription_status: "active" })
        .eq("id", accounts[0].id)
    ).error,
  );
  check("real JWT account isolation and billing-column denial");
  const header = {
    invoice_number: `QA-${randomUUID()}`,
    customer_id: customers[0].id,
    currency: "EUR",
    issue_date: "2026-11-13",
    due_date: "2026-11-27",
    tax_percent: "25.50",
    discount: "2.00",
    status: "Draft",
    notes: "QA",
    payment_terms: "14 days",
  };
  const lines = [{ item_name: "Service", quantity: "3", unit_price: "19.99" }];
  const created = await a.rpc("save_invoice", {
    p_request_id: randomUUID(),
    p_invoice: header,
    p_items: lines,
  });
  assert.ifError(created.error);
  assert.equal(created.data.total, "73.26");
  const id = created.data.id;
  assert.deepEqual(
    (await b.from("invoices").select("*").eq("id", id)).data,
    [],
  );
  assert.deepEqual(
    (await b.from("invoice_items").select("*").eq("invoice_id", id)).data,
    [],
  );
  assert.ok(
    (
      await b.rpc("save_invoice", {
        p_request_id: randomUUID(),
        p_invoice: header,
        p_items: lines,
      })
    ).error,
  );
  assert.ok(
    (
      await b.rpc("save_invoice", {
        p_request_id: randomUUID(),
        p_invoice: { ...header, customer_id: customers[1].id },
        p_items: lines,
        p_invoice_id: id,
        p_expected_version: 1,
      })
    ).error,
  );
  const edited = await a.rpc("save_invoice", {
    p_request_id: randomUUID(),
    p_invoice: { ...header, tax_percent: "0", discount: "0" },
    p_items: [{ item_name: "Fraction", quantity: "1.25", unit_price: "0.10" }],
    p_invoice_id: id,
    p_expected_version: 1,
  });
  assert.ifError(edited.error);
  assert.equal(edited.data.total, "0.13");
  const conflict = await a.rpc("save_invoice", {
    p_request_id: randomUUID(),
    p_invoice: header,
    p_items: lines,
    p_invoice_id: id,
    p_expected_version: 1,
  });
  assert.equal(conflict.error?.code, "PT409");
  check(
    "atomic creation/edit, exact totals, cross-account RPC denial and stale edit rejection",
  );
  for (const currency of [
    "USD",
    "EUR",
    "GBP",
    "ZAR",
    "NGN",
    "KES",
    "GHS",
    "EGP",
    "AED",
    "SAR",
    "INR",
    "CNY",
    "JPY",
    "CAD",
    "AUD",
    "CHF",
    "SEK",
    "NOK",
    "DKK",
    "NZD",
    "SGD",
    "HKD",
    "BRL",
    "MXN",
    "TRY",
    "ZiG",
  ]) {
    const result = await a.rpc("save_invoice", {
      p_request_id: randomUUID(),
      p_invoice: {
        ...header,
        invoice_number: `QA-${randomUUID()}`,
        currency,
        tax_percent: "0",
        discount: "0",
      },
      p_items: [
        {
          item_name: "Precision",
          quantity: "1.50",
          unit_price: currency === "JPY" ? "101" : "0.10",
        },
      ],
    });
    assert.ifError(result.error);
    assert.equal(Number(result.data.total), currency === "JPY" ? 152 : 0.15);
  }
  check("all 26 currencies via real API, including JPY precision");
  const failedNumber = `QA-failed-${randomUUID()}`;
  assert.ok(
    (
      await a.rpc("save_invoice", {
        p_request_id: randomUUID(),
        p_invoice: { ...header, invoice_number: failedNumber },
        p_items: [],
      })
    ).error,
  );
  assert.deepEqual(
    (await a.from("invoices").select("id").eq("invoice_number", failedNumber))
      .data,
    [],
  );
  const retryNumber = `QA-retry-${randomUUID()}`,
    retryArgs = {
      p_request_id: randomUUID(),
      p_invoice: { ...header, invoice_number: retryNumber },
      p_items: lines,
    };
  dropResponse = true;
  assert.ok((await a.rpc("save_invoice", retryArgs)).error);
  assert.ifError((await a.rpc("save_invoice", retryArgs)).error);
  assert.equal(
    (await a.from("invoices").select("id").eq("invoice_number", retryNumber))
      .data.length,
    1,
  );
  check(
    "failed creation leaves no header; lost committed response retries without duplicate",
  );
  for (const [version, status] of [
    [2, "Pending"],
    [3, "Paid"],
  ])
    assert.ifError(
      (
        await a.rpc("change_invoice_state", {
          p_invoice_id: id,
          p_expected_version: version,
          p_status: status,
        })
      ).error,
    );
  assert.ok(
    (
      await a.rpc("change_invoice_state", {
        p_invoice_id: id,
        p_expected_version: 4,
        p_delete: true,
      })
    ).error,
  );
  check("draft issuance, paid status and issued deletion lock");
  const before = (await b.auth.getSession()).data.session;
  const refreshed = await b.auth.refreshSession();
  assert.ifError(refreshed.error);
  assert.ok(
    refreshed.data.session.refresh_token !== before.refresh_token,
    "Refresh token rotation failed",
  );
  const revoked = refreshed.data.session.refresh_token;
  assert.ifError((await b.auth.signOut({ scope: "global" })).error);
  assert.equal((await b.auth.getSession()).data.session, null);
  const old = await fetch(
    config.API_URL + "/auth/v1/token?grant_type=refresh_token",
    {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: revoked }),
    },
  );
  assert.ok(!old.ok);
  check("session refresh, logout clearing and revoked refresh-token rejection");
  assert.ifError(
    (
      await a.auth.resetPasswordForEmail(accounts[0].email, {
        redirectTo: recoveryRedirect,
      })
    ).error,
  );
  const recoveryURL = await follow(await mailLink(accounts[0].email, "reset"));
  assert.ok(recoveryURL.startsWith(recoveryRedirect));
  await completeRecovery(recoveryURL, a.auth);
  await assert.rejects(
    completeRecovery(recoveryURL, a.auth),
    /verification failed/,
  );
  const changed = `Changed!${randomUUID()}`;
  assert.ifError((await a.auth.updateUser({ password: changed })).error);
  assert.ifError((await a.auth.signOut({ scope: "global" })).error);
  assert.ok((await a.auth.signInWithPassword(accounts[0])).error);
  accounts[0].password = changed;
  assert.ifError((await a.auth.signInWithPassword(accounts[0])).error);
  check(
    "real recovery email, native PKCE handler, password change and old-password denial",
  );
  fs.writeFileSync(
    new URL("../dev/accounts.local.json", import.meta.url),
    JSON.stringify({ accounts, invoiceId: id, customerId: customers[0].id }),
    { mode: 0o600 },
  );
  succeeded = true;
} finally {
  await Promise.all([a.auth.signOut(), b.auth.signOut()]);
  if (!succeeded || !process.argv.includes("--keep-fixtures"))
    for (const user of accounts)
      if (user.id) await admin.auth.admin.deleteUser(user.id);
}
