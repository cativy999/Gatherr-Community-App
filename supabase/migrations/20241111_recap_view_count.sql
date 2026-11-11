-- Add view_count to event_recaps
alter table event_recaps add column if not exists view_count integer not null default 0;

-- RPC to increment safely (skips internal accounts)
create or replace function increment_recap_views(recap_id uuid, viewer_id uuid default null)
returns void language plpgsql security definer as $$
declare
  internal_ids uuid[] := array[
    '57ff4ff5-bbeb-40f4-a518-4688ba45552c'::uuid,
    '4359038f-435a-455e-b56a-c93d4c93fdc1'::uuid
  ];
begin
  -- Skip if viewer is an internal account
  if viewer_id = any(internal_ids) then
    return;
  end if;
  update event_recaps set view_count = view_count + 1 where id = recap_id;
end;
$$;
