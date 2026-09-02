-- Expand application tracking statuses for user workflow.
-- Legacy: draft → ready, archived → closed

alter table public.applications
  drop constraint if exists applications_status_check;

update public.applications set status = 'ready' where status = 'draft';
update public.applications set status = 'closed' where status = 'archived';

alter table public.applications
  add constraint applications_status_check
  check (status in ('ready', 'sent', 'waiting', 'interview', 'closed', 'draft', 'archived'));

comment on column public.applications.status is
  'Workflow: ready (da inviare), sent, waiting, interview, closed. draft/archived kept for legacy rows.';
