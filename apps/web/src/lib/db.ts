import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
};

export type CaptureRow = {
  id: string;
  user_id: string;
  dl_account_id: string;
  dl_account_name: string | null;
  start_date: string | null;
  end_date: string | null;
  business_date: string | null;
  total_business: number;
  turnover: number | null;
  ignored_products: string;
  half_products: string;
  details: string;
  source: string;
  created_at: string;
  updated_at: string;
};

type Sql = NeonQueryFunction<false, false>;

type GlobalDb = {
  __dlbhSql?: Sql;
  __dlbhMigrated?: Promise<void>;
};

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL missing — set Neon Postgres connection string in .env.local"
    );
  }
  return url;
}

/** Direct (non-pooled) URL for DDL/migrations when available. */
function getMigrateUrl(): string {
  return process.env.DATABASE_URL_UNPOOLED || getDatabaseUrl();
}

async function migrate() {
  const sql = neon(getMigrateUrl());
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx
      ON users (LOWER(email))
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS captures (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      dl_account_id TEXT NOT NULL,
      dl_account_name TEXT,
      start_date TEXT,
      end_date TEXT,
      business_date TEXT,
      total_business DOUBLE PRECISION NOT NULL,
      turnover DOUBLE PRECISION,
      ignored_products TEXT NOT NULL DEFAULT '[]',
      half_products TEXT NOT NULL DEFAULT '[]',
      details TEXT NOT NULL DEFAULT '[]',
      source TEXT NOT NULL DEFAULT 'extension',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS captures_upsert_idx
      ON captures (
        user_id,
        dl_account_id,
        COALESCE(start_date, ''),
        COALESCE(end_date, '')
      )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS captures_user_idx ON captures (user_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS captures_account_idx
      ON captures (user_id, dl_account_id)
  `;
}

export function getSql(): Sql {
  const g = globalThis as unknown as GlobalDb;
  if (!g.__dlbhSql) {
    // Pooled URL for serverless / Next.js request queries
    g.__dlbhSql = neon(getDatabaseUrl());
  }
  return g.__dlbhSql;
}

/** Ensure schema exists (idempotent). Call before first query in a request path. */
export async function ensureDb(): Promise<Sql> {
  const g = globalThis as unknown as GlobalDb;
  const sql = getSql();
  if (!g.__dlbhMigrated) {
    g.__dlbhMigrated = migrate();
  }
  await g.__dlbhMigrated;
  return sql;
}
