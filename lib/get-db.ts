// lib/get-db.ts
// Central DB accessor used by every API route handler.
//
// In production (Cloudflare Workers), D1 is injected by the runtime as
// `request.env.DB` (a real D1Database).
//
// In local dev (`npm run dev`), `request.env` is undefined because we run
// inside Node.js (not the CF runtime). In that case we fall back to
// lib/db-local.ts — a better-sqlite3 wrapper that implements the exact same
// D1Database interface so route handler code works unchanged.

import type { NextRequest } from "next/server";

// We import the local mock lazily so it is never bundled in the CF build.
// The `typeof window` guard is not enough here; we use the CF binding presence
// as the runtime signal.

export async function getDb(request: NextRequest): Promise<D1Database> {
  // @ts-expect-error — CF runtime injects .env on NextRequest
  const binding: D1Database | undefined = request.env?.DB;

  if (binding) {
    // Production: real Cloudflare D1 binding.
    return binding;
  }

  // Local dev: use the better-sqlite3 mock.
  // Dynamic import keeps this out of the CF production bundle.
  const { getLocalMockDb } = await import("./db-local");
  return getLocalMockDb();
}
