-- Soft-delete non deve bloccare nuove candidature con lo stesso fingerprint.
alter table public.applications
  drop constraint if exists applications_user_id_offer_fingerprint_key;

drop index if exists applications_user_id_offer_fingerprint_key;

create unique index if not exists applications_user_id_offer_fingerprint_active_uidx
  on public.applications (user_id, offer_fingerprint)
  where deleted_at is null;
