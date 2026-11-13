export function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
}
/** Print stored server totals. Never recompute an issued document in the renderer. */
export function invoiceHtml(invoice, items, customer, profile) {
  const e = escapeHtml;
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial;padding:32px;color:#172033}table{width:100%;border-collapse:collapse}td,th{padding:10px;text-align:left;border-bottom:1px solid #ddd}h1{font-size:28px}p{white-space:pre-wrap}</style></head><body>
  <h1>Invoice ${e(invoice.invoice_number)}</h1><p>${e(profile?.business_name)}\n${e(profile?.address)}\n${e(profile?.email)}</p>
  <p>Bill to: ${e(customer?.name)}\n${e(customer?.address)}\n${e(customer?.email)}</p>
  <p>Issued ${e(invoice.issue_date)} · Due ${e(invoice.due_date)} · ${e(invoice.status)}</p>
  <table><tr><th>Item</th><th>Quantity</th><th>Unit price</th><th>Amount</th></tr>${items.map((item) => `<tr><td>${e(item.item_name)}<br>${e(item.description)}</td><td>${e(item.quantity)}</td><td>${e(item.unit_price)}</td><td>${e(item.line_total)}</td></tr>`).join("")}</table>
  <p>Subtotal ${e(invoice.currency)} ${e(invoice.subtotal)}\nTax ${e(invoice.tax)}\nDiscount ${e(invoice.discount)}</p>
  <h2>Total ${e(invoice.currency)} ${e(invoice.total)}</h2><p>${e(invoice.payment_terms)}\n${e(invoice.notes)}</p></body></html>`;
}
