// `host` is set on a guest: someone sharing another player's screen, taking turns on that device.
export type Player = { id: string; name: string; joinedAt: number; host?: string };

export type Presence = Player & { guests?: Player[] };

// Each device tracks its own player and the guests on its screen; the room seats them all.
// Presence comes from other people's browsers, so a guest list that isn't one is ignored.
export const withGuests = (list: Presence[]): Player[] =>
  sortPlayers(
    list.flatMap(({ guests, ...p }) => [
      p,
      ...(Array.isArray(guests) ? guests : []).map((g) => ({ ...g, host: p.id })),
    ])
  );

export const sortPlayers = (list: Player[]): Player[] =>
  [...list].sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));

const NAME_KEY = "arcade:nickname";

export const cleanName = (name: string) =>
  name

    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\u202a-\u202e\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16);

export const storedName = () => {
  if (typeof window === "undefined") return "";
  try {
    return cleanName(localStorage.getItem(NAME_KEY) ?? "");
  } catch {
    return "";
  }
};

export const saveName = (name: string) => {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
  }
};

const stored = (area: () => Storage) => ({
  get<T>(key: string): T | null {
    try {
      return JSON.parse(area().getItem(key) ?? "null");
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown) {
    try {
      area().setItem(key, JSON.stringify(value));
    } catch {}
  },
});

// Kept per tab: the table you were looking at, so a reload picks it straight back up.
export const session = stored(() => sessionStorage);
// Kept per browser: who you are in a room, so closing the tab and tapping the link again walks
// back into the same seat instead of leaving a ghost of you at the table.
export const local = stored(() => localStorage);

export const holderFor = (order: string[], round: number) =>
  order.length ? order[(round - 1) % Math.min(order.length, 2)] : "";
