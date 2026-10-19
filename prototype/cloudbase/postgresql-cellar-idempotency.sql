-- Apply after postgresql-cellar.sql and postgresql-record-lifecycle.sql.
-- Additive metadata repair; no historical rows or RLS policies are rewritten.
-- Legacy keyless mutations fail closed. Ship the paired client before resuming stock actions.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter table public.tasting_records add column if not exists grapes text[];
alter table public.tasting_records add column if not exists field_metadata jsonb not null default '{}'::jsonb;

create table if not exists public.cellar_requests (
  user_id text not null,
  request_id text not null check (length(request_id) between 1 and 128),
  payload jsonb not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);
alter table public.cellar_requests enable row level security;
revoke all on public.cellar_requests from public, anon, authenticated;
grant all on public.cellar_requests to service_role;

create or replace function public.apply_cellar_request(
  p_request_id text, p_entry_id text, p_quantity integer, p_event_date date,
  p_record jsonb, p_operation text
) returns jsonb language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare
  v_uid text := auth.uid()::text;
  v_entry public.cellar_entries%rowtype;
  v_request public.cellar_requests%rowtype;
  v_payload jsonb;
  v_result jsonb;
  v_movement_id text := gen_random_uuid()::text;
  v_record_id public.tasting_records.id%type;
  v_tasting_uid public.tasting_records.user_id%type := auth.uid();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_request_id is null or length(btrim(p_request_id))=0 or length(p_request_id)>128 then
    raise exception 'A stable request ID is required';
  end if;
  if p_operation is null or p_operation not in ('consume','tasting') then raise exception 'Invalid operation'; end if;
  if p_quantity is null or p_quantity < 1 then raise exception 'Quantity must be positive'; end if;
  if p_event_date is null then raise exception 'Event date is required'; end if;
  if p_operation='tasting' and (jsonb_typeof(p_record) is distinct from 'object' or coalesce(p_record->>'id','')='') then
    raise exception 'Tasting record ID is required';
  end if;
  if p_operation='tasting' then v_record_id := p_record->>'id'; end if;
  v_payload := jsonb_build_object('operation',p_operation,'entry_id',p_entry_id,
    'quantity',p_quantity,'event_date',p_event_date,'record',p_record);
  -- The unique key waits for an in-flight identical key. A later statement sees its commit.
  insert into public.cellar_requests(user_id,request_id,payload)
    values(v_uid,p_request_id,v_payload) on conflict (user_id,request_id) do nothing;
  select * into strict v_request from public.cellar_requests
    where user_id=v_uid and request_id=p_request_id for update;
  if v_request.payload is distinct from v_payload then
    raise exception 'Idempotency key reused with different payload';
  end if;
  if v_request.result is not null then return v_request.result; end if;
  select * into v_entry from public.cellar_entries
    where id=p_entry_id and user_id=v_uid for update;
  if not found then raise exception 'Cellar entry not found'; end if;
  if v_entry.quantity_remaining < p_quantity then raise exception 'Not enough bottles remaining'; end if;

  -- Stock, movement, tasting and receipt commit or roll back as one transaction.
  update public.cellar_entries set quantity_remaining=quantity_remaining-p_quantity,
    updated_at=now() where id=p_entry_id and user_id=v_uid;
  insert into public.cellar_movements(id,user_id,cellar_entry_id,type,quantity,event_date,tasting_record_id)
    values(v_movement_id,v_uid,p_entry_id,'consumed',p_quantity,p_event_date,
      case when p_operation='tasting' then v_record_id::text else null end);
  if p_operation='tasting' then
    insert into public.tasting_records (
      id,user_id,grape,grapes,wine_name,vintage,country,region,photo_ids,note,
      preference,flavors,body_level,field_metadata,tasted_at,tasted_on,created_at,updated_at,
      cellar_entry_id,cellar_movement_id
    ) values (
      v_record_id,v_tasting_uid,coalesce(p_record->>'grape',''),
      array(select jsonb_array_elements_text(coalesce(p_record->'grapes','[]'::jsonb))),
      coalesce(p_record->>'wine_name',''),p_record->>'vintage',p_record->>'country',
      coalesce(p_record->>'region',''),coalesce(p_record->'photo_ids','[]'::jsonb),
      coalesce(p_record->>'note',''),p_record->>'preference',
      array(select jsonb_array_elements_text(coalesce(p_record->'flavors','[]'::jsonb))),
      nullif(p_record->>'body_level','')::integer,coalesce(p_record->'field_metadata','{}'::jsonb),
      (p_event_date+time '12:00') at time zone 'Asia/Shanghai',p_event_date,now(),now(),p_entry_id,v_movement_id
    );
  end if;
  v_result := jsonb_build_object('movement_id',v_movement_id,'quantity_remaining',v_entry.quantity_remaining-p_quantity);
  if p_operation='tasting' then v_result := v_result || jsonb_build_object('tasting_record_id',v_record_id); end if;
  update public.cellar_requests set result=v_result where user_id=v_uid and request_id=p_request_id;
  return v_result;
end;
$$;
revoke all on function public.apply_cellar_request(text,text,integer,date,jsonb,text) from public,anon,authenticated;

create or replace function public.consume_cellar_entry_v2(
  p_entry_id text,p_quantity integer,p_event_date date,p_request_id text
) returns jsonb language sql security definer set search_path = pg_catalog, pg_temp as $$
  select public.apply_cellar_request(p_request_id,p_entry_id,p_quantity,p_event_date,null,'consume');
$$;
create or replace function public.save_cellar_tasting_v2(
  p_entry_id text,p_quantity integer,p_event_date date,p_record jsonb,p_request_id text
) returns jsonb language sql security definer set search_path = pg_catalog, pg_temp as $$
  select public.apply_cellar_request(p_request_id,p_entry_id,p_quantity,p_event_date,p_record,'tasting');
$$;
revoke all on function public.consume_cellar_entry_v2(text,integer,date,text) from public;
revoke all on function public.save_cellar_tasting_v2(text,integer,date,jsonb,text) from public;
grant execute on function public.consume_cellar_entry_v2(text,integer,date,text) to anon,authenticated;
grant execute on function public.save_cellar_tasting_v2(text,integer,date,jsonb,text) to anon,authenticated;

-- Keep old signatures, but never silently execute an unsafe keyless mutation.
create or replace function public.consume_cellar_entry(p_entry_id text,p_quantity integer,p_event_date date)
returns jsonb language plpgsql set search_path = pg_catalog, pg_temp as $$
begin raise exception 'CLIENT_UPGRADE_REQUIRED: use consume_cellar_entry_v2 with a stable request ID'; end;
$$;
create or replace function public.save_cellar_tasting(p_entry_id text,p_quantity integer,p_event_date date,p_record jsonb)
returns jsonb language plpgsql set search_path = pg_catalog, pg_temp as $$
begin raise exception 'CLIENT_UPGRADE_REQUIRED: use save_cellar_tasting_v2 with a stable request ID'; end;
$$;
revoke all on function public.consume_cellar_entry(text,integer,date) from public;
revoke all on function public.save_cellar_tasting(text,integer,date,jsonb) from public;
grant execute on function public.consume_cellar_entry(text,integer,date) to anon,authenticated;
grant execute on function public.save_cellar_tasting(text,integer,date,jsonb) to anon,authenticated;
notify pgrst, 'reload schema';
commit;
