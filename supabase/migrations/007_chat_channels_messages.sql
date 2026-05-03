-- Migration 007: Chat channels + messages for real-time team chat

create table if not exists public.chat_channels (
  id              uuid default gen_random_uuid() primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  slug            text not null,
  description     text,
  is_default      boolean default false,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null,
  unique (organization_id, slug)
);

create index chat_channels_org_idx on public.chat_channels(organization_id);

create table if not exists public.chat_messages (
  id              uuid default gen_random_uuid() primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id      uuid not null references public.chat_channels(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  content         text not null check (char_length(content) <= 4000),
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

create index chat_messages_channel_idx on public.chat_messages(channel_id, created_at desc);
create index chat_messages_org_idx     on public.chat_messages(organization_id);

-- RLS
alter table public.chat_channels enable row level security;
alter table public.chat_messages  enable row level security;

create policy "chat_channels_select" on public.chat_channels for select
  using (organization_id = any(public.my_org_ids()));

create policy "chat_channels_insert" on public.chat_channels for insert
  with check (organization_id = any(public.my_org_ids()));

create policy "chat_channels_update" on public.chat_channels for update
  using (organization_id = any(public.my_org_ids()));

create policy "chat_channels_delete" on public.chat_channels for delete
  using (organization_id = any(public.my_org_ids()) and public.is_admin_or_owner());

create policy "chat_messages_select" on public.chat_messages for select
  using (organization_id = any(public.my_org_ids()));

create policy "chat_messages_insert" on public.chat_messages for insert
  with check (organization_id = any(public.my_org_ids()) and user_id = auth.uid());

create policy "chat_messages_delete" on public.chat_messages for delete
  using (user_id = auth.uid() or public.is_admin_or_owner());
