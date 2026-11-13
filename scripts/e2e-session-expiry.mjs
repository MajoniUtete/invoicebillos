/** Waits for a genuinely issued JWT to expire; never creates or forges tokens. */
import fs from "node:fs";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
process.on("uncaughtException", (error) => {
  console.error(
    "FAIL:",
    String(error.message)
      .split("\n")[0]
      .replace(/https?:\/\/\S+/g, "[URL redacted]"),
  );
  process.exit(1);
});
const c = JSON.parse(
    fs.readFileSync(new URL("../dev/backend.local.json", import.meta.url)),
  ),
  u = JSON.parse(
    fs.readFileSync(new URL("../dev/accounts.local.json", import.meta.url)),
  ).accounts[1];
assert.equal(new URL(c.API_URL).hostname, "127.0.0.1");
const client = createClient(c.API_URL, c.PUBLISHABLE_KEY || c.ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const login = await client.auth.signInWithPassword(u);
assert.ifError(login.error);
const initial = login.data.session;
const wait = (initial.expires_at - Math.floor(Date.now() / 1000) + 2) * 1000;
assert.ok(
  wait > 0 && wait <= 310000,
  "Test backend must issue five-minute-or-shorter access tokens",
);
console.log(
  "Waiting for the genuine access token to expire; periodic refresh is disabled.",
);
await new Promise((resolve) => setTimeout(resolve, wait));
const response = await fetch(c.API_URL + "/rest/v1/customers?select=id", {
  headers: {
    apikey: c.PUBLISHABLE_KEY || c.ANON_KEY,
    Authorization: "Bearer " + initial.access_token,
  },
});
assert.equal(response.status, 401, "Expired access token must be rejected");
const refreshed = await client.auth.getSession();
assert.ifError(refreshed.error);
assert.ok(
  refreshed.data.session.access_token !== initial.access_token,
  "Expired session must rotate access token",
);
assert.ifError((await client.auth.getUser()).error);
await client.auth.signOut({ scope: "global" });
console.log(
  "PASS: real JWT expiry rejection and on-demand session refresh after expiry",
);
