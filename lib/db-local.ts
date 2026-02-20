// Local development D1 mock.
// Wraps better-sqlite3 in a D1Database-compatible interface so all API routes
// work unchanged during `npm run dev` without needing the Cloudflare runtime.
//
// This file is only imported in local dev. In production (Cloudflare Workers),
// the real D1 binding is injected by the runtime and this file is never loaded.

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

// Store the local SQLite file in the project root (gitignored).
const DB_PATH = path.join(process.cwd(), "local.db");

// Singleton — reuse the same connection across hot-reloads in dev.
let _db: Database.Database | null = null;

function getLocalDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  // Enable WAL mode for better concurrent read performance.
  _db.pragma("journal_mode = WAL");
  // Enforce foreign key constraints (SQLite disables them by default).
  _db.pragma("foreign_keys = ON");
  // Apply schema on first run if tables don't exist yet.
  initSchema(_db);
  // Seed default admin account if none exists.
  seedAdmin(_db);
  return _db;
}

function initSchema(db: Database.Database): void {
  const schemaPath = path.join(process.cwd(), "schema.sql");
  if (!fs.existsSync(schemaPath)) return;
  const sql = fs.readFileSync(schemaPath, "utf8");
  // Split on semicolons and run each statement separately
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));
  for (const stmt of statements) {
    try {
      db.prepare(stmt).run();
    } catch {
      // Ignore "already exists" errors from IF NOT EXISTS clauses
    }
  }
}

function seedAdmin(db: Database.Database): void {
  // Only insert if no admin exists yet (idempotent).
  const existing = db
    .prepare("SELECT id FROM admin_credentials LIMIT 1")
    .get();
  if (existing) return;

  // Default local dev credentials: admin / admin123
  // (These are dev-only and never used in production.)
  const hash = bcrypt.hashSync("admin123", 10);
  db.prepare(
    "INSERT INTO admin_credentials (username, password_hash) VALUES (?, ?)"
  ).run("admin", hash);
  console.log(
    "[db-local] Seeded default admin: username=admin password=admin123"
  );
}

// ── D1-compatible mock ────────────────────────────────────────────────────────
// The real D1Database uses a Promise-based API with .bind(), .first(), .all(), .run().
// We replicate exactly that interface here using synchronous better-sqlite3
// (wrapped in Promises to match D1's async API).

class MockD1PreparedStatement {
  private sql: string;
  private db: Database.Database;
  private boundValues: unknown[] = [];

  constructor(db: Database.Database, sql: string) {
    this.db = db;
    this.sql = sql;
  }

  bind(...values: unknown[]): this {
    this.boundValues = values;
    return this;
  }

  // Returns the first row, or null if no rows matched.
  async first<T = Record<string, unknown>>(
    _colName?: string
  ): Promise<T | null> {
    try {
      const stmt = this.db.prepare(this.sql);
      const row = stmt.get(...this.boundValues) as T | undefined;
      return row ?? null;
    } catch (err) {
      throw new Error(`D1 mock .first() failed: ${(err as Error).message}\nSQL: ${this.sql}`);
    }
  }

  // Returns all rows.
  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    try {
      const stmt = this.db.prepare(this.sql);
      const results = stmt.all(...this.boundValues) as T[];
      return { results };
    } catch (err) {
      throw new Error(`D1 mock .all() failed: ${(err as Error).message}\nSQL: ${this.sql}`);
    }
  }

  // Executes a write statement (INSERT, UPDATE, DELETE).
  async run(): Promise<{ success: boolean }> {
    try {
      const stmt = this.db.prepare(this.sql);
      stmt.run(...this.boundValues);
      return { success: true };
    } catch (err) {
      throw new Error(`D1 mock .run() failed: ${(err as Error).message}\nSQL: ${this.sql}`);
    }
  }
}

class MockD1Database {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  prepare(sql: string): MockD1PreparedStatement {
    return new MockD1PreparedStatement(this.db, sql);
  }

  // Run multiple statements in a single transaction (mirrors D1's batch API).
  async batch(
    statements: MockD1PreparedStatement[]
  ): Promise<{ success: boolean }[]> {
    const runInTransaction = this.db.transaction(() => {
      return statements.map((stmt) => {
        // Access private members via type assertion — acceptable for dev mock
        const s = stmt as unknown as {
          sql: string;
          boundValues: unknown[];
          db: Database.Database;
        };
        try {
          s.db.prepare(s.sql).run(...s.boundValues);
          return { success: true };
        } catch (err) {
          throw new Error(
            `Batch statement failed: ${(err as Error).message}\nSQL: ${s.sql}`
          );
        }
      });
    });
    return runInTransaction();
  }
}

// ── Public getter ─────────────────────────────────────────────────────────────

// Returns a D1-compatible mock database for use in local development.
// Cast to D1Database so TypeScript accepts it in all our route handlers.
export function getLocalMockDb(): D1Database {
  return new MockD1Database(getLocalDb()) as unknown as D1Database;
}
