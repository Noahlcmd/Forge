-- ============================================================
-- Inventory items module
-- ============================================================

create table if not exists public.inventory_items (
  id              uuid default gen_random_uuid() primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  quantity        integer not null default 0,
  unit            text,                  -- e.g. "pcs", "kg", "boxes"
  notes           text,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

create index if not exists inventory_items_org_idx on public.inventory_items(organization_id);

select public.create_updated_at_trigger('inventory_items');

alter table public.inventory_items enable row level security;

create policy "inventory_items_select" on public.inventory_items for select
  using (organization_id in (select public.my_org_ids()));

create policy "inventory_items_insert" on public.inventory_items for insert
  with check (public.is_admin_or_owner(organization_id));

create policy "inventory_items_update" on public.inventory_items for update
  using (organization_id in (select public.my_org_ids()))
  with check (public.is_admin_or_owner(organization_id));

create policy "inventory_items_delete" on public.inventory_items for delete
  using (public.is_admin_or_owner(organization_id));
