-- SuMisura — Figma OAuth per utente + coda export per plugin
-- Token solo via service role (niente policy authenticated su figma_connections).

create table if not exists public.figma_connections (
  user_id uuid primary key references public.users (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  figma_user_id text,
  figma_email text,
  figma_handle text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.figma_connections is
  'OAuth Figma per utente. Accessibile solo con service role; status via RPC.';

alter table public.figma_connections enable row level security;

drop trigger if exists figma_connections_set_updated_at on public.figma_connections;
create trigger figma_connections_set_updated_at
  before update on public.figma_connections
  for each row execute function public.set_updated_at();

create or replace function public.figma_connection_status_for_me()
returns table (
  connected boolean,
  figma_handle text,
  figma_email text,
  connected_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    (c.user_id is not null) as connected,
    c.figma_handle,
    c.figma_email,
    c.connected_at
  from (select auth.uid() as uid) u
  left join public.figma_connections c on c.user_id = u.uid;
$$;

revoke all on function public.figma_connection_status_for_me() from public;
grant execute on function public.figma_connection_status_for_me() to authenticated;

create table if not exists public.figma_export_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  application_id uuid references public.applications (id) on delete set null,
  file_key text,
  node_name text not null default '__cv_body__',
  payload jsonb not null,
  sync_code text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'consumed', 'expired')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists figma_export_jobs_user_id_idx
  on public.figma_export_jobs (user_id);

create index if not exists figma_export_jobs_sync_code_idx
  on public.figma_export_jobs (sync_code);

comment on table public.figma_export_jobs is
  'Coda sync verso plugin Figma (REST API non scrive text node).';

alter table public.figma_export_jobs enable row level security;

drop policy if exists "figma_export_jobs_select_own" on public.figma_export_jobs;
create policy "figma_export_jobs_select_own"
  on public.figma_export_jobs for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "figma_export_jobs_insert_own" on public.figma_export_jobs;
create policy "figma_export_jobs_insert_own"
  on public.figma_export_jobs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "figma_export_jobs_update_own" on public.figma_export_jobs;
create policy "figma_export_jobs_update_own"
  on public.figma_export_jobs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
