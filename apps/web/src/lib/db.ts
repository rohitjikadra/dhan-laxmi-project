import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

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

type GlobalDb = { __dlbhDb?: Database.Database };

function resolveDbPath(): string {
  const configured = process.env.DATABASE_PATH || "./data/dlbh.sqlite";
  return path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured);
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS captures (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      dl_account_id TEXT NOT NULL,
      dl_account_name TEXT,
      start_date TEXT,
      end_date TEXT,
      business_date TEXT,
      total_business REAL NOT NULL,
      turnover REAL,
      ignored_products TEXT NOT NULL DEFAULT '[]',
      half_products TEXT NOT NULL DEFAULT '[]',
      details TEXT NOT NULL DEFAULT '[]',
      source TEXT NOT NULL DEFAULT 'extension',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS captures_upsert_idx
      ON captures (user_id, dl_account_id, IFNULL(start_date, ''), IFNULL(end_date, ''));

    CREATE INDEX IF NOT EXISTS captures_user_idx ON captures (user_id);
    CREATE INDEX IF NOT EXISTS captures_account_idx ON captures (user_id, dl_account_id);
  `);
}

export function getDb(): Database.Database {
  const g = globalThis as unknown as GlobalDb;
  if (!g.__dlbhDb) {
    const dbPath = resolveDbPath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate(db);
    g.__dlbhDb = db;
  }
  return g.__dlbhDb;
}
