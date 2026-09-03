-- Watchlist offerte + scarto persistente (la ricerca non deve ripresentarle).
alter table public.discovered_offers
  drop constraint if exists discovered_offers_status_check;

alter table public.discovered_offers
  add constraint discovered_offers_status_check
  check (status in ('new', 'watching', 'dismissed', 'applied'));

comment on column public.discovered_offers.status is
  'new = inbox; watching = da tenere d''occhio; dismissed = scartata (non riproporre); applied = candidatura generata';
