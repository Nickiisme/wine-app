-- Run once in the CloudBase PostgreSQL SQL workspace.
-- Keeps multi-grape selections and per-field provenance with each tasting record.

alter table public.tasting_records
  add column if not exists grapes text[];

alter table public.tasting_records
  add column if not exists field_metadata jsonb not null default '{}'::jsonb;

comment on column public.tasting_records.grapes is
  'All grape varieties selected for this wine. The legacy grape column remains as a display value.';

comment on column public.tasting_records.field_metadata is
  'Per-field provenance: { source: user_selected | label_scan | inferred | default, confirmed: boolean }.';
