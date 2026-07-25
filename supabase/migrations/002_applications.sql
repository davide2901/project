-- SuMisura — Fase 3: applications (archivio + stats + anti-duplicati)
-- Isolamento per user_id + RLS. Dedup: stesso offer_fingerprint non crea doppioni.

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  company_name text not null,
  role_title text not null,
  position_type text not null default 'non_chiaro'
    check (position_type in ('lavoro', 'stage', 'non_chiaro')),
  offer_source text,
  offer_fingerprint text not null,
  ats_keywords text[] not null default '{}',
  matched_skills text[] not null default '{}',
  omitted_offer_requirements text[] not null default '{}',
  company_research jsonb,
  optimized_cv_text text,
  cover_letter text,
  email_subject text,
  email_body text,
  honesty_notes text[] not null default '{}',
  status text not null default 'draft',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, offer_fingerprint)
);

create index if not exists applications_user_id_idx
  on public.applications (user_id);

create index if not exists applications_user_created_idx
  on public.applications (user_id, created_at desc);

comment on table public.applications is
  'Candidature generate: archivio, stats e materiali. Dedup per offer_fingerprint.';

comment on column public.applications.offer_fingerprint is
  'Hash normalizzato del testo/URL offerta: evita duplicati se si ripete la stessa ricerca.';

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

alter table public.applications enable row level security;

drop policy if exists "applications_select_own" on public.applications;
create policy "applications_select_own"
  on public.applications for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "applications_insert_own" on public.applications;
create policy "applications_insert_own"
  on public.applications for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "applications_update_own" on public.applications;
create policy "applications_update_own"
  on public.applications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "applications_delete_own" on public.applications;
create policy "applications_delete_own"
  on public.applications for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.applications to authenticated;
