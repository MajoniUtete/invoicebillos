drop trigger if exists set_invoice_items_line_total on public.invoice_items;
create trigger set_invoice_items_line_total
before insert or update on public.invoice_items
for each row execute function public.set_invoice_item_line_total();

create or replace function public.refresh_invoice_totals_from_items()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_invoice_totals(new.invoice_id);
    return null;
  end if;

  if tg_op = 'UPDATE' then
    perform public.refresh_invoice_totals(new.invoice_id);
    if old.invoice_id is distinct from new.invoice_id then
      perform public.refresh_invoice_totals(old.invoice_id);
    end if;
    return null;
  end if;

  if tg_op = 'DELETE' then
    perform public.refresh_invoice_totals(old.invoice_id);
    return null;
  end if;

  return null;
end;
$$;
