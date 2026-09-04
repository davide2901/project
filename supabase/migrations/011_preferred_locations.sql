-- Preferenze di luogo per la ricerca offerte (città, regioni, remoto…).
alter table public.profiles
  add column if not exists preferred_locations text[] not null default '{}';

comment on column public.profiles.preferred_locations is
  'Luoghi preferiti (città, regioni, remoto, ibrido). Usati dalla discovery e dai filtri Home.';
