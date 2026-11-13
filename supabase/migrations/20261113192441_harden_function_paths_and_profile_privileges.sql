-- Reviewed against the nine deployed invoker functions. No body/owner changes.
ALTER FUNCTION public.set_updated_at() SET search_path = '';
ALTER FUNCTION public.set_invoice_total() SET search_path = '';
ALTER FUNCTION public.set_invoice_item_line_total() SET search_path = '';
ALTER FUNCTION public.refresh_invoice_totals(bigint) SET search_path = '';
ALTER FUNCTION public.refresh_invoice_totals_from_items() SET search_path = '';
ALTER FUNCTION public.set_receipt_total() SET search_path = '';
ALTER FUNCTION public.set_receipt_item_line_total() SET search_path = '';
ALTER FUNCTION public.refresh_receipt_totals(bigint) SET search_path = '';
ALTER FUNCTION public.refresh_receipt_totals_from_items() SET search_path = '';

-- RLS does not govern TRUNCATE; no client requires these administrative grants.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.customers, public.profiles,
  public.invoices, public.invoice_items, public.receipts, public.receipt_items
  FROM PUBLIC, anon, authenticated;
-- Anonymous visitors have no financial-data workflow.
REVOKE ALL ON public.customers, public.profiles, public.invoices,
  public.invoice_items, public.receipts, public.receipt_items FROM anon;
-- Ownership RLS remains unchanged; billing fields are server-managed.
REVOKE INSERT, UPDATE ON public.profiles FROM PUBLIC, authenticated;
GRANT INSERT (id, business_name, email, phone, address, default_currency,
  default_notes, default_payment_terms, updated_at),
  UPDATE (id, business_name, email, phone, address, default_currency,
  default_notes, default_payment_terms, updated_at)
  ON public.profiles TO authenticated;
