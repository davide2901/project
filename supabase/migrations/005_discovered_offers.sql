-- SuMisura — Fase 4: discovered_offers (proposte dal web)
-- Esegui dopo 001–004.

create table if not exists public.discovered_offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  company_name text not null,
  role_title text not null,
  position_type text not null default 'non_chiaro',
  location text,
  source_url text,
  snippet text not null default '',
  match_reason text not null default '',
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discovered_offers_position_type_check
    check (position_type in ('lavoro', 'stage', 'non_chiaro')),
  constraint discovered_offers_status_check
    check (status in ('new', 'dismissed', 'applied'))
);

create index if not exists discovered_offers_user_id_status_created_at_idx
  on public.discovered_offers (user_id, status, created_at desc);

create unique index if not exists discovered_offers_user_source_url_uidx
  on public.discovered_offers (user_id, source_url)
  where source_url is not null and source_url <> '';

create unique index if not exists discovered_offers_user_company_role_uidx
  on public.discovered_offers (user_id, lower(company_name), lower(role_title))
  where source_url is null or source_url = '';

comment on table public.discovered_offers is
  'Offerte proposte dalla discovery (Gemini + ricerca web). Isolamento via RLS.';

drop trigger if exists discovered_offers_set_updated_at on public.discovered_offers;
create trigger discovered_offers_set_updated_at
  before update on public.discovered_offers
  for each row execute function public.set_updated_at();

alter table public.discovered_offers enable row level security;

drop policy if exists "discovered_offers_select_own" on public.discovered_offers;
create policy "discovered_offers_select_own"
  on public.discovered_offers for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "discovered_offers_insert_own" on public.discovered_offers;
create policy "discovered_offers_insert_own"
  on public.discovered_offers for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "discovered_offers_update_own" on public.discovered_offers;
create policy "discovered_offers_update_own"
  on public.discovered_offers for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "discovered_offers_delete_own" on public.discovered_offers;
create policy "discovered_offers_delete_own"
  on public.discovered_offers for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.discovered_offers to authenticated;
