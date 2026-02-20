// lib/get-db.ts
// Central DB accessor used by every API route handler.
//
// In production (Cloudflare Workers), D1 is accessed via getCloudflareContext()
// from @opennextjs/cloudflare, which reliably provides the env bindings.
//
// In local dev (`npm run dev`), getCloudflareContext() will throw because we
// run inside Node.js (not the CF runtime). In that case we fall back to
// lib/db-local.ts — a better-sqlite3 wrapper that implements the exact same
// D1Database interface so route handler code works unchanged.

// We import the local mock lazily so it is never bundled in the CF build.

export async function getDb(): Promise<D1Database> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    const binding = (env as CloudflareEnv & { DB?: D1Database }).DB;
    if (binding) {
      return binding;
    }
  } catch {
    // Not running in Cloudflare Workers — fall through to local mock.
  }

  // Local dev: use the better-sqlite3 mock.
  // Dynamic import keeps this out of the CF production bundle.
  const { getLocalMockDb } = await import("./db-local");
  return getLocalMockDb();
}
