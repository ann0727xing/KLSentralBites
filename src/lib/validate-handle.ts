/** 3–15 chars, letters and digits only (preferred) */
export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

export function isValidHandleFormat(handle: string): boolean {
  return /^[a-z0-9]{3,15}$/.test(handle);
}

export function handleValidationMessage(handle: string): string | null {
  const h = normalizeHandle(handle);
  if (h.length < 3 || h.length > 15) {
    return "Handle must be 3–15 characters.";
  }
  if (!/^[a-z0-9]+$/.test(h)) {
    return "Use letters and numbers only.";
  }
  return null;
}
