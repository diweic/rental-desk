// Client URL ID generation and validation.

// Generate a cryptographically random 16-character alphanumeric string.
// Used as the unique client identifier in URLs (e.g. /en-us/a1b2c3d4e5f6g7h8).
export function generateClientId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

// Validate that a string looks like a clientId (16 lowercase alphanumeric chars).
// Used in [clientId]/layout.tsx to quickly reject obviously invalid IDs.
export function isValidClientIdFormat(value: string): boolean {
  return /^[a-z0-9]{16}$/.test(value);
}
