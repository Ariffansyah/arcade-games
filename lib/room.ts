const ALPHABET = "ACDEFGHJKMNPQRTUVWXY34679";
export const CODE_LENGTH = 6;

export const isCode = (code: string) =>
  new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`).test(code);

export const cleanCode = (input: string) =>
  input
    .toUpperCase()
    .replace(new RegExp(`[^${ALPHABET}]`, "g"), "")
    .slice(0, CODE_LENGTH);

export function newCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH * 2);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) {
    if (byte >= 256 - (256 % ALPHABET.length)) continue;
    code += ALPHABET[byte % ALPHABET.length];
    if (code.length === CODE_LENGTH) return code;
  }
  return newCode();
}
