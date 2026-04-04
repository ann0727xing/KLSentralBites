/** SHA-256 hex (browser / Node compatible) */
export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPassword(
  password: string,
  passwordHashHex: string,
): Promise<boolean> {
  const h = await hashPassword(password);
  return h === passwordHashHex;
}
