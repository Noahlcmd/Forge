-- ============================================================
-- Migration 018: All missing workspace module tables
-- + fix notifications.user_id nullable
-- + add missing columns to pre-existing projects table
-- ============================================================

-- projects table existed from a prior session without client_name/budget/notes
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS budget      integer,
  ADD COLUMN IF NOT EXISTS notes       text;

-- ── projects ─────────────────────────────────────────────────
create table if not exists public.projects (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete cascade,
  name            text        not null,
  status          text        not null default 'active'
                                check (status in ('active', 'completed', 'on_hold', 'cancelled')),
  client_name     text,
  due_date        date,
  budget          integer,    -- whole monetary units (e.g. 5000 = $5,000)
  notes           text,
  created_by      uuid        references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists projects_org_idx on public.projects(organization_id);
select public.create_updated_at_trigger('projects');

alter table public.projects enable row level security;

create policy "projects_select" on public.projects for select
  using (organization_id in (select public.my_org_ids()));
create policy "projects_insert" on public.projects for insert
  with check (organization_id in (select public.my_org_ids()));
create policy "projects_update" on public.projects for update
  using (organization_id in (select public.my_org_ids()));
create policy "projects_delete" on public.projects for delete
  using (organization_id in (select public.my_org_ids()));

grant select, insert, update, delete on public.projects to authenticated;

-- ── tasks ────────────────────────────────────────────────────
create table if not exists public.tasks (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete cascade,
  title           text        not null,
  status          text        not null default 'todo'
                                check (status in ('todo', 'in_progress', 'done')),
  due_date        date,
  notes           text,
  created_by      uuid        references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists tasks_org_idx on public.tasks(organization_id);
select public.create_updated_at_trigger('tasks');

alter table public.tasks enable row level security;

create policy "tasks_select" on public.tasks for select
  using (organization_id in (select public.my_org_ids()));
create policy "tasks_insert" on public.tasks for insert
  with check (organization_id in (select public.my_org_ids()));
create policy "tasks_update" on public.tasks for update
  using (organization_id in (select public.my_org_ids()));
create policy "tasks_delete" on public.tasks for delete
  using (organization_id in (select public.my_org_ids()));

grant select, insert, update, delete on public.tasks to authenticated;

-- ── notes ────────────────────────────────────────────────────
create table if not exists public.notes (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete cascade,
  title           text        not null,
  content         text        not null default '',
  created_by      uuid        references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists notes_org_idx on public.notes(organization_id);
select public.create_updated_at_trigger('notes');

alter table public.notes enable row level security;

create policy "notes_select" on public.notes for select
  using (organization_id in (select public.my_org_ids()));
create policy "notes_insert" on public.notes for insert
  with check (organization_id in (select public.my_org_ids()));
create policy "notes_update" on public.notes for update
  using (organization_id in (select public.my_org_ids()));
create policy "notes_delete" on public.notes for delete
  using (organization_id in (select public.my_org_ids()));

grant select, insert, update, delete on public.notes to authenticated;

-- ── equipment ────────────────────────────────────────────────
create table if not exists public.equipment (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete cascade,
  name            text        not null,
  status          text        not null default 'active'
                                check (status in ('active', 'maintenance', 'retired')),
  serial_number   text,
  location        text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists equipment_org_idx on public.equipment(organization_id);
select public.create_updated_at_trigger('equipment');

alter table public.equipment enable row level security;

create policy "equipment_select" on public.equipment for select
  using (organization_id in (select public.my_org_ids()));
create policy "equipment_insert" on public.equipment for insert
  with check (organization_id in (select public.my_org_ids()));
create policy "equipment_update" on public.equipment for update
  using (organization_id in (select public.my_org_ids()));
create policy "equipment_delete" on public.equipment for delete
  using (organization_id in (select public.my_org_ids()));

grant select, insert, update, delete on public.equipment to authenticated;

-- ── suppliers ────────────────────────────────────────────────
create table if not exists public.suppliers (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete cascade,
  name            text        not null,
  contact_name    text,
  email           text,
  phone           text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists suppliers_org_idx on public.suppliers(organization_id);
select public.create_updated_at_trigger('suppliers');

alter table public.suppliers enable row level security;

create policy "suppliers_select" on public.suppliers for select
  using (organization_id in (select public.my_org_ids()));
create policy "suppliers_insert" on public.suppliers for insert
  with check (organization_id in (select public.my_org_ids()));
create policy "suppliers_update" on public.suppliers for update
  using (organization_id in (select public.my_org_ids()));
create policy "suppliers_delete" on public.suppliers for delete
  using (organization_id in (select public.my_org_ids()));

grant select, insert, update, delete on public.suppliers to authenticated;

-- ── wiki_pages (idempotent — may already exist) ───────────────
create table if not exists public.wiki_pages (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete cascade,
  title           text        not null,
  slug            text        not null,
  content         text        not null default '',
  created_by      uuid        references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, slug)
);

create index if not exists wiki_pages_org_idx on public.wiki_pages(organization_id);

do $$ begin
  perform public.create_updated_at_trigger('wiki_pages');
exception when others then null; end $$;

alter table public.wiki_pages enable row level security;

do $$ begin
  create policy "wiki_pages_select" on public.wiki_pages for select
    using (organization_id in (select public.my_org_ids()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "wiki_pages_insert" on public.wiki_pages for insert
    with check (organization_id in (select public.my_org_ids()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "wiki_pages_update" on public.wiki_pages for update
    using (organization_id in (select public.my_org_ids()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "wiki_pages_delete" on public.wiki_pages for delete
    using (organization_id in (select public.my_org_ids()));
exception when duplicate_object then null; end $$;

grant select, insert, update, delete on public.wiki_pages to authenticated;

-- ── Fix notifications: make user_id nullable ─────────────────
-- org-level events (new deal, new project, etc.) are not tied to a specific user
alter table public.notifications
  alter column user_id drop not null;

-- Fix the update policy to allow null user_id rows to be updated by admins
drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications for update
  using (
    user_id = auth.uid()
    or user_id is null   -- org-wide notifications can be marked read by any member
  );

-- Ensure insert is allowed via admin client (service role bypasses RLS)
grant select, insert, update, delete on public.notifications to authenticated;
