-- SuMisura — Fase 3: applications (archivio + stats + anti-duplicati)
-- Idempotente: funziona sia su DB vuoto sia se la tabella esiste già
-- senza colonne nuove (es. offer_fingerprint).

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  company_name text not null default '',
  role_title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Colonne aggiunte in modo sicuro (no errore se già presenti)
alter table public.applications
  add column if not exists position_type text not null default 'non_chiaro';

alter table public.applications
  add column if not exists offer_source text;

alter table public.applications
  add column if not exists offer_fingerprint text;

alter table public.applications
  add column if not exists ats_keywords text[] not null default '{}';

alter table public.applications
  add column if not exists matched_skills text[] not null default '{}';

alter table public.applications
  add column if not exists omitted_offer_requirements text[] not null default '{}';

alter table public.applications
  add column if not exists company_research jsonb;

alter table public.applications
  add column if not exists optimized_cv_text text;

alter table public.applications
  add column if not exists cover_letter text;

alter table public.applications
  add column if not exists email_subject text;

alter table public.applications
  add column if not exists email_body text;

-- Compatibilità: vecchio stub con email_draft singolo
alter table public.applications
  add column if not exists email_draft text;

alter table public.applications
  add column if not exists honesty_notes text[] not null default '{}';

alter table public.applications
  add column if not exists status text not null default 'draft';

alter table public.applications
  add column if not exists deleted_at timestamptz;

alter table public.applications
  add column if not exists figma_duplicate_file_key text;

-- Fingerprint obbligatorio: riempi eventuali vuote, poi NOT NULL
update public.applications
set offer_fingerprint = md5(coalesce(offer_source, '') || '|' || id::text)
where offer_fingerprint is null or offer_fingerprint = '';

alter table public.applications
  alter column offer_fingerprint set default '';

alter table public.applications
  alter column offer_fingerprint set not null;

-- Check position_type (ignora se già presente)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'applications_position_type_check'
      and conrelid = 'public.applications'::regclass
  ) then
    alter table public.applications
      add constraint applications_position_type_check
      check (position_type in ('lavoro', 'stage', 'non_chiaro'));
  end if;
end $$;

-- Unique anti-duplicati
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'applications_user_id_offer_fingerprint_key'
      and conrelid = 'public.applications'::regclass
  ) then
    alter table public.applications
      add constraint applications_user_id_offer_fingerprint_key
      unique (user_id, offer_fingerprint);
  end if;
exception
  when unique_violation then
    -- Se ci sono già duplicati, deduplica tenendo la più recente
    delete from public.applications a
    using public.applications b
    where a.user_id = b.user_id
      and a.offer_fingerprint = b.offer_fingerprint
      and a.created_at < b.created_at;

    alter table public.applications
      add constraint applications_user_id_offer_fingerprint_key
      unique (user_id, offer_fingerprint);
end $$;

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
