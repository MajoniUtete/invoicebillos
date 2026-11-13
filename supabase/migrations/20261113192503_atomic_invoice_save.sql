-- STAGED: deploy together with the RPC-based frontend after release verification.
-- This revokes legacy multi-request writes and must not precede the frontend release.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
CREATE TABLE private.invoice_save_requests (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  payload jsonb NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,request_id)
);
REVOKE ALL ON private.invoice_save_requests FROM PUBLIC, anon, authenticated;
ALTER TABLE private.invoice_save_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ADD COLUMN version bigint NOT NULL DEFAULT 1;
ALTER TABLE public.invoices ADD COLUMN tax_percent numeric(5,2);
ALTER TABLE public.invoices ADD COLUMN customer_snapshot jsonb;
ALTER TABLE public.invoices ADD COLUMN business_snapshot jsonb;
ALTER TABLE public.invoices DROP CONSTRAINT invoices_invoice_number_key;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_user_number_unique UNIQUE(user_id,invoice_number);

CREATE OR REPLACE FUNCTION public.set_invoice_item_line_total()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE currency_code text;
BEGIN
  SELECT currency INTO currency_code FROM public.invoices WHERE id=new.invoice_id;
  new.line_total := round(new.quantity*new.unit_price,CASE WHEN currency_code='JPY' THEN 0 ELSE 2 END);
  RETURN new;
END $$;

CREATE FUNCTION public.save_invoice(p_request_id uuid, p_invoice jsonb, p_items jsonb,
  p_invoice_id bigint DEFAULT NULL, p_expected_version bigint DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid(); payload jsonb; previous record; saved public.invoices;
  target_id bigint; item jsonb; qty numeric; price numeric; line numeric;
  sub numeric := 0; rate numeric; tax_amount numeric; reduction numeric;
  scale integer; currency_code text; customer bigint; result jsonb;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_request_id IS NULL OR jsonb_typeof(p_invoice) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid save request' USING ERRCODE='22023';
  END IF;
  payload := jsonb_build_object('invoice',p_invoice,'items',p_items,'id',p_invoice_id,'version',p_expected_version);
  -- Same-key requests serialize before checking the durable result, including after a lost response.
  PERFORM pg_advisory_xact_lock(hashtextextended(actor::text||':'||p_request_id::text,0));
  SELECT * INTO previous FROM private.invoice_save_requests WHERE user_id=actor AND request_id=p_request_id;
  IF FOUND THEN
    IF previous.payload <> payload THEN RAISE EXCEPTION 'Retry key reused with different content' USING ERRCODE='22023'; END IF;
    RETURN previous.response;
  END IF;
  IF jsonb_array_length(p_items) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Use 1 to 200 line items' USING ERRCODE='22023'; END IF;
  currency_code := p_invoice->>'currency';
  IF currency_code IS NULL OR currency_code <> ALL(ARRAY['USD','EUR','GBP','ZAR','NGN','KES','GHS','EGP','AED','SAR','INR','CNY','JPY','CAD','AUD','CHF','SEK','NOK','DKK','NZD','SGD','HKD','BRL','MXN','TRY','ZiG']) THEN
    RAISE EXCEPTION 'Unsupported currency' USING ERRCODE='22023';
  END IF;
  scale := CASE WHEN currency_code='JPY' THEN 0 ELSE 2 END;
  IF coalesce(p_invoice->>'tax_percent','') !~ '^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$'
    OR coalesce(p_invoice->>'discount','') !~ '^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$' THEN
    RAISE EXCEPTION 'Invalid tax or discount' USING ERRCODE='22023';
  END IF;
  rate := (p_invoice->>'tax_percent')::numeric;
  reduction := (p_invoice->>'discount')::numeric;
  IF rate > 100 OR reduction <> round(reduction,scale) THEN RAISE EXCEPTION 'Invalid tax or currency precision' USING ERRCODE='22023'; END IF;
  IF nullif(btrim(p_invoice->>'invoice_number'),'') IS NULL THEN RAISE EXCEPTION 'Invoice number required' USING ERRCODE='22023'; END IF;
  IF coalesce(p_invoice->>'status','') NOT IN ('Draft','Pending') THEN RAISE EXCEPTION 'Invalid invoice status' USING ERRCODE='22023'; END IF;
  IF nullif(p_invoice->>'issue_date','') IS NULL OR nullif(p_invoice->>'due_date','') IS NULL
    OR (p_invoice->>'due_date')::date < (p_invoice->>'issue_date')::date THEN
    RAISE EXCEPTION 'Issue date and valid due date required' USING ERRCODE='22023';
  END IF;
  customer := (p_invoice->>'customer_id')::bigint;
  -- Explicit ownership checks are mandatory because this narrow RPC is a definer.
  IF customer IS NULL OR NOT EXISTS(SELECT 1 FROM public.customers WHERE id=customer AND user_id=actor) THEN
    RAISE EXCEPTION 'Customer unavailable' USING ERRCODE='42501';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF nullif(btrim(item->>'item_name'),'') IS NULL
      OR coalesce(item->>'quantity','') !~ '^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$'
      OR coalesce(item->>'unit_price','') !~ '^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$' THEN
      RAISE EXCEPTION 'Invalid line item' USING ERRCODE='22023';
    END IF;
    qty := (item->>'quantity')::numeric; price := (item->>'unit_price')::numeric;
    IF qty <= 0 OR qty > 9999999999.99 OR price > 9999999999.99 OR price <> round(price,scale) THEN
      RAISE EXCEPTION 'Invalid quantity or currency precision' USING ERRCODE='22023';
    END IF;
    line := round(qty*price,scale);
    sub := sub+line;
  END LOOP;
  tax_amount := round(sub*rate/100,scale);
  IF sub > 9999999999.99 OR tax_amount > 9999999999.99 OR reduction > sub+tax_amount OR sub+tax_amount-reduction > 9999999999.99 THEN
    RAISE EXCEPTION 'Discount or total out of range' USING ERRCODE='22023';
  END IF;
  IF p_invoice_id IS NULL THEN
    IF p_expected_version IS NOT NULL THEN RAISE EXCEPTION 'Unexpected version' USING ERRCODE='22023'; END IF;
    INSERT INTO public.invoices(user_id,invoice_number,customer_id,currency,issue_date,due_date,status,notes,payment_terms,tax_percent)
    VALUES(actor,btrim(p_invoice->>'invoice_number'),customer,currency_code,(p_invoice->>'issue_date')::date,
      (p_invoice->>'due_date')::date,p_invoice->>'status',p_invoice->>'notes',p_invoice->>'payment_terms',rate)
    RETURNING id INTO target_id;
  ELSE
    SELECT * INTO saved FROM public.invoices WHERE id=p_invoice_id AND user_id=actor FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invoice unavailable' USING ERRCODE='42501'; END IF;
    IF saved.version IS DISTINCT FROM p_expected_version THEN RAISE EXCEPTION 'Invoice changed; reload before saving' USING ERRCODE='40001'; END IF;
    IF saved.status <> 'Draft' THEN RAISE EXCEPTION 'Issued invoices require a revision workflow' USING ERRCODE='22023'; END IF;
    target_id := saved.id;
    -- Clear the old discount before replacing lines, avoiding transient clamped totals.
    UPDATE public.invoices SET discount=0,tax=0,currency=currency_code WHERE id=target_id;
    DELETE FROM public.invoice_items WHERE invoice_id=target_id AND user_id=actor;
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.invoice_items(user_id,invoice_id,item_name,description,quantity,unit_price)
    VALUES(actor,target_id,btrim(item->>'item_name'),item->>'description',(item->>'quantity')::numeric,(item->>'unit_price')::numeric);
  END LOOP;
  UPDATE public.invoices SET invoice_number=btrim(p_invoice->>'invoice_number'),customer_id=customer,currency=currency_code,
    issue_date=(p_invoice->>'issue_date')::date,due_date=(p_invoice->>'due_date')::date,status=p_invoice->>'status',
    notes=p_invoice->>'notes',payment_terms=p_invoice->>'payment_terms',subtotal=sub,tax=tax_amount,discount=reduction,
    tax_percent=rate,
    customer_snapshot=(SELECT jsonb_build_object('name',name,'email',email,'phone',phone,'address',address) FROM public.customers WHERE id=customer AND user_id=actor),
    business_snapshot=(SELECT jsonb_build_object('business_name',business_name,'email',email,'phone',phone,'address',address) FROM public.profiles WHERE id=actor),
    version=CASE WHEN p_invoice_id IS NULL THEN 1 ELSE version+1 END
    WHERE id=target_id RETURNING * INTO saved;
  result := jsonb_build_object('id',saved.id::text,'version',saved.version,'total',saved.total::text);
  INSERT INTO private.invoice_save_requests(user_id,request_id,payload,response) VALUES(actor,p_request_id,payload,result);
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.save_invoice(uuid,jsonb,jsonb,bigint,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_invoice(uuid,jsonb,jsonb,bigint,bigint) TO authenticated;
-- Prevent alternate clients from bypassing atomic validation and document immutability.
REVOKE INSERT, UPDATE, DELETE ON public.invoices,public.invoice_items FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.change_invoice_state(p_invoice_id bigint,p_expected_version bigint,p_status text DEFAULT NULL,p_delete boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); saved public.invoices;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT * INTO saved FROM public.invoices WHERE id=p_invoice_id AND user_id=actor FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invoice unavailable' USING ERRCODE='42501'; END IF;
 IF saved.version IS DISTINCT FROM p_expected_version THEN RAISE EXCEPTION 'Invoice changed; reload' USING ERRCODE='40001'; END IF;
 IF p_delete THEN
   IF saved.status<>'Draft' THEN RAISE EXCEPTION 'Only drafts may be deleted' USING ERRCODE='22023'; END IF;
   DELETE FROM public.invoices WHERE id=saved.id;
   RETURN;
 END IF;
 IF p_status IS NULL OR NOT (
   (saved.status='Draft' AND p_status IN ('Pending','Cancelled')) OR
   (saved.status IN ('Pending','Partially Paid','Overdue') AND p_status IN ('Paid','Partially Paid','Overdue','Cancelled'))
 ) THEN RAISE EXCEPTION 'Invalid status transition' USING ERRCODE='22023'; END IF;
 UPDATE public.invoices SET status=p_status,version=version+1 WHERE id=saved.id;
END $$;
REVOKE ALL ON FUNCTION public.change_invoice_state(bigint,bigint,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.change_invoice_state(bigint,bigint,text,boolean) TO authenticated;
