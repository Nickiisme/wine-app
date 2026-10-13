-- Run after creating the application tables.
-- Enables safe browser access using CloudBase Auth + PostgreSQL RLS.

alter table public.profiles alter column id set default auth.uid();
alter table public.wines alter column user_id set default auth.uid();
alter table public.tasting_records alter column user_id set default auth.uid();
alter table public.recognition_jobs alter column user_id set default auth.uid();

grant select on public.grape_varieties to anon, authenticated;
grant all on public.grape_varieties to service_role;

grant select, insert, update, delete on public.profiles to anon, authenticated;
grant select, insert, update, delete on public.wines to anon, authenticated;
grant select, insert, update, delete on public.tasting_records to anon, authenticated;
grant select, insert, update, delete on public.recognition_jobs to anon, authenticated;

grant all on public.profiles to service_role;
grant all on public.wines to service_role;
grant all on public.tasting_records to service_role;
grant all on public.recognition_jobs to service_role;

alter table public.profiles enable row level security;
alter table public.wines enable row level security;
alter table public.tasting_records enable row level security;
alter table public.recognition_jobs enable row level security;
alter table public.grape_varieties enable row level security;

drop policy if exists grape_varieties_public_read on public.grape_varieties;
create policy grape_varieties_public_read on public.grape_varieties
  for select to anon, authenticated using (is_published = true);

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to anon, authenticated using (id = (select auth.uid()));
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to anon, authenticated with check (id = (select auth.uid()));
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to anon, authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles
  for delete to anon, authenticated using (id = (select auth.uid()));

drop policy if exists wines_own_all on public.wines;
create policy wines_own_all on public.wines
  for all to anon, authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists tasting_records_own_all on public.tasting_records;
create policy tasting_records_own_all on public.tasting_records
  for all to anon, authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists recognition_jobs_own_all on public.recognition_jobs;
create policy recognition_jobs_own_all on public.recognition_jobs
  for all to anon, authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
