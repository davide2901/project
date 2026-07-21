-- SuMisura — Fase 1: schema iniziale
-- Esegui questo script nell'SQL Editor di Supabase (o via CLI).
-- Isolamento: ogni riga è legata a public.users; RLS garantisce che
-- ogni utente veda e modifichi solo i propri dati.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- public.users — chiave esterna per tutte le entità applicative
-- Sincronizzata da auth.users tramite trigger (niente ruoli/team).
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.users is
  'Profilo applicativo 1:1 con auth.users. FK root per isolamento dati.';

-- ---------------------------------------------------------------------------
-- Preferenza lavoro / stage / entrambi (inclusione tirocini/internship)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'job_preference'
  ) then
    create type public.job_preference as enum ('lavoro', 'stage', 'entrambi');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- public.profiles — dati CV, Figma, competenze, preferenze
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  full_name text,
  figma_cv_url text,
  figma_portfolio_url text,
  skills text[] not null default '{}',
  cv_fallback_text text,
  job_preference public.job_preference not null default 'entrambi',
  companies_of_interest text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_user_id_idx on public.profiles (user_id);

comment on table public.profiles is
  'Profilo personale: link Figma, competenze, CV testuale di fallback, preferenza lavoro/stage.';

comment on column public.profiles.cv_fallback_text is
  'CV testuale usato in Fase 1 (prima dell''integrazione Figma) e come fallback.';

comment on column public.profiles.job_preference is
  'Filtra matching: lavoro, stage/tirocinio/internship, o entrambi.';

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Sync auth.users → public.users + profilo vuoto
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Row Level Security — ogni utente è un'isola
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.profiles enable row level security;

-- users
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Nota Fase 3 (non eseguire ancora): applications
-- create table public.applications (
--   id uuid primary key default gen_random_uuid(),
--   user_id uuid not null references public.users (id) on delete cascade,
--   company_name text not null,
--   role_title text not null,
--   offer_source text,
--   company_research jsonb,
--   optimized_cv_text text,
--   cover_letter text,
--   email_draft text,
--   figma_duplicate_file_key text,
--   status text not null default 'draft',
--   deleted_at timestamptz,
--   created_at timestamptz not null default now(),
--   updated_at timestamptz not null default now()
-- );
