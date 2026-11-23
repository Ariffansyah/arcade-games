-- Web Arcade — everything the app needs from Postgres.
-- Run this once in the Supabase SQL editor, then again after any change here.

-- ─────────────────────────────────────────────────────────────────────────────
-- Rate limiting
--
-- One row per counter, shared by every Vercel lambda. Only the service role
-- touches it: RLS is on and no policy is granted to anon, so a browser holding
-- the public key cannot read the counters, reset them, or burn somebody else's
-- budget by calling the function with their address.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.rate_limits (
  key      text primary key,
  count    integer     not null default 0,
  reset_at timestamptz not null
);

alter table public.rate_limits enable row level security;
-- Deliberately no policies. The service role bypasses RLS; nobody else gets in.
-- RLS alone makes anon queries come back empty rather than refused, which looks
-- like "no counters" instead of "not your table" — take the grants away too, so
-- a probe gets a permission error and no information at all.
revoke all on table public.rate_limits from anon, authenticated;

create index if not exists rate_limits_reset_at_idx on public.rate_limits (reset_at);

-- Take one token from a window, creating or rolling it over as needed. The
-- whole thing is a single upsert so two lambdas landing together cannot both
-- read "9 of 10" and both decide they are fine.
create or replace function public.take_token(p_key text, p_limit integer, p_window_ms integer)
returns table (allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  row_now  timestamptz := now();
  updated  public.rate_limits%rowtype;
begin
  insert into public.rate_limits as r (key, count, reset_at)
  values (p_key, 1, row_now + make_interval(secs => p_window_ms / 1000.0))
  on conflict (key) do update
    set count = case when r.reset_at <= row_now then 1 else r.count + 1 end,
        reset_at = case
                     when r.reset_at <= row_now
                       then row_now + make_interval(secs => p_window_ms / 1000.0)
                     else r.reset_at
                   end
  returning * into updated;

  -- Cheap opportunistic cleanup; a dead key is a row nobody will ever read.
  if random() < 0.01 then
    delete from public.rate_limits where reset_at < row_now - interval '1 day';
  end if;

  return query
    select updated.count <= p_limit,
           greatest(0, ceil(extract(epoch from (updated.reset_at - row_now))))::integer;
end;
$$;

-- Supabase's default privileges hand every new function to anon as well, so the
-- revoke is what actually closes it; the grant is belt and braces in case those
-- defaults ever change under us.
revoke all on function public.take_token(text, integer, integer) from public, anon, authenticated;
grant execute on function public.take_token(text, integer, integer) to service_role;
grant all on table public.rate_limits to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Game state
--
-- Machine Doodle and Battleships play over the broadcast channel like everything
-- else, and also copy their round into a row so a player who reloads gets the
-- board back.
--
-- With no accounts, a row belongs to whoever knows the room code: the app sends
-- the code in an x-room-code header and every policy matches the row against
-- it, so the public key cannot list live rooms or read one it has no code for.
-- Anyone in the room can still read the row, Battleships fleets included.
--
-- The check constraint keeps a row small and well-formed, so the public key
-- cannot fill the free-tier database with junk.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.game_state (
  room_code  text primary key,
  game       text        not null,
  state      jsonb       not null,
  updated_at timestamptz not null default now()
);

alter table public.game_state drop constraint if exists game_state_sane;
-- NOT VALID so rows written before this check don't block the migration; the sweep clears them.
alter table public.game_state add constraint game_state_sane check (
  room_code ~ '^[ACDEFGHJKMNPQRTUVWXY34679]{6}$'
  and game in ('doodle', 'battleship')
  and octet_length(state::text) <= 65536
) not valid;

alter table public.game_state enable row level security;

create or replace function public.room_header()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('request.headers', true), '')::json ->> 'x-room-code';
$$;

drop policy if exists "anyone may read a room" on public.game_state;
drop policy if exists "players may read their room" on public.game_state;
create policy "players may read their room" on public.game_state
  for select to anon, authenticated using (room_code = public.room_header());

drop policy if exists "anyone may open a room" on public.game_state;
drop policy if exists "players may open their room" on public.game_state;
create policy "players may open their room" on public.game_state
  for insert to anon, authenticated with check (room_code = public.room_header());

drop policy if exists "anyone may play a room" on public.game_state;
drop policy if exists "players may play their room" on public.game_state;
create policy "players may play their room" on public.game_state
  for update to anon, authenticated
  using (room_code = public.room_header())
  with check (room_code = public.room_header());

-- No delete policy: rooms are cleared by the sweep below, not by players.

create index if not exists game_state_updated_at_idx on public.game_state (updated_at);

-- A room nobody has touched in a day is over. Schedule this with pg_cron if the
-- extension is available, or call it from anywhere on a timer:
--   select cron.schedule('arcade-sweep', '17 * * * *', 'select public.sweep_rooms()');
create or replace function public.sweep_rooms()
returns integer
language sql
security definer
set search_path = public
as $$
  with gone as (
    delete from public.game_state where updated_at < now() - interval '1 day' returning 1
  )
  select count(*)::integer from gone;
$$;

revoke all on function public.sweep_rooms() from public, anon, authenticated;
grant execute on function public.sweep_rooms() to service_role;
