import test from "node:test";
import assert from "node:assert/strict";
import { assertLocalTestOrigin } from "../../scripts/local-test-origin.mjs";

test("local E2E accepts loopback and explicit own-LAN minimal backend only", () => {
  assertLocalTestOrigin({ API_URL: "http://127.0.0.1:54321" });
  const c = { API_URL: "http://192.168.32.101:54321", MODE: "minimal", DB_CONTAINER: "invoicebillos-dev-db" };
  const interfaces = { en0: [{ address: "192.168.32.101", internal: false }] };
  assertLocalTestOrigin(c, c.API_URL, interfaces);
  assert.throws(() => assertLocalTestOrigin(c, null, interfaces));
  assert.throws(() => assertLocalTestOrigin(c, c.API_URL, {}));
  for (const API_URL of ["https://example.supabase.co", "http://8.8.8.8:54321", "http://192.168.32.101:54321/path", "http://user:pass@192.168.32.101:54321"]) {
    assert.throws(() => assertLocalTestOrigin({ ...c, API_URL }, API_URL, interfaces));
  }
  assert.throws(() => assertLocalTestOrigin({ ...c, MODE: "hosted" }, c.API_URL, interfaces));
});
