// Input validation & sanitization helpers.
// All user input goes through these before hitting the database.
// D1 uses parameterized queries (binding values with `?`), which already
// prevents SQL injection at the query level. These helpers add extra
// safety for business-logic constraints.

// Strip any HTML tags from a string — prevents XSS in notes/text fields.
export function sanitizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/<[^>]*>/g, "").trim();
}

// Validate ISO date string format 'YYYY-MM-DD'.
export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}

// Validate that end >= start.
export function isValidDateRange(start: string, end: string): boolean {
  return isValidDate(start) && isValidDate(end) && start <= end;
}

// Validate a non-negative number (for fees, rates).
export function isValidAmount(value: unknown): value is number {
  return typeof value === "number" && isFinite(value) && value >= 0;
}

// Coerce a value to a non-negative number, defaulting to 0.
export function toAmount(value: unknown): number {
  const n = Number(value);
  return isFinite(n) && n >= 0 ? n : 0;
}

// Coerce to a non-negative integer, defaulting to 0.
export function toNonNegativeInt(value: unknown): number {
  const n = parseInt(String(value), 10);
  return isFinite(n) && n >= 0 ? n : 0;
}

// Validate device type enum.
export function isValidDeviceType(value: unknown): value is "camerabody" | "lense" {
  return value === "camerabody" || value === "lense";
}

// Validate location type enum.
export function isValidLocationType(value: unknown): value is "local" | "remote" {
  return value === "local" || value === "remote";
}

// Validate occupy mode enum.
export function isValidOccupyMode(
  value: unknown
): value is "safe" | "aggressive" | "custom" | "shipping" {
  return (
    value === "safe" ||
    value === "aggressive" ||
    value === "custom" ||
    value === "shipping"
  );
}

// Validate a hex color string (e.g. '#3a8fd4').
export function isValidHexColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

// Generate a random vibrant hex color for new devices.
export function randomVibrantColor(): string {
  // Use HSL: random hue, high saturation, mid-range lightness
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(Math.random() * 30) + 60; // 60–90%
  const l = Math.floor(Math.random() * 20) + 40; // 40–60%
  return hslToHex(h, s, l);
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
