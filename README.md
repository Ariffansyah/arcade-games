# Web Arcade

Party mini-games for two people or a roomful, behind one room code. No accounts,
no installs: open a room, send the link, play. Half the cabinets are co-op —
you are on the same side, and nobody keeps score against anybody.

## Running it

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # node --test over lib/
pnpm build        # production build
```

### Environment

| Variable | Needed for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | every room | Supabase project URL. Baked into the bundle at **build** time. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | every room | Anon key. Public by design, and it reaches Postgres as well as realtime — see the note under `game_state`. |
| `SUPABASE_SERVICE_ROLE_KEY` | rate limits | Server-side only, never `NEXT_PUBLIC_`. Without it the caps are per lambda, which on Vercel is barely a cap. |
| `DOODLE_DAILY_CAP` | optional | Drawings the whole app may buy per day. Defaults to 400. |
| `GROQ_API_KEY` | Machine Doodle | Server-side only. Leave it out and that one cabinet reports itself off duty. |
| `GROQ_MODEL` | optional | Pin a model id instead of picking one from the account. |
| `IMPOSTER_SECRET` | Imposter | Any random string. Roles are derived from it server-side. |

`NEXT_PUBLIC_*` values are inlined when the bundle is built — setting them on an
already-running deployment does nothing until you rebuild.

Copy `.env.example` to `.env.local` and fill it in; the template lists every
variable and what happens without it. `.env.local` is gitignored, the template
is not, so keep real keys out of the template.

Run `supabase/schema.sql` in the Supabase SQL editor before the first deploy. It
creates `rate_limits` and `game_state`, turns row-level security on for both,
and installs the `take_token` function the limiter calls.

## The cabinets

Fifteen games, listed in `lib/games.ts`. Each one is a component in
`components/games/` plus a pure rules module in `lib/` with a `node --test`
file beside it. `mood: "co-op"` marks the ones you play together — the menu
filters on it.

Adding one: write `lib/<game>.ts` (+ test), write the component, add an entry to
`GAMES` and a line to `CABINETS` in `components/Lobby.tsx`. Nothing else knows
games exist.

### How a round is kept in sync

Every game runs on Supabase broadcast, one channel per game per room, and one of
two patterns:

- **Host-authoritative** — the first player in join order holds the table state
  and republishes it after every action (Scatter, Fuse, Same Page, Bomb Squad, Mayday).
- **Beacon** — everybody shouts their own state a few times a second and each
  client renders the merge (Type Race, Tug of War).

A beacon's payload lives in a ref, never in the interval's dependency array: a
value that changes every frame tears the interval down and rebuilds it faster
than it can fire, and the other screens see nothing until you stop moving.

## Security posture

Public-facing, no login, so the perimeter is deliberately small:

- **CSP with a per-request nonce** (`proxy.ts`) — `strict-dynamic`, no inline
  script without the nonce, `frame-ancestors 'none'`. Pages render per request
  (`export const dynamic` in `app/layout.tsx`) because a cached page would ship a
  stale nonce and no script would run at all.
- **Security headers** (`next.config.ts`) — nosniff, HSTS, referrer policy, a
  permissions policy that gives away camera/mic/location, and `noindex` +
  `no-store` on `/room/*` so rooms never land in a search result or a proxy cache.
- **Room codes** are six characters from `crypto.getRandomValues` (~10⁹) — a
  stranger cannot walk the space looking for a room. Four-digit codes are no
  longer routed; that space is 10,000 wide and walkable in a minute.
- **Rate limits** on both API routes (`lib/ratelimit.ts`), because the doodle
  route spends a paid key. Counters live in Postgres behind the service-role key,
  so every lambda shares one window, and the caller key comes from the headers
  Vercel sets rather than the one a client can forge. Two layers: 12 drawings a
  minute per caller, and `DOODLE_DAILY_CAP` for the whole app per day — the
  second is the one that bounds the bill, since addresses are cheap.
- **`IMPOSTER_SECRET` has no shipped default.** In production the route refuses
  to deal roles rather than fall back to a string anybody can read here.
- **Upstream errors are logged, not forwarded**: the client gets "the artist put
  the pen down", never the provider's response body.
- **Model output is never trusted as markup** — only `d="…"` path geometry that
  matches a strict pattern survives (`lib/doodle.ts`), and it is rendered as a
  React prop, never as HTML.
- **Nicknames** are stripped of control and zero-width characters, so nobody can
  impersonate another player with invisible glyphs.

Known and accepted: anyone holding a room code can join that room and, in
host-authoritative games, broadcast a crafted table or claim another player's
id. This is a game you send to people you know, not a service with accounts —
closing it means server-held round state, which is a different application.

Known and **worth deciding on**: Machine Doodle and Battleships keep their round
in the `game_state` table rather than on the broadcast channel, so a reload gets
the board back. With no accounts there is no way to scope a row to "whoever
knows the code" — the browser holds the anon key, so any policy that lets the
app read a room lets anyone read every room, including a list of live room
codes. Row-level security is on and the policies are in `supabase/schema.sql`,
but they are permissive by necessity. If that trade is wrong for you, move those
two cabinets onto the broadcast channel like the other fourteen and drop the
table.
