drop policy if exists "Users can view own customers" on public.customers;
create policy "Users can view own customers" on public.customers for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert own customers" on public.customers;
create policy "Users can insert own customers" on public.customers for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update own customers" on public.customers;
create policy "Users can update own customers" on public.customers for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own customers" on public.customers;
create policy "Users can delete own customers" on public.customers for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can view own invoices" on public.invoices;
create policy "Users can view own invoices" on public.invoices for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can delete own invoices" on public.invoices;
create policy "Users can delete own invoices" on public.invoices for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can view own invoice items" on public.invoice_items;
create policy "Users can view own invoice items" on public.invoice_items for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can delete own invoice items" on public.invoice_items;
create policy "Users can delete own invoice items" on public.invoice_items for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "Users can delete own profile" on public.profiles;
create policy "Users can delete own profile" on public.profiles for delete to authenticated using (auth.uid() = id);

drop policy if exists "Users can view own receipts" on public.receipts;
create policy "Users can view own receipts" on public.receipts for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can delete own receipts" on public.receipts;
create policy "Users can delete own receipts" on public.receipts for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can view own receipt items" on public.receipt_items;
create policy "Users can view own receipt items" on public.receipt_items for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can delete own receipt items" on public.receipt_items;
create policy "Users can delete own receipt items" on public.receipt_items for delete to authenticated using (auth.uid() = user_id);
