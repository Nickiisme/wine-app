-- Run in the CloudBase PostgreSQL SQL workspace after postgresql-permissions.sql
-- and postgresql-record-metadata.sql. Re-running this migration is safe.
-- Client code never receives a privileged database key.

create table if not exists public.cellar_entries (
  id text primary key,
  user_id text not null default auth.uid()::text,
  wine_name text not null default '',
  vintage text,
  grape text[],
  country text,
  region text,
  winery text,
  photo_ids jsonb not null default '[]'::jsonb,
  purchase_date date not null,
  purchase_price numeric(12,2) check (purchase_price is null or purchase_price >= 0),
  currency text not null default 'CNY',
  quantity_purchased integer not null check (quantity_purchased > 0),
  quantity_remaining integer not null check (quantity_remaining >= 0 and quantity_remaining <= quantity_purchased),
  purchase_channel text,
  storage_location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cellar_movements (
  id text primary key,
  user_id text not null default auth.uid()::text,
  cellar_entry_id text not null references public.cellar_entries(id),
  type text not null check (type in ('consumed', 'gifted', 'sold', 'damaged')),
  quantity integer not null check (quantity > 0),
  event_date date not null,
  tasting_record_id text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists cellar_entries_user_created_idx on public.cellar_entries(user_id, created_at desc);
create index if not exists cellar_movements_entry_created_idx on public.cellar_movements(cellar_entry_id, created_at desc);

alter table public.tasting_records add column if not exists cellar_entry_id text;
alter table public.tasting_records add column if not exists cellar_movement_id text;

alter table public.cellar_entries enable row level security;
alter table public.cellar_movements enable row level security;

revoke all on public.cellar_entries from anon, authenticated;
revoke all on public.cellar_movements from anon, authenticated;
grant select, insert on public.cellar_entries to anon, authenticated;
grant update (wine_name, vintage, grape, country, region, winery, photo_ids,
  purchase_date, purchase_price, currency, purchase_channel, storage_location,
  notes, updated_at) on public.cellar_entries to anon, authenticated;
grant select on public.cellar_movements to anon, authenticated;
grant all on public.cellar_entries, public.cellar_movements to service_role;

drop policy if exists cellar_entries_select_own on public.cellar_entries;
create policy cellar_entries_select_own on public.cellar_entries
  for select to anon, authenticated using (user_id = (select auth.uid()::text));
drop policy if exists cellar_entries_insert_own on public.cellar_entries;
create policy cellar_entries_insert_own on public.cellar_entries
  for insert to anon, authenticated with check (user_id = (select auth.uid()::text));
drop policy if exists cellar_entries_update_own on public.cellar_entries;
create policy cellar_entries_update_own on public.cellar_entries
  for update to anon, authenticated
  using (user_id = (select auth.uid()::text)) with check (user_id = (select auth.uid()::text));
drop policy if exists cellar_movements_select_own on public.cellar_movements;
create policy cellar_movements_select_own on public.cellar_movements
  for select to anon, authenticated using (user_id = (select auth.uid()::text));

create or replace function public.consume_cellar_entry(
  p_entry_id text, p_quantity integer, p_event_date date
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_entry public.cellar_entries%rowtype;
  v_movement_id text := gen_random_uuid()::text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_quantity is null or p_quantity < 1 then raise exception 'Quantity must be positive'; end if;
  if p_event_date is null then raise exception 'Event date is required'; end if;
  select * into v_entry from public.cellar_entries
    where id = p_entry_id and user_id = auth.uid()::text for update;
  if not found then raise exception 'Cellar entry not found'; end if;
  if v_entry.quantity_remaining < p_quantity then raise exception 'Not enough bottles remaining'; end if;
  update public.cellar_entries set quantity_remaining = quantity_remaining - p_quantity,
    updated_at = now() where id = p_entry_id;
  insert into public.cellar_movements(id, user_id, cellar_entry_id, type, quantity, event_date)
    values (v_movement_id, auth.uid()::text, p_entry_id, 'consumed', p_quantity, p_event_date);
  return jsonb_build_object('movement_id', v_movement_id);
end;
$$;

create or replace function public.save_cellar_tasting(
  p_entry_id text, p_quantity integer, p_event_date date, p_record jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_entry public.cellar_entries%rowtype;
  v_movement_id text := gen_random_uuid()::text;
  v_record_id text := p_record->>'id';
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_quantity is null or p_quantity < 1 then raise exception 'Quantity must be positive'; end if;
  if p_event_date is null then raise exception 'Event date is required'; end if;
  if v_record_id is null or v_record_id = '' then raise exception 'Tasting record ID is required'; end if;
  select * into v_entry from public.cellar_entries
    where id = p_entry_id and user_id = auth.uid()::text for update;
  if not found then raise exception 'Cellar entry not found'; end if;
  if v_entry.quantity_remaining < p_quantity then raise exception 'Not enough bottles remaining'; end if;

  insert into public.tasting_records (
    id, user_id, grape, grapes, wine_name, vintage, country, region,
    photo_ids, note, preference, flavors, body_level, field_metadata,
    tasted_at, created_at, updated_at, cellar_entry_id, cellar_movement_id
  ) values (
    v_record_id, auth.uid(), coalesce(p_record->>'grape', ''),
    array(select jsonb_array_elements_text(coalesce(p_record->'grapes', '[]'::jsonb))),
    coalesce(p_record->>'wine_name', ''), p_record->>'vintage', p_record->>'country',
    coalesce(p_record->>'region', ''), coalesce(p_record->'photo_ids', '[]'::jsonb),
    coalesce(p_record->>'note', ''), p_record->>'preference',
    array(select jsonb_array_elements_text(coalesce(p_record->'flavors', '[]'::jsonb))),
    nullif(p_record->>'body_level', '')::integer,
    coalesce(p_record->'field_metadata', '{}'::jsonb),
    p_event_date, now(), now(), p_entry_id, v_movement_id
  );
  update public.cellar_entries set quantity_remaining = quantity_remaining - p_quantity,
    updated_at = now() where id = p_entry_id;
  insert into public.cellar_movements(id, user_id, cellar_entry_id, type, quantity,
    event_date, tasting_record_id)
    values (v_movement_id, auth.uid()::text, p_entry_id, 'consumed', p_quantity,
      p_event_date, v_record_id);
  return jsonb_build_object('movement_id', v_movement_id, 'tasting_record_id', v_record_id);
end;
$$;

revoke all on function public.consume_cellar_entry(text, integer, date) from public;
revoke all on function public.save_cellar_tasting(text, integer, date, jsonb) from public;
grant execute on function public.consume_cellar_entry(text, integer, date) to anon, authenticated;
grant execute on function public.save_cellar_tasting(text, integer, date, jsonb) to anon, authenticated;
