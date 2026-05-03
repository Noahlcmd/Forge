-- Files: track file links and documents
create table if not exists public.files (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete cascade,
  name            text        not null,
  file_url        text,
  file_type       text,
  file_size       bigint,
  notes           text,
  created_by      uuid        references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);
alter table public.files enable row level security;
create policy "files_org" on public.files
  using (organization_id in (
    select organization_id from public.memberships where user_id = auth.uid()
  ));
grant select, insert, update, delete on public.files to authenticated;

-- CRM Pipeline deals
create table if not exists public.pipeline_deals (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete cascade,
  name            text        not null,
  contact_name    text,
  company         text,
  stage           text        not null default 'new',
  value_cents     integer     not null default 0,
  notes           text,
  created_by      uuid        references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);
alter table public.pipeline_deals enable row level security;
create policy "pipeline_deals_org" on public.pipeline_deals
  using (organization_id in (
    select organization_id from public.memberships where user_id = auth.uid()
  ));
grant select, insert, update, delete on public.pipeline_deals to authenticated;
