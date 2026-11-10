-- Event Recaps feature
-- Run this in your Supabase SQL editor

-- Table: event_recaps
-- One recap per event (host creates it after event ends)
create table if not exists public.event_recaps (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(event_id)   -- only one recap per event
);

-- Table: recap_photos
-- Up to 10 photos per recap
create table if not exists public.recap_photos (
  id          uuid primary key default gen_random_uuid(),
  recap_id    uuid not null references public.event_recaps(id) on delete cascade,
  photo_url   text not null,
  order_index int not null default 0,
  created_at  timestamptz not null default now()
);

-- Indexes
create index if not exists recap_photos_recap_id_idx on public.recap_photos(recap_id);
create index if not exists event_recaps_event_id_idx on public.event_recaps(event_id);
create index if not exists event_recaps_created_at_idx on public.event_recaps(created_at desc);

-- RLS
alter table public.event_recaps enable row level security;
alter table public.recap_photos  enable row level security;

-- event_recaps: anyone can read; only creator can insert/update/delete
create policy "anyone can read recaps"
  on public.event_recaps for select using (true);

create policy "host can insert recap"
  on public.event_recaps for insert
  with check (auth.uid() = created_by);

create policy "host can delete own recap"
  on public.event_recaps for delete
  using (auth.uid() = created_by);

-- recap_photos: anyone can read; recap creator can manage
create policy "anyone can read recap photos"
  on public.recap_photos for select using (true);

create policy "recap creator can insert photos"
  on public.recap_photos for insert
  with check (
    auth.uid() = (
      select created_by from public.event_recaps where id = recap_id
    )
  );

create policy "recap creator can delete photos"
  on public.recap_photos for delete
  using (
    auth.uid() = (
      select created_by from public.event_recaps where id = recap_id
    )
  );

-- Storage bucket: recap-photos
-- Run this separately in the Supabase dashboard Storage section,
-- or via the API. Bucket should be PUBLIC (photos are viewable by all).
-- insert into storage.buckets (id, name, public) values ('recap-photos', 'recap-photos', true);

-- Storage policies for recap-photos bucket
-- create policy "Public read recap photos" on storage.objects for select using (bucket_id = 'recap-photos');
-- create policy "Auth users upload recap photos" on storage.objects for insert with check (bucket_id = 'recap-photos' and auth.role() = 'authenticated');
-- create policy "Auth users delete own recap photos" on storage.objects for delete using (bucket_id = 'recap-photos' and auth.uid()::text = (storage.foldername(name))[1]);
