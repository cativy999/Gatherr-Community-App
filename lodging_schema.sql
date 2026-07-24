-- ============================================================
-- Beyond Sunday — Lodging Feature Schema
-- Run this in your Supabase SQL editor (Dashboard → SQL editor)
-- ============================================================

-- 1. Lodging Groups
create table if not exists lodging_groups (
  id              uuid        primary key default gen_random_uuid(),
  event_id        uuid        not null references events(id) on delete cascade,
  host_user_id    uuid        not null references auth.users(id),
  group_name      text        not null default '',
  people_count    int         not null default 1,
  rules           text[]      not null default '{}',
  created_at      timestamptz not null default now()
);

-- 2. Lodging Options (Airbnb / Hotel / Custom per group)
create table if not exists lodging_options (
  id                 uuid        primary key default gen_random_uuid(),
  lodging_group_id   uuid        not null references lodging_groups(id) on delete cascade,
  type               text        not null check (type in ('airbnb', 'hotel', 'custom')),
  name               text,
  url                text,
  image_url          text,
  total_cost         numeric,
  nights             int,
  guests_assigned    int         not null default 1,
  max_capacity       int         not null default 10,
  sort_order         int         not null default 0,
  created_at         timestamptz not null default now()
);

-- 3. Sleeping Spaces (rooms within a lodging option)
create table if not exists lodging_sleeping_spaces (
  id                  uuid        primary key default gen_random_uuid(),
  lodging_option_id   uuid        not null references lodging_options(id) on delete cascade,
  name                text        not null,
  size                text        check (size in ('large', 'medium', 'small')),
  sleeps              int         not null default 1,
  sort_order          int         not null default 0,
  created_at          timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- (permissive for now — feature is admin-only in the UI)
-- ============================================================
alter table lodging_groups         enable row level security;
alter table lodging_options        enable row level security;
alter table lodging_sleeping_spaces enable row level security;

create policy "Authenticated users can manage lodging_groups"
  on lodging_groups for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage lodging_options"
  on lodging_options for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage lodging_sleeping_spaces"
  on lodging_sleeping_spaces for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
