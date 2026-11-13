process.on("uncaughtException", (error) => {
  console.error(
    "FAIL:",
    String(error.message)
      .split("\n")[0]
      .replace(/https?:\/\/\S+/g, "[URL redacted]"),
  );
  process.exit(1);
});
/** Browser end-to-end tests against the isolated backend. No traces or token-bearing URLs logged. */
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const config = JSON.parse(
  fs.readFileSync(new URL("../dev/backend.local.json", import.meta.url)),
);
assert.equal(new URL(config.API_URL).hostname, "127.0.0.1");
const fixtures = JSON.parse(
  fs.readFileSync(new URL("../dev/accounts.local.json", import.meta.url)),
);
const account = fixtures.accounts[0],
  other = fixtures.accounts[1];
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    if (
      (
        await fetch("http://127.0.0.1:3000/login", {
          signal: AbortSignal.timeout(2000),
        })
      ).ok
    )
      break;
  } catch {}
  await new Promise((r) => setTimeout(r, 500));
}
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext(),
  page = await context.newPage();
page.setDefaultTimeout(30000);
const origin = "http://127.0.0.1:3000";
const check = (label) => console.log(`PASS: ${label}`);
const api = createClient(
  config.API_URL,
  config.PUBLISHABLE_KEY || config.ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
async function login(user) {
  await page.goto(origin + "/login");
  await page.locator("input[type=email]").fill(user.email);
  await page.locator("input[type=password]").fill(user.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL("**/dashboard");
}
async function resetMail(email) {
  for (let i = 0; i < 40; i++) {
    const list = await fetch("http://127.0.0.1:54324/api/v1/messages").then(
      (r) => r.json(),
    );
    const item = list.messages.find(
      (m) =>
        m.Subject.toLowerCase().includes("reset") &&
        m.To.some((to) => to.Address === email),
    );
    if (item) {
      const m = await fetch(
        "http://127.0.0.1:54324/api/v1/message/" + item.ID,
      ).then((r) => r.json());
      const link = [...(m.HTML || m.Text).matchAll(/https?:[^\s"<>]+/g)]
        .map((m) => m[0].replaceAll("&amp;", "&"))
        .find((s) => s.includes("/auth/v1/verify"));
      if (link) return link;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Local reset email missing");
}
try {
  await login(account);
  check("browser genuine login");
  await page.reload();
  await page.getByRole("heading", { name: "Business overview" }).waitFor();
  assert.ok(
    (await context.cookies()).some((c) => c.name.includes("auth-token")),
  );
  check("session persists across reload");
  await page.goto(origin + "/invoices/new");
  await page
    .locator(
      'select[name=customerId] option[value="' + fixtures.customerId + '"]',
    )
    .waitFor({ state: "attached" });
  const number = "BROWSER-" + randomUUID();
  await page.locator("input[name=invoiceNumber]").fill(number);
  await page
    .locator("select[name=customerId]")
    .selectOption(String(fixtures.customerId));
  await page.locator("input[name=issueDate]").fill("2026-11-13");
  await page.locator("input[name=dueDate]").fill("2026-11-01");
  await page.getByPlaceholder("Website design").fill("Browser tested service");
  await page.locator("input[type=number]").nth(0).fill("1.25");
  await page.locator("input[type=number]").nth(1).fill("0.10");
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await page
    .getByText("Issue date and valid due date required", { exact: false })
    .waitFor();
  check("invalid dates produce a recoverable error");
  await page.locator("input[name=dueDate]").fill("2026-11-27");
  let lost = false;
  await page.route("**/rest/v1/rpc/save_invoice", async (route) => {
    if (!lost) {
      lost = true;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await page
    .getByRole("button", { name: "Save Draft", exact: true })
    .waitFor({ state: "visible" });
  await page
    .getByText(/fetch|network|Save failed/i)
    .first()
    .waitFor();
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await page
    .getByText(`Invoice ${number} saved successfully as Draft.`)
    .waitFor();
  await page.unroute("**/rest/v1/rpc/save_invoice");
  assert.ifError((await api.auth.signInWithPassword(account)).error);
  const invoice = await api
    .from("invoices")
    .select("*")
    .eq("invoice_number", number)
    .single();
  assert.ifError(invoice.error);
  assert.equal(Number(invoice.data.total), 0.13);
  check("browser create and lost-response retry create one exact invoice");
  await page.goto(origin + "/invoices/" + invoice.data.id);
  await page.getByRole("button", { name: "Edit Invoice" }).click();
  await page.locator("tbody input[type=number]").first().fill("2");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await page.getByText("Invoice updated successfully.").waitFor();
  assert.equal(
    Number(
      (
        await api
          .from("invoices")
          .select("total")
          .eq("id", invoice.data.id)
          .single()
      ).data.total,
    ),
    0.2,
  );
  check("browser invoice editing and atomic save");
  await page.evaluate(() => {
    window.__printed = false;
    window.print = () => {
      window.__printed = true;
    };
  });
  await page.getByRole("button", { name: "Download PDF" }).click();
  assert.equal(await page.evaluate(() => window.__printed), true);
  const pdf = await page.pdf({ format: "A4", printBackground: true });
  assert.ok(pdf.length > 1000);
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  check("print action and Chromium PDF rendering");
  await page.goto(origin + "/invoices");
  const row = page.locator("tr").filter({ hasText: number });
  await row.locator("select").selectOption("Pending");
  await page.getByText("Invoice status updated successfully.").waitFor();
  await page.goto(origin + "/invoices/" + invoice.data.id);
  assert.equal(
    await page.getByRole("button", { name: "Edit Invoice" }).isDisabled(),
    true,
  );
  check("browser issuance locks editing");
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await page.waitForURL("**/login**");
  assert.ok(
    !(await context.cookies()).some(
      (c) => c.name.includes("auth-token") && c.value,
    ),
  );
  await login(other);
  await page.goto(origin + "/invoices/" + invoice.data.id);
  await page
    .getByText(/not found|Cannot coerce|0 rows/i)
    .first()
    .waitFor();
  check("browser logout, account switch and foreign invoice denial");
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await page.waitForURL("**/login**");
  await page.goto(origin + "/forgot-password");
  await page.locator("input[type=email]").fill(account.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await page
    .getByText(/sent|check your email/i)
    .first()
    .waitFor();
  const link = await resetMail(account.email);
  await page.goto(link);
  await page.waitForURL("**/reset-password**");
  await page.locator("input[type=password]").first().waitFor();
  const nextPassword = "Browser!" + randomUUID();
  await page.locator("input[type=password]").nth(0).fill(nextPassword);
  await page.locator("input[type=password]").nth(1).fill(nextPassword);
  await page.getByRole("button", { name: "Update password" }).click();
  await page.waitForURL("**/login**");
  account.password = nextPassword;
  await login(account);
  check("browser recovery email, PKCE callback, password change and new login");
  fixtures.accounts[0] = account;
  fs.writeFileSync(
    new URL("../dev/accounts.local.json", import.meta.url),
    JSON.stringify(fixtures),
    { mode: 0o600 },
  );
} catch (error) {
  console.error("Browser failure path:", new URL(page.url()).pathname);
  console.error((await page.locator("body").innerText()).slice(-1000));
  throw error;
} finally {
  await api.auth.signOut();
  await context.close();
  await browser.close();
}
