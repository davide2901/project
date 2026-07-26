-- SuMisura — Fase 3: applications (archivio candidature)
-- Esegui dopo 001_initial_schema.sql

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  company_name text not null,
  role_title text not null,
  position_type text not null default 'non_chiaro',
  offer_source text,
  package jsonb not null,
  status text not null default 'draft',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_position_type_check
    check (position_type in ('lavoro', 'stage', 'non_chiaro')),
  constraint applications_status_check
    check (status in ('draft', 'ready', 'sent', 'archived'))
);

create index if not exists applications_user_id_created_at_idx
  on public.applications (user_id, created_at desc);

create index if not exists applications_user_id_active_idx
  on public.applications (user_id)
  where deleted_at is null;

comment on table public.applications is
  'Candidature generate: pacchetto AI completo in package (jsonb). Soft-delete via deleted_at.';

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

alter table public.applications enable row level security;

drop policy if exists "applications_select_own" on public.applications;
create policy "applications_select_own"
  on public.applications for select
  using (auth.uid() = user_id);

drop policy if exists "applications_insert_own" on public.applications;
create policy "applications_insert_own"
  on public.applications for insert
  with check (auth.uid() = user_id);

drop policy if exists "applications_update_own" on public.applications;
create policy "applications_update_own"
  on public.applications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "applications_delete_own" on public.applications;
create policy "applications_delete_own"
  on public.applications for delete
  using (auth.uid() = user_id);
