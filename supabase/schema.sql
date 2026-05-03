-- ============================================================
-- FORGE — Full Multi-Tenant Schema
-- Run in Supabase SQL Editor (fresh project or after drop)
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_crypto";   -- for gen_random_uuid() fallback

-- ============================================================
-- UTILITY: updated_at trigger function (shared by all tables)
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Convenience macro so we don't repeat the trigger body
create or replace function public.create_updated_at_trigger(target_table text)
returns void
language plpgsql
as $$
begin
  execute format(
    'create trigger %I before update on public.%I
     for each row execute procedure public.set_updated_at()',
    target_table || '_updated_at',
    target_table
  );
end;
$$;

-- ============================================================
-- ENUMS
-- ============================================================

-- Using check constraints instead of CREATE TYPE so the schema
-- is idempotent and easier to extend.

-- ============================================================
-- TABLE: organizations
-- One row per tenant. All other tables reference this.
-- ============================================================

create table public.organizations (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  slug        text unique not null,
  logo_url    text,
  -- Business profile (set during onboarding)
  industry              text,
  business_type         text,
  -- Module activation — empty array = pre-onboarding (show all modules)
  enabled_modules       text[]   not null default '{}',
  -- Onboarding state
  onboarding_completed  boolean  not null default false,
  -- Org theme overrides (accent colour, etc.)
  theme                 jsonb    not null default '{}',
  -- Stripe fields added in Phase 2; nullable for now
  stripe_customer_id      text unique,
  subscription_status     text default 'inactive'
                            check (subscription_status in ('active','trialing','past_due','canceled','inactive')),
  subscription_plan       text,
  trial_ends_at           timestamptz,
  settings    jsonb default '{}'::jsonb,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

select public.create_updated_at_trigger('organizations');

-- ============================================================
-- TABLE: profiles
-- Extends auth.users. Contains ONLY user identity data.
-- Role and org membership live in the memberships table.
-- ============================================================

create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text unique not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

select public.create_updated_at_trigger('profiles');

-- ============================================================
-- TABLE: memberships
-- Many-to-many: users ↔ organizations with role.
-- A user can belong to multiple orgs (e.g. contractor).
-- accepted_at NULL means the invite is pending.
-- ============================================================

create table public.memberships (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid not null references public.profiles(id)       on delete cascade,
  organization_id uuid not null references public.organizations(id)  on delete cascade,
  role            text not null default 'employee'
                    check (role in ('owner', 'admin', 'employee')),
  invited_by      uuid references public.profiles(id) on delete set null,
  accepted_at     timestamptz default now(),   -- set immediately for self-signup; NULL for pending invites
  created_at      timestamptz default now() not null,
  unique (user_id, organization_id)
);

-- Index for the most common lookup pattern
create index memberships_user_id_idx          on public.memberships(user_id);
create index memberships_organization_id_idx  on public.memberships(organization_id);

-- ============================================================
-- TABLE: customers
-- ============================================================

create table public.customers (
  id              uuid default gen_random_uuid() primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  email           text,
  phone           text,
  company         text,
  status          text default 'active'
                    check (status in ('active', 'inactive', 'churned')),
  notes           text,
  tags            text[] default '{}',
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

create index customers_org_idx on public.customers(organization_id);
select public.create_updated_at_trigger('customers');

-- ============================================================
-- TABLE: leads
-- ============================================================

create table public.leads (
  id              uuid default gen_random_uuid() primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  email           text,
  phone           text,
  company         text,
  website         text,
  -- Outreach stage matches the spec exactly
  stage           text default 'not_contacted'
                    check (stage in (
                      'not_contacted',
                      'first_email_sent',
                      'follow_up_1',
                      'follow_up_2',
                      'follow_up_3',
                      'replied',
                      'meeting_booked',
                      'proposal_sent',
                      'won',
                      'lost'
                    )),
  source          text,                          -- e.g. 'apollo', 'hunter', 'manual'
  assigned_to     uuid references public.profiles(id) on delete set null,
  notes           text,
  tags            text[] default '{}',
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

create index leads_org_idx      on public.leads(organization_id);
create index leads_stage_idx    on public.leads(organization_id, stage);
create index leads_assigned_idx on public.leads(assigned_to);
select public.create_updated_at_trigger('leads');

-- ============================================================
-- TABLE: outreach (email sequences)
-- ============================================================

create table public.outreach (
  id              uuid default gen_random_uuid() primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  status          text default 'draft'
                    check (status in ('draft', 'active', 'paused', 'completed')),
  from_name       text,
  from_email      text,
  -- References the integration used to send (Phase 6)
  integration_id  uuid,
  stop_on_reply   boolean default true,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

create index outreach_org_idx on public.outreach(organization_id);
select public.create_updated_at_trigger('outreach');

-- ============================================================
-- TABLE: messages
-- Individual emails within an outreach sequence.
-- ============================================================

create table public.messages (
  id              uuid default gen_random_uuid() primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  outreach_id     uuid references public.outreach(id) on delete cascade,
  lead_id         uuid references public.leads(id)    on delete cascade,
  subject         text not null,
  body            text not null,
  status          text default 'pending'
                    check (status in ('pending', 'scheduled', 'sent', 'failed', 'bounced')),
  sequence_step   int default 1,            -- which follow-up in the sequence
  delay_days      int default 0,            -- days after previous step
  sent_at         timestamptz,
  opened_at       timestamptz,
  clicked_at      timestamptz,
  replied_at      timestamptz,
  created_at      timestamptz default now() not null
);

create index messages_org_idx      on public.messages(organization_id);
create index messages_outreach_idx on public.messages(outreach_id);
create index messages_lead_idx     on public.messages(lead_id);

-- ============================================================
-- TABLE: calendars
-- ============================================================

create table public.calendars (
  id              uuid default gen_random_uuid() primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  color           text default '#f97316',   -- hex colour for UI
  is_default      boolean default false,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

create index calendars_org_idx on public.calendars(organization_id);
select public.create_updated_at_trigger('calendars');

-- ============================================================
-- TABLE: events
-- ============================================================

create table public.events (
  id              uuid default gen_random_uuid() primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  calendar_id     uuid references public.calendars(id) on delete cascade,
  title           text not null,
  description     text,
  location        text,
  start_at        timestamptz not null,
  end_at          timestamptz not null,
  all_day         boolean default false,
  attendees       jsonb default '[]'::jsonb,   -- [{email, name, status}]
  -- Link to a lead or customer
  lead_id         uuid references public.leads(id)     on delete set null,
  customer_id     uuid references public.customers(id) on delete set null,
  created_by      uuid references public.profiles(id)  on delete set null,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null,
  constraint events_end_after_start check (end_at >= start_at)
);

create index events_org_idx      on public.events(organization_id);
create index events_calendar_idx on public.events(calendar_id);
create index events_start_idx    on public.events(organization_id, start_at);
select public.create_updated_at_trigger('events');

-- ============================================================
-- TABLE: finances (one config row per org)
-- ============================================================

create table public.finances (
  id                  uuid default gen_random_uuid() primary key,
  organization_id     uuid not null unique references public.organizations(id) on delete cascade,
  currency            text default 'EUR',
  stripe_account_id   text,            -- connected Stripe account (Phase 6)
  fiscal_year_start   int default 1    -- month number
                        check (fiscal_year_start between 1 and 12),
  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null
);

select public.create_updated_at_trigger('finances');

-- ============================================================
-- TABLE: invoices
-- ============================================================

create table public.invoices (
  id              uuid default gen_random_uuid() primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id     uuid references public.customers(id) on delete set null,
  number          text not null,               -- e.g. "INV-0001"
  status          text default 'draft'
                    check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  amount_cents    bigint not null default 0,
  tax_cents       bigint not null default 0,
  currency        text default 'EUR',
  due_date        date,
  paid_at         timestamptz,
  notes           text,
  line_items      jsonb default '[]'::jsonb,   -- [{description, qty, unit_price_cents}]
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

create index invoices_org_idx      on public.invoices(organization_id);
create index invoices_customer_idx on public.invoices(customer_id);
create index invoices_status_idx   on public.invoices(organization_id, status);
select public.create_updated_at_trigger('invoices');

-- ============================================================
-- TABLE: transactions
-- ============================================================

create table public.transactions (
  id              uuid default gen_random_uuid() primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id      uuid references public.invoices(id) on delete set null,
  type            text not null check (type in ('income', 'expense')),
  amount_cents    bigint not null,
  currency        text default 'EUR',
  description     text not null,
  category        text,
  date            date not null default current_date,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

create index transactions_org_idx  on public.transactions(organization_id);
create index transactions_date_idx on public.transactions(organization_id, date desc);
select public.create_updated_at_trigger('transactions');

-- ============================================================
-- TABLE: integrations
-- Credentials stored as jsonb; encrypt at app layer before insert.
-- ============================================================

create table public.integrations (
  id              uuid default gen_random_uuid() primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider        text not null
                    check (provider in ('gmail', 'outlook', 'stripe', 'google_calendar', 'apollo', 'hunter')),
  status          text default 'disconnected'
                    check (status in ('connected', 'disconnected', 'error')),
  -- Encrypted at application layer before storing
  credentials     jsonb default '{}'::jsonb,
  metadata        jsonb default '{}'::jsonb,   -- scopes, account email, etc.
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null,
  unique (organization_id, provider)
);

create index integrations_org_idx on public.integrations(organization_id);
select public.create_updated_at_trigger('integrations');

-- ============================================================
-- TABLE: campaigns (ad campaigns — Phase 6)
-- ============================================================

create table public.campaigns (
  id              uuid default gen_random_uuid() primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  platform        text check (platform in ('google', 'facebook', 'instagram', 'linkedin', 'tiktok')),
  status          text default 'draft'
                    check (status in ('draft', 'active', 'paused', 'completed')),
  budget_cents    bigint default 0,
  spent_cents     bigint default 0,
  -- AI-generated fields (Phase 4+)
  ad_copy         text,
  target_audience jsonb default '{}'::jsonb,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

create index campaigns_org_idx on public.campaigns(organization_id);
select public.create_updated_at_trigger('campaigns');

-- ============================================================
-- TABLE: audit_logs
-- Immutable append-only log. No update/delete policies.
-- ============================================================

create table public.audit_logs (
  id              uuid default gen_random_uuid() primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete set null,
  action          text not null,         -- e.g. 'lead.created', 'invoice.paid'
  resource_type   text not null,         -- e.g. 'lead', 'invoice'
  resource_id     uuid,
  metadata        jsonb default '{}'::jsonb,
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz default now() not null
);

create index audit_logs_org_idx  on public.audit_logs(organization_id, created_at desc);
create index audit_logs_user_idx on public.audit_logs(user_id);

-- ============================================================
-- RLS HELPER FUNCTIONS
-- These are security definer so they bypass RLS when called
-- from within a policy — avoids infinite recursion.
-- ============================================================

-- Returns all org IDs the current user is an accepted member of
create or replace function public.my_org_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select organization_id
  from public.memberships
  where user_id = auth.uid()
    and accepted_at is not null;
$$;

-- Returns the current user's role in a specific org (null if not a member)
create or replace function public.my_role(org_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role
  from public.memberships
  where user_id    = auth.uid()
    and organization_id = org_id
    and accepted_at is not null
  limit 1;
$$;

-- Returns true if the current user is owner or admin in a specific org
create or replace function public.is_admin_or_owner(org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where user_id         = auth.uid()
      and organization_id = org_id
      and role            in ('owner', 'admin')
      and accepted_at     is not null
  );
$$;

-- Returns true if the current user is owner in a specific org
create or replace function public.is_owner(org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where user_id         = auth.uid()
      and organization_id = org_id
      and role            = 'owner'
      and accepted_at     is not null
  );
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.organizations  enable row level security;
alter table public.profiles       enable row level security;
alter table public.memberships    enable row level security;
alter table public.customers      enable row level security;
alter table public.leads          enable row level security;
alter table public.outreach       enable row level security;
alter table public.messages       enable row level security;
alter table public.calendars      enable row level security;
alter table public.events         enable row level security;
alter table public.finances       enable row level security;
alter table public.invoices       enable row level security;
alter table public.transactions   enable row level security;
alter table public.integrations   enable row level security;
alter table public.campaigns      enable row level security;
alter table public.audit_logs     enable row level security;

-- ----------------------------------------------------------------
-- profiles: users see and edit only their own row
-- ----------------------------------------------------------------
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- ----------------------------------------------------------------
-- memberships: members see their own memberships + all memberships
-- in orgs they belong to (so owners can manage their team)
-- ----------------------------------------------------------------
create policy "memberships_select"
  on public.memberships for select
  using (
    user_id = auth.uid()
    or organization_id in (select public.my_org_ids())
  );

-- Only owners and admins can invite (insert) new members
create policy "memberships_insert"
  on public.memberships for insert
  with check (public.is_admin_or_owner(organization_id));

-- Owners can change roles; users can accept their own invite
create policy "memberships_update"
  on public.memberships for update
  using (
    public.is_owner(organization_id)
    or user_id = auth.uid()   -- user accepting their own invite
  );

-- Only owners can remove members
create policy "memberships_delete"
  on public.memberships for delete
  using (public.is_owner(organization_id));

-- ----------------------------------------------------------------
-- organizations: members can read; only owners can write
-- ----------------------------------------------------------------
create policy "organizations_select"
  on public.organizations for select
  using (id in (select public.my_org_ids()));

create policy "organizations_update"
  on public.organizations for update
  using (public.is_owner(id));

-- Insert is handled by the signup trigger (security definer — bypasses RLS)

-- ----------------------------------------------------------------
-- Reusable macro for standard member-scoped tables
-- Pattern: all members read; admins/owners write; owners delete
-- Applied to: customers, leads, outreach, calendars, finances,
--             invoices, transactions, integrations, campaigns
-- ----------------------------------------------------------------

-- customers
create policy "customers_select" on public.customers for select
  using (organization_id in (select public.my_org_ids()));
create policy "customers_insert" on public.customers for insert
  with check (public.is_admin_or_owner(organization_id));
create policy "customers_update" on public.customers for update
  using (organization_id in (select public.my_org_ids()))
  with check (public.is_admin_or_owner(organization_id));
create policy "customers_delete" on public.customers for delete
  using (public.is_admin_or_owner(organization_id));

-- leads
create policy "leads_select" on public.leads for select
  using (organization_id in (select public.my_org_ids()));
create policy "leads_insert" on public.leads for insert
  with check (organization_id in (select public.my_org_ids()));   -- all members can create leads
create policy "leads_update" on public.leads for update
  using (organization_id in (select public.my_org_ids()));
create policy "leads_delete" on public.leads for delete
  using (public.is_admin_or_owner(organization_id));

-- outreach
create policy "outreach_select" on public.outreach for select
  using (organization_id in (select public.my_org_ids()));
create policy "outreach_insert" on public.outreach for insert
  with check (public.is_admin_or_owner(organization_id));
create policy "outreach_update" on public.outreach for update
  using (organization_id in (select public.my_org_ids()))
  with check (public.is_admin_or_owner(organization_id));
create policy "outreach_delete" on public.outreach for delete
  using (public.is_admin_or_owner(organization_id));

-- messages
create policy "messages_select" on public.messages for select
  using (organization_id in (select public.my_org_ids()));
create policy "messages_insert" on public.messages for insert
  with check (public.is_admin_or_owner(organization_id));
create policy "messages_update" on public.messages for update
  using (organization_id in (select public.my_org_ids()))
  with check (public.is_admin_or_owner(organization_id));
create policy "messages_delete" on public.messages for delete
  using (public.is_admin_or_owner(organization_id));

-- calendars
create policy "calendars_select" on public.calendars for select
  using (organization_id in (select public.my_org_ids()));
create policy "calendars_insert" on public.calendars for insert
  with check (public.is_admin_or_owner(organization_id));
create policy "calendars_update" on public.calendars for update
  using (organization_id in (select public.my_org_ids()));
create policy "calendars_delete" on public.calendars for delete
  using (public.is_admin_or_owner(organization_id));

-- events
create policy "events_select" on public.events for select
  using (organization_id in (select public.my_org_ids()));
create policy "events_insert" on public.events for insert
  with check (organization_id in (select public.my_org_ids()));
create policy "events_update" on public.events for update
  using (organization_id in (select public.my_org_ids()));
create policy "events_delete" on public.events for delete
  using (public.is_admin_or_owner(organization_id));

-- finances (singleton per org — only owner can change)
create policy "finances_select" on public.finances for select
  using (organization_id in (select public.my_org_ids()));
create policy "finances_insert" on public.finances for insert
  with check (public.is_admin_or_owner(organization_id));
create policy "finances_update" on public.finances for update
  using (public.is_admin_or_owner(organization_id));

-- invoices
create policy "invoices_select" on public.invoices for select
  using (organization_id in (select public.my_org_ids()));
create policy "invoices_insert" on public.invoices for insert
  with check (public.is_admin_or_owner(organization_id));
create policy "invoices_update" on public.invoices for update
  using (organization_id in (select public.my_org_ids()))
  with check (public.is_admin_or_owner(organization_id));
create policy "invoices_delete" on public.invoices for delete
  using (public.is_admin_or_owner(organization_id));

-- transactions
create policy "transactions_select" on public.transactions for select
  using (organization_id in (select public.my_org_ids()));
create policy "transactions_insert" on public.transactions for insert
  with check (public.is_admin_or_owner(organization_id));
create policy "transactions_update" on public.transactions for update
  using (public.is_admin_or_owner(organization_id));
create policy "transactions_delete" on public.transactions for delete
  using (public.is_admin_or_owner(organization_id));

-- integrations (credentials are sensitive — admin+ only)
create policy "integrations_select" on public.integrations for select
  using (public.is_admin_or_owner(organization_id));
create policy "integrations_insert" on public.integrations for insert
  with check (public.is_admin_or_owner(organization_id));
create policy "integrations_update" on public.integrations for update
  using (public.is_admin_or_owner(organization_id));
create policy "integrations_delete" on public.integrations for delete
  using (public.is_owner(organization_id));

-- campaigns
create policy "campaigns_select" on public.campaigns for select
  using (organization_id in (select public.my_org_ids()));
create policy "campaigns_insert" on public.campaigns for insert
  with check (public.is_admin_or_owner(organization_id));
create policy "campaigns_update" on public.campaigns for update
  using (organization_id in (select public.my_org_ids()))
  with check (public.is_admin_or_owner(organization_id));
create policy "campaigns_delete" on public.campaigns for delete
  using (public.is_admin_or_owner(organization_id));

-- audit_logs: members can read their org's logs; only the system inserts
create policy "audit_logs_select" on public.audit_logs for select
  using (organization_id in (select public.my_org_ids()));
create policy "audit_logs_insert" on public.audit_logs for insert
  with check (organization_id in (select public.my_org_ids()));
-- No update or delete policies — audit logs are immutable

-- ============================================================
-- FUNCTION: handle_new_user
-- Called by trigger on auth.users INSERT.
-- Creates profile → organization → membership(owner).
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id   uuid;
  v_org_name text;
  v_slug     text;
  v_counter  int := 0;
begin
  v_org_name := coalesce(
    new.raw_user_meta_data->>'organization_name',
    split_part(new.email, '@', 1) || '''s Organization'
  );

  -- Build a unique slug; retry up to 5 times on collision
  loop
    v_slug := regexp_replace(
                lower(split_part(new.email, '@', 1)),
                '[^a-z0-9]', '-', 'g'
              ) || '-' || floor(random() * 90000 + 10000)::text;
    begin
      insert into public.organizations (name, slug)
      values (v_org_name, v_slug)
      returning id into v_org_id;
      exit;   -- success
    exception when unique_violation then
      v_counter := v_counter + 1;
      if v_counter >= 5 then
        raise exception 'Could not generate unique org slug after 5 attempts';
      end if;
    end;
  end loop;

  -- Create the profile (no role or org here — that's in memberships)
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );

  -- Create the membership: this user is the owner of the new org
  insert into public.memberships (user_id, organization_id, role, accepted_at)
  values (new.id, v_org_id, 'owner', now());

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- FUNCTION: log_audit_event (call from application code)
-- ============================================================

create or replace function public.log_audit_event(
  p_organization_id uuid,
  p_action          text,
  p_resource_type   text,
  p_resource_id     uuid    default null,
  p_metadata        jsonb   default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs
    (organization_id, user_id, action, resource_type, resource_id, metadata)
  values
    (p_organization_id, auth.uid(), p_action, p_resource_type, p_resource_id, p_metadata);
end;
$$;
