-- Run with postgres privileges; ALWAYS rolls back fixtures and changes.
BEGIN;
CREATE TEMP TABLE security_fixture AS SELECT gen_random_uuid() AS a, gen_random_uuid() AS b,
  -(1000000000000 + floor(random()*1000000000000))::bigint AS base;
GRANT SELECT ON security_fixture TO authenticated, anon;
INSERT INTO auth.users(id) SELECT a FROM security_fixture UNION ALL SELECT b FROM security_fixture;
INSERT INTO public.profiles(id,business_name) SELECT a,'Security test A' FROM security_fixture UNION ALL SELECT b,'Security test B' FROM security_fixture;
INSERT INTO public.customers(id,user_id,name) SELECT base,a,'Security test A' FROM security_fixture UNION ALL SELECT base-1,b,'Security test B' FROM security_fixture;
INSERT INTO public.invoices(id,user_id,invoice_number,customer_id) SELECT base,a,'test-'||a,base FROM security_fixture UNION ALL SELECT base-1,b,'test-'||b,base-1 FROM security_fixture;
INSERT INTO public.receipts(id,user_id,receipt_number,customer_id) SELECT base,a,'test-'||a,base FROM security_fixture UNION ALL SELECT base-1,b,'test-'||b,base-1 FROM security_fixture;
INSERT INTO public.invoice_items(id,user_id,invoice_id,item_name,quantity,unit_price) SELECT base,a,base,'Test',2,0.10 FROM security_fixture UNION ALL SELECT base-1,b,base-1,'Test',2,0.10 FROM security_fixture;
INSERT INTO public.receipt_items(id,user_id,receipt_id,item_name,quantity,unit_price) SELECT base,a,base,'Test',2,0.10 FROM security_fixture UNION ALL SELECT base-1,b,base-1,'Test',2,0.10 FROM security_fixture;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub',a,'role','authenticated')::text,true) FROM security_fixture;
SET LOCAL ROLE authenticated;
DO $$
DECLARE t text; n integer; f record;
BEGIN
  SELECT * INTO f FROM security_fixture;
  FOREACH t IN ARRAY ARRAY['customers','invoices','invoice_items','receipts','receipt_items'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE id IN ($1,$2)',t) INTO n USING f.base,f.base-1;
    IF n <> 1 THEN RAISE EXCEPTION 'Isolation read failed: %',t; END IF;
    EXECUTE format('UPDATE public.%I SET updated_at=now() WHERE id=$1',t) USING f.base-1;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN RAISE EXCEPTION 'Isolation update failed: %',t; END IF;
    EXECUTE format('DELETE FROM public.%I WHERE id=$1',t) USING f.base-1;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN RAISE EXCEPTION 'Isolation delete failed: %',t; END IF;
    EXECUTE format('UPDATE public.%I SET updated_at=now() WHERE id=$1',t) USING f.base;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'Own update failed: %',t; END IF;
    BEGIN
      EXECUTE format('UPDATE public.%I SET user_id=$1 WHERE id=$2',t) USING f.b,f.base;
      RAISE EXCEPTION 'Ownership reassignment allowed: %',t;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    IF has_table_privilege(current_user,'public.'||t,'TRUNCATE') THEN RAISE EXCEPTION 'TRUNCATE granted: %',t; END IF;
  END LOOP;
  IF (SELECT count(*) FROM public.profiles WHERE id IN(f.a,f.b)) <> 1 THEN RAISE EXCEPTION 'Profile read isolation'; END IF;
  UPDATE public.profiles SET business_name='Legitimate update',updated_at=now() WHERE id=f.a;
  UPDATE public.profiles SET business_name='Foreign update' WHERE id=f.b;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'Profile foreign update'; END IF;
  DELETE FROM public.profiles WHERE id=f.b;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'Profile foreign delete'; END IF;
  BEGIN
    UPDATE public.profiles SET id=f.b WHERE id=f.a;
    RAISE EXCEPTION 'Profile reassignment allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.customers(user_id,name) VALUES(f.b,'Foreign insert');
    RAISE EXCEPTION 'Foreign customer insert';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.invoices(user_id,invoice_number) VALUES(f.b,'foreign-'||f.a);
    RAISE EXCEPTION 'Foreign invoice insert';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.receipts(user_id,receipt_number) VALUES(f.b,'foreign-'||f.a);
    RAISE EXCEPTION 'Foreign receipt insert';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.invoice_items(user_id,invoice_id,item_name) VALUES(f.a,f.base-1,'Foreign parent');
    RAISE EXCEPTION 'Foreign invoice parent insert';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.receipt_items(user_id,receipt_id,item_name) VALUES(f.a,f.base-1,'Foreign parent');
    RAISE EXCEPTION 'Foreign receipt parent insert';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.profiles SET subscription_status='active' WHERE id=f.a;
    RAISE EXCEPTION 'Billing update allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.profiles(id,subscription_status) VALUES(f.a,'active');
    RAISE EXCEPTION 'Billing insert allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  -- The exact settings upsert contract remains supported.
  INSERT INTO public.profiles(id,business_name,updated_at) VALUES(f.a,'Upsert control',now())
    ON CONFLICT(id) DO UPDATE SET business_name=excluded.business_name,updated_at=excluded.updated_at;
  BEGIN
    UPDATE public.invoices SET customer_id=f.base-1 WHERE id=f.base;
    RAISE EXCEPTION 'Foreign customer accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.invoice_items SET invoice_id=f.base-1 WHERE id=f.base;
    RAISE EXCEPTION 'Foreign invoice accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.receipt_items SET receipt_id=f.base-1 WHERE id=f.base;
    RAISE EXCEPTION 'Foreign receipt accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.invoice_items SET quantity=3 WHERE id=f.base;
  UPDATE public.receipt_items SET quantity=3 WHERE id=f.base;
  IF (SELECT total FROM public.invoices WHERE id=f.base) <> 0.30 THEN RAISE EXCEPTION 'Invoice trigger broken'; END IF;
  IF (SELECT total FROM public.receipts WHERE id=f.base) <> 0.30 THEN RAISE EXCEPTION 'Receipt trigger broken'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers','profiles','invoices','invoice_items','receipts','receipt_items'] LOOP
    IF has_table_privilege(current_user,'public.'||t,'SELECT') OR has_table_privilege(current_user,'public.'||t,'TRUNCATE') THEN RAISE EXCEPTION 'Anonymous grant: %',t; END IF;
  END LOOP;
END $$;
RESET ROLE;
SELECT 'PASS: isolation, billing permissions, profile upsert, triggers, anonymous grants' AS result;
ROLLBACK;
