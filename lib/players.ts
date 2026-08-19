export type Player = { id: string; name: string; joinedAt: number };

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

export const holderFor = (order: string[], round: number) =>
  order.length ? order[(round - 1) % Math.min(order.length, 2)] : "";
