-- SuMisura — RAL su offerte + cache intel azienda (preparazione colloquio)

alter table public.discovered_offers
  add column if not exists salary_min integer,
  add column if not exists salary_max integer,
  add column if not exists salary_source text;

alter table public.discovered_offers
  drop constraint if exists discovered_offers_salary_source_check;

alter table public.discovered_offers
  add constraint discovered_offers_salary_source_check
    check (
      salary_source is null
      or salary_source in ('annuncio', 'stima')
    );

alter table public.discovered_offers
  drop constraint if exists discovered_offers_salary_range_check;

alter table public.discovered_offers
  add constraint discovered_offers_salary_range_check
    check (
      (salary_min is null and salary_max is null)
      or (
        salary_min is not null
        and salary_max is not null
        and salary_min > 0
        and salary_max >= salary_min
        and salary_max < 10000000
      )
    );

comment on column public.discovered_offers.salary_min is
  'RAL annua lorda minima in euro (intero).';
comment on column public.discovered_offers.salary_max is
  'RAL annua lorda massima in euro (intero).';
comment on column public.discovered_offers.salary_source is
  'annuncio = cifra dall''inserzione; stima = Glassdoor/mercato (non certa).';

-- Cache condivisa: insight azienda/ruolo (sintesi + fonti), TTL gestito in app
create table if not exists public.company_intel (
  id uuid primary key default gen_random_uuid(),
  company_key text not null,
  company_name text not null,
  role_key text not null default '',
  role_title text,
  payload jsonb not null default '{}'::jsonb,
  confidence text not null default 'bassa',
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_intel_confidence_check
    check (confidence in ('alta', 'media', 'bassa'))
);

create unique index if not exists company_intel_company_role_uidx
  on public.company_intel (company_key, role_key);

create index if not exists company_intel_expires_at_idx
  on public.company_intel (expires_at);

comment on table public.company_intel is
  'Cache insight azienda/ruolo (clima, pro/contro, tip colloquio, fonti). Condivisa tra utenti.';

drop trigger if exists company_intel_set_updated_at on public.company_intel;
create trigger company_intel_set_updated_at
  before update on public.company_intel
  for each row execute function public.set_updated_at();

alter table public.company_intel enable row level security;

drop policy if exists "company_intel_select_authenticated" on public.company_intel;
create policy "company_intel_select_authenticated"
  on public.company_intel for select
  to authenticated
  using (true);

drop policy if exists "company_intel_insert_authenticated" on public.company_intel;
create policy "company_intel_insert_authenticated"
  on public.company_intel for insert
  to authenticated
  with check (true);

drop policy if exists "company_intel_update_authenticated" on public.company_intel;
create policy "company_intel_update_authenticated"
  on public.company_intel for update
  to authenticated
  using (true)
  with check (true);

grant select, insert, update on public.company_intel to authenticated;
