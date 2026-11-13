alter table public.customers
  add column if not exists updated_at timestamptz not null default now();

alter table public.invoices
  add column if not exists updated_at timestamptz not null default now();

alter table public.invoice_items
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists set_invoices_updated_at on public.invoices;
create trigger set_invoices_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

drop trigger if exists set_invoice_items_updated_at on public.invoice_items;
create trigger set_invoice_items_updated_at
before update on public.invoice_items
for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.set_invoice_total()
returns trigger
language plpgsql
as $$
begin
  new.total = greatest(coalesce(new.subtotal, 0) + coalesce(new.tax, 0) - coalesce(new.discount, 0), 0);
  return new;
end;
$$;

drop trigger if exists set_invoices_total on public.invoices;
create trigger set_invoices_total
before insert or update of subtotal, tax, discount on public.invoices
for each row execute function public.set_invoice_total();

create or replace function public.set_invoice_item_line_total()
returns trigger
language plpgsql
as $$
begin
  new.line_total = coalesce(new.quantity, 0) * coalesce(new.unit_price, 0);
  return new;
end;
$$;

drop trigger if exists set_invoice_items_line_total on public.invoice_items;
create trigger set_invoice_items_line_total
before insert or update of quantity, unit_price on public.invoice_items
for each row execute function public.set_invoice_item_line_total();

create or replace function public.refresh_invoice_totals(target_invoice_id bigint)
returns void
language plpgsql
as $$
begin
  update public.invoices i
  set subtotal = coalesce((
        select sum(ii.line_total)
        from public.invoice_items ii
        where ii.invoice_id = target_invoice_id
      ), 0)
  where i.id = target_invoice_id;
end;
$$;

create or replace function public.refresh_invoice_totals_from_items()
returns trigger
language plpgsql
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_invoice_totals(new.invoice_id);
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.invoice_id is distinct from coalesce(new.invoice_id, old.invoice_id) then
    perform public.refresh_invoice_totals(old.invoice_id);
  elsif tg_op = 'DELETE' then
    perform public.refresh_invoice_totals(old.invoice_id);
  end if;

  return null;
end;
$$;

drop trigger if exists refresh_invoice_totals_from_items on public.invoice_items;
create trigger refresh_invoice_totals_from_items
after insert or update or delete on public.invoice_items
for each row execute function public.refresh_invoice_totals_from_items();

alter table public.invoice_items
  drop constraint if exists invoice_items_quantity_nonnegative,
  add constraint invoice_items_quantity_nonnegative check (quantity >= 0) not valid,
  drop constraint if exists invoice_items_unit_price_nonnegative,
  add constraint invoice_items_unit_price_nonnegative check (unit_price >= 0) not valid,
  drop constraint if exists invoice_items_line_total_nonnegative,
  add constraint invoice_items_line_total_nonnegative check (line_total >= 0) not valid;

alter table public.invoices
  drop constraint if exists invoices_amounts_nonnegative,
  add constraint invoices_amounts_nonnegative check (subtotal >= 0 and tax >= 0 and discount >= 0 and total >= 0) not valid,
  drop constraint if exists invoices_status_valid,
  add constraint invoices_status_valid check (status in ('Draft', 'Pending', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled')) not valid,
  drop constraint if exists invoices_currency_format,
  add constraint invoices_currency_format check (currency ~ '^[A-Za-z]{3,5}$') not valid;

alter table public.customers
  drop constraint if exists customers_status_valid,
  add constraint customers_status_valid check (status in ('Active', 'Inactive', 'Lead')) not valid;

alter table public.invoice_items validate constraint invoice_items_quantity_nonnegative;
alter table public.invoice_items validate constraint invoice_items_unit_price_nonnegative;
alter table public.invoice_items validate constraint invoice_items_line_total_nonnegative;
alter table public.invoices validate constraint invoices_amounts_nonnegative;
alter table public.invoices validate constraint invoices_status_valid;
alter table public.invoices validate constraint invoices_currency_format;
alter table public.customers validate constraint customers_status_valid;

create index if not exists idx_customers_user_id on public.customers (user_id);
create index if not exists idx_customers_user_status on public.customers (user_id, status);
create index if not exists idx_invoices_user_id on public.invoices (user_id);
create index if not exists idx_invoices_user_status on public.invoices (user_id, status);
create index if not exists idx_invoices_user_due_date on public.invoices (user_id, due_date);
create index if not exists idx_invoice_items_user_id on public.invoice_items (user_id);
create index if not exists idx_profiles_updated_at on public.profiles (updated_at);

update public.invoice_items
set line_total = coalesce(quantity, 0) * coalesce(unit_price, 0);

update public.invoices i
set subtotal = coalesce((
  select sum(ii.line_total)
  from public.invoice_items ii
  where ii.invoice_id = i.id
), 0);
