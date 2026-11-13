import test from "node:test";
import assert from "node:assert/strict";
import { invoiceHtml } from "../lib/pdf.mjs";
test("escapes all untrusted PDF fields and uses stored authoritative totals", () => {
  const html = invoiceHtml(
    {
      invoice_number: "<img src=x onerror=alert(1)>",
      total: "73.26",
      currency: "EUR",
    },
    [{ item_name: "<script>steal()</script>", line_total: "59.97" }],
    { name: "A & B" },
    null,
  );
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("A &amp; B"));
  assert.ok(html.includes("EUR 73.26"));
  assert.ok(html.includes("59.97"));
});
