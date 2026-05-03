-- Migration 010: Notifications table
-- Stores per-user, org-scoped notifications for activity events.

create table if not exists public.notifications (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete cascade,
  user_id         uuid        not null references public.profiles(id)      on delete cascade,
  title           text        not null,
  description     text,
  link            text,
  read            boolean     not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists notifications_org_user_idx
  on public.notifications(organization_id, user_id, created_at desc);

alter table public.notifications enable row level security;

-- All org members can read notifications for their org
create policy "notifications_select"
  on public.notifications for select
  using (organization_id in (select public.my_org_ids()));

-- Users can only update (mark read) their own notifications
create policy "notifications_update"
  on public.notifications for update
  using (user_id = auth.uid());

-- Users can delete their own notifications
create policy "notifications_delete"
  on public.notifications for delete
  using (user_id = auth.uid());

-- INSERT is done via service role only — no direct user insert
