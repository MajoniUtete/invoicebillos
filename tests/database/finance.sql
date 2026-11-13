-- Prepend the staged migration inside this transaction, then execute as postgres.
BEGIN;
CREATE TEMP TABLE finance_fixture AS SELECT gen_random_uuid() a,gen_random_uuid() b,
 -(1000000000000+floor(random()*1000000000000))::bigint customer_id;
GRANT SELECT ON finance_fixture TO authenticated;
INSERT INTO auth.users(id) SELECT a FROM finance_fixture UNION ALL SELECT b FROM finance_fixture;
INSERT INTO public.customers(id,user_id,name) SELECT customer_id,a,'Finance test' FROM finance_fixture;
CREATE FUNCTION pg_temp.reject_test_item() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF new.item_name='FAIL_AFTER_HEADER' THEN RAISE EXCEPTION 'Injected write failure' USING ERRCODE='P0002'; END IF; RETURN new; END $$;
CREATE TRIGGER finance_test_failure BEFORE INSERT ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_test_item();
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true) FROM finance_fixture;
SET LOCAL ROLE authenticated;
DO $$
DECLARE f record; header jsonb; lines jsonb; request uuid:=gen_random_uuid(); r jsonb; again jsonb; edited jsonb;
BEGIN
 SELECT * INTO f FROM finance_fixture;
 header:=jsonb_build_object('invoice_number','test-'||f.a,'customer_id',f.customer_id,'currency','EUR','issue_date','2026-11-13','due_date','2026-11-27','status','Draft','tax_percent','25.50','discount','2.00');
 lines:='[{"item_name":"Service","quantity":"3","unit_price":"19.99"}]'::jsonb;
 r:=public.save_invoice(request,header,lines);
 IF r->>'total' <> '73.26' THEN RAISE EXCEPTION 'Incorrect total: %',r; END IF;
 again:=public.save_invoice(request,header,lines);
 IF r<>again THEN RAISE EXCEPTION 'Retry did not return original response'; END IF;
 IF (SELECT count(*) FROM public.invoices WHERE invoice_number=header->>'invoice_number')<>1 THEN RAISE EXCEPTION 'Duplicate invoice'; END IF;
 BEGIN
  PERFORM public.save_invoice(request,header||'{"discount":"1"}',lines);
  RAISE EXCEPTION 'Changed retry accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN
  PERFORM public.save_invoice(gen_random_uuid(),header,lines);
  RAISE EXCEPTION 'Duplicate number accepted';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN
  PERFORM public.save_invoice(gen_random_uuid(),header||jsonb_build_object('invoice_number','failed-'||f.a),
    '[{"item_name":"FAIL_AFTER_HEADER","quantity":"1","unit_price":"10"}]');
  RAISE EXCEPTION 'Injected failure not raised';
 EXCEPTION WHEN no_data_found THEN NULL; END;
 IF EXISTS(SELECT 1 FROM public.invoices WHERE invoice_number='failed-'||f.a) THEN RAISE EXCEPTION 'Orphan after failure'; END IF;
 edited:=public.save_invoice(gen_random_uuid(),header||'{"tax_percent":"0","discount":"0"}',
   '[{"item_name":"Fractional","quantity":"1.25","unit_price":"0.10"}]',(r->>'id')::bigint,1);
 IF edited->>'total'<>'0.13' OR edited->>'version'<>'2' THEN RAISE EXCEPTION 'Edit failed: %',edited; END IF;
 BEGIN
  PERFORM public.save_invoice(gen_random_uuid(),header,lines,(r->>'id')::bigint,1);
  RAISE EXCEPTION 'Stale version accepted';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
 BEGIN
  UPDATE public.invoices SET total=0 WHERE id=(r->>'id')::bigint;
  RAISE EXCEPTION 'Direct write bypass allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.save_invoice(gen_random_uuid(),header||jsonb_build_object('invoice_number','invalid-'||f.a,'discount','999999999'),lines);
  RAISE EXCEPTION 'Excess discount accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN
  PERFORM public.save_invoice(gen_random_uuid(),header,'[]');
  RAISE EXCEPTION 'Empty invoice accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 -- Issue and freeze: financial edits require a separate revision workflow.
 PERFORM public.save_invoice(gen_random_uuid(),header||'{"status":"Pending"}',lines,(r->>'id')::bigint,2);
 BEGIN
  PERFORM public.save_invoice(gen_random_uuid(),header,lines,(r->>'id')::bigint,3);
  RAISE EXCEPTION 'Issued invoice edited';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 UPDATE public.customers SET name='Changed after issue' WHERE id=f.customer_id;
 IF (SELECT customer_snapshot->>'name' FROM public.invoices WHERE id=(r->>'id')::bigint) <> 'Finance test' THEN RAISE EXCEPTION 'Issued customer snapshot changed'; END IF;
 PERFORM public.change_invoice_state((r->>'id')::bigint,3,'Paid');
 BEGIN
  PERFORM public.change_invoice_state((r->>'id')::bigint,4,'Draft');
  RAISE EXCEPTION 'Paid invoice reverted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN
  PERFORM public.change_invoice_state((r->>'id')::bigint,4,NULL,true);
  RAISE EXCEPTION 'Issued invoice deleted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 PERFORM public.save_invoice(gen_random_uuid(),header||jsonb_build_object('invoice_number','jpy-' ||f.a,'currency','JPY','tax_percent','0','discount','0'),
 '[{"item_name":"JPY fractional","quantity":"1.50","unit_price":"101"}]');
 IF (SELECT total FROM public.invoices WHERE invoice_number='jpy-'||f.a)<>152 THEN RAISE EXCEPTION 'JPY rounding'; END IF;
 IF (SELECT line_total FROM public.invoice_items WHERE invoice_id=(SELECT id FROM public.invoices WHERE invoice_number='jpy-'||f.a))<>152 THEN RAISE EXCEPTION 'JPY line rounding'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',f.b,'role','authenticated')::text,true);
 BEGIN
  PERFORM public.save_invoice(gen_random_uuid(),header,lines);
  RAISE EXCEPTION 'Foreign customer accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.save_invoice(gen_random_uuid(),header,lines,(r->>'id')::bigint,3);
  RAISE EXCEPTION 'Foreign invoice accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF has_function_privilege('anon','public.save_invoice(uuid,jsonb,jsonb,bigint,bigint)','EXECUTE')
   OR has_function_privilege('anon','public.change_invoice_state(bigint,bigint,text,boolean)','EXECUTE')
   OR has_schema_privilege('authenticated','private','USAGE') THEN RAISE EXCEPTION 'RPC or journal grant leak'; END IF;
END $$;
SELECT 'PASS: atomic create/edit, rollback after header, retry, duplicate number, version conflict, decimal totals, JPY, issued lock, ownership' AS result;
ROLLBACK;
