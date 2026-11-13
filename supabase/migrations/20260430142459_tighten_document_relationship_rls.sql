drop policy if exists "Users can insert own invoices" on public.invoices;
create policy "Users can insert own invoices" on public.invoices
for insert to authenticated
with check (
  auth.uid() = user_id
  and (
    customer_id is null
    or exists (
      select 1 from public.customers c
      where c.id = customer_id and c.user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can update own invoices" on public.invoices;
create policy "Users can update own invoices" on public.invoices
for update to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    customer_id is null
    or exists (
      select 1 from public.customers c
      where c.id = customer_id and c.user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can insert own invoice items" on public.invoice_items;
create policy "Users can insert own invoice items" on public.invoice_items
for insert to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.invoices i
    where i.id = invoice_id and i.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own invoice items" on public.invoice_items;
create policy "Users can update own invoice items" on public.invoice_items
for update to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.invoices i
    where i.id = invoice_id and i.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own receipts" on public.receipts;
create policy "Users can insert own receipts" on public.receipts
for insert to authenticated
with check (
  auth.uid() = user_id
  and (
    customer_id is null
    or exists (
      select 1 from public.customers c
      where c.id = customer_id and c.user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can update own receipts" on public.receipts;
create policy "Users can update own receipts" on public.receipts
for update to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    customer_id is null
    or exists (
      select 1 from public.customers c
      where c.id = customer_id and c.user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can insert own receipt items" on public.receipt_items;
create policy "Users can insert own receipt items" on public.receipt_items
for insert to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.receipts r
    where r.id = receipt_id and r.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own receipt items" on public.receipt_items;
create policy "Users can update own receipt items" on public.receipt_items
for update to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.receipts r
    where r.id = receipt_id and r.user_id = auth.uid()
  )
);
