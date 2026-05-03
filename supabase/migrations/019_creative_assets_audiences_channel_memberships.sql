-- ============================================================
-- Migration 019: creative_assets, audiences, channel_memberships
--
-- These tables were referenced by API routes but had no migration.
-- All three include organization_id NOT NULL + RLS for full tenant isolation.
-- ============================================================

-- ── creative_assets ──────────────────────────────────────────
-- Stores uploaded ad creatives (images, videos, PDFs).
-- org_id scopes files; file_path scoped under orgId/ prefix in storage.

create table if not exists public.creative_assets (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete cascade,
  name            text        not null,
  file_path       text        not null,           -- storage path: <orgId>/<uuid>.<ext>
  file_type       text,
  file_size       bigint,
  public_url      text,
  campaign_id     uuid        references public.campaigns(id) on delete set null,
  uploaded_by     uuid        references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists creative_assets_org_idx      on public.creative_assets(organization_id);
create index if not exists creative_assets_campaign_idx on public.creative_assets(campaign_id);

alter table public.creative_assets enable row level security;

-- All org members can read/write creatives; service role handles storage deletes
create policy "creative_assets_select" on public.creative_assets for select
  using (organization_id in (select public.my_org_ids()));

create policy "creative_assets_insert" on public.creative_assets for insert
  with check (organization_id in (select public.my_org_ids()));

create policy "creative_assets_update" on public.creative_assets for update
  using (organization_id in (select public.my_org_ids()))
  with check (public.is_admin_or_owner(organization_id));

create policy "creative_assets_delete" on public.creative_assets for delete
  using (public.is_admin_or_owner(organization_id));

grant select, insert, update, delete on public.creative_assets to authenticated;


-- ── audiences ────────────────────────────────────────────────
-- Saved audience definitions used for ad targeting.

create table if not exists public.audiences (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete cascade,
  name            text        not null,
  locations       text[]      not null default '{}',
  industries      text[]      not null default '{}',
  company_sizes   text[]      not null default '{}',
  job_titles      text[]      not null default '{}',
  platforms       text[]      not null default '{}',
  estimated_size  integer,
  created_by      uuid        references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists audiences_org_idx on public.audiences(organization_id);

select public.create_updated_at_trigger('audiences');

alter table public.audiences enable row level security;

create policy "audiences_select" on public.audiences for select
  using (organization_id in (select public.my_org_ids()));

create policy "audiences_insert" on public.audiences for insert
  with check (organization_id in (select public.my_org_ids()));

create policy "audiences_update" on public.audiences for update
  using (organization_id in (select public.my_org_ids()))
  with check (public.is_admin_or_owner(organization_id));

create policy "audiences_delete" on public.audiences for delete
  using (public.is_admin_or_owner(organization_id));

grant select, insert, update, delete on public.audiences to authenticated;


-- ── channel_memberships ───────────────────────────────────────
-- Tracks per-user membership state in chat channels (e.g. left_at).
-- organization_id denormalised from the channel for RLS enforcement.

create table if not exists public.channel_memberships (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete cascade,
  channel_id      uuid        not null references public.chat_channels(id) on delete cascade,
  user_id         uuid        not null references public.profiles(id)      on delete cascade,
  left_at         timestamptz,
  created_at      timestamptz not null default now(),
  unique (channel_id, user_id)
);

create index if not exists channel_memberships_org_idx     on public.channel_memberships(organization_id);
create index if not exists channel_memberships_channel_idx on public.channel_memberships(channel_id);
create index if not exists channel_memberships_user_idx    on public.channel_memberships(user_id);

alter table public.channel_memberships enable row level security;

-- Members can read their own org's memberships
create policy "channel_memberships_select" on public.channel_memberships for select
  using (organization_id in (select public.my_org_ids()));

-- Users can update their own membership row (e.g. set left_at)
create policy "channel_memberships_insert" on public.channel_memberships for insert
  with check (organization_id in (select public.my_org_ids()) and user_id = auth.uid());

create policy "channel_memberships_update" on public.channel_memberships for update
  using (organization_id in (select public.my_org_ids()) and user_id = auth.uid());

grant select, insert, update, delete on public.channel_memberships to authenticated;
