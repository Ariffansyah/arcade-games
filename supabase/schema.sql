-- Web Arcade schema.
-- Only Battleships needs the database; every other game runs on
-- Realtime Broadcast + Presence, which are ephemeral and need no tables.

create table public.game_state (
  room_code  text primary key check (room_code ~ '^[0-9]{4}$'),
  game       text not null,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Postgres Changes only streams tables in this publication.
alter publication supabase_realtime add table public.game_state;

alter table public.game_state enable row level security;

-- No auth in this app: anyone holding the 4-digit code can play.
-- The code is the only secret, so anon gets full access to the row.
create policy "anon read"   on public.game_state for select to anon using (true);
create policy "anon insert" on public.game_state for insert to anon with check (true);
create policy "anon update" on public.game_state for update to anon using (true) with check (true);

-- Housekeeping: drop abandoned rooms. Run from pg_cron if you care.
create or replace function public.purge_stale_rooms() returns void language sql as $$
  delete from public.game_state where updated_at < now() - interval '6 hours';
$$;
