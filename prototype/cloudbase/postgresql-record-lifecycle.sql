-- Deploy after existing record metadata and cellar migrations. No records are deleted.
begin;
alter table public.tasting_records add column if not exists tasted_on date;
alter table public.tasting_records add column if not exists deleted_at timestamptz;
alter table public.tasting_records add column if not exists updated_at timestamptz default now();
-- Historic timezone is unavailable; use the product's existing Asia/Shanghai locale.
update public.tasting_records set tasted_on = (coalesce(tasted_at, created_at) at time zone 'Asia/Shanghai')::date where tasted_on is null;
update public.tasting_records set updated_at = coalesce(created_at, now()) where updated_at is null;
create index if not exists tasting_records_active_date on public.tasting_records(user_id, tasted_on desc) where deleted_at is null;

create or replace function public.guard_tasting_lifecycle() returns trigger
language plpgsql set search_path = public as $$
begin
  if TG_OP = 'UPDATE' then
    if new.user_id is distinct from old.user_id or new.created_at is distinct from old.created_at
      or new.cellar_entry_id is distinct from old.cellar_entry_id or new.cellar_movement_id is distinct from old.cellar_movement_id then
      raise exception 'Immutable record identity or cellar linkage';
    end if;
    if old.deleted_at is not null and new.deleted_at is null and old.deleted_at <= now() - interval '30 days' then
      raise exception 'Recovery window expired';
    end if;
    if new.deleted_at is not null then new.deleted_at := coalesce(old.deleted_at, now()); end if;
  else
    new.created_at := now();
    new.deleted_at := null;
  end if;
  new.updated_at := now();
  new.tasted_on := coalesce(new.tasted_on, (new.tasted_at at time zone 'Asia/Shanghai')::date);
  if new.tasted_on is null or new.tasted_on > (now() at time zone 'Pacific/Kiritimati')::date then
    raise exception 'Invalid tasting date';
  end if;
  return new;
end;
$$;
drop trigger if exists tasting_lifecycle_guard on public.tasting_records;
create trigger tasting_lifecycle_guard before insert or update on public.tasting_records
  for each row execute function public.guard_tasting_lifecycle();
-- App clients must soft-delete. Physical purge belongs to a privileged scheduled worker.
revoke delete on public.tasting_records from anon, authenticated;
commit;
