// Database access layer.
// In production (Cloudflare Workers), the D1 binding is injected via wrangler.toml.
// In local dev, we use a lightweight in-memory mock so `npm run dev` works without D1.

export type DeviceType = "camerabody" | "lense";
export type LocationType = "local" | "remote";
export type OccupyMode = "safe" | "aggressive" | "custom" | "shipping";

// ── Types matching the DB schema ────────────────────────────────────────────

export interface DeviceAsset {
  device_id: number;
  device_name: string;
  device_type: DeviceType;
  color: string; // hex, e.g. '#3a8fd4'
}

export interface ConcertCalendar {
  concert_id: number;
  title: string;
  location_type: LocationType;
  start_date: string; // 'YYYY-MM-DD'
  end_date: string;
}

export interface RentalOrder {
  order_id: number;
  concert_id: number;
  start_date: string;
  end_date: string;
  camerabody_id: number | null;
  lense_id: number | null;
  daily_rate: number;
  shipping_fee: number;
  intern_fee: number;
  occupy_mode: OccupyMode;
  buffer_days_before: number;
  buffer_days_after: number;
  notes: string | null;
}

export interface DeviceCalendar {
  calendar_id: number;
  order_id: number;
  camerabody_id: number | null;
  lense_id: number | null;
  start_date: string;
  end_date: string;
}

export interface OccupiedDate {
  id: number;
  device_id: number;
  date: string;
  order_id: number;
}

// ── D1 binding type (injected by Cloudflare Workers runtime) ─────────────────

// The D1Database type comes from @cloudflare/workers-types.
// We declare it here so TypeScript knows about the `DB` binding.
declare global {
  // eslint-disable-next-line no-var
  var __D1_DB__: D1Database | undefined;
}

// ── DB accessor ──────────────────────────────────────────────────────────────

// In a Next.js Route Handler (app/api/.../route.ts), the Cloudflare D1 binding
// is available on the request context. Pass it in explicitly from the route handler.
// This function is a thin wrapper — call it like: getDb(context.env.DB)
export function getDb(binding: D1Database): D1Database {
  return binding;
}
