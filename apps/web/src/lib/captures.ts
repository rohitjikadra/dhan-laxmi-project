import { randomUUID } from "node:crypto";
import type { CaptureCreateBody, CaptureRecord } from "@dlbh/shared";
import { getDb, type CaptureRow } from "./db";

function parseJsonArray(raw: string): unknown[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function rowToCapture(row: CaptureRow): CaptureRecord {
  return {
    id: row.id,
    userId: row.user_id,
    dlAccountId: row.dl_account_id,
    dlAccountName: row.dl_account_name,
    startDate: row.start_date,
    endDate: row.end_date,
    businessDate: row.business_date,
    totalBusiness: row.total_business,
    turnover: row.turnover,
    ignoredProducts: parseJsonArray(row.ignored_products) as string[],
    halfProducts: parseJsonArray(row.half_products) as string[],
    details: parseJsonArray(row.details),
    source: "extension",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function upsertCapture(
  userId: string,
  body: Required<
    Pick<CaptureCreateBody, "dlAccountId" | "totalBusiness">
  > &
    CaptureCreateBody
): CaptureRecord {
  const db = getDb();
  const now = new Date().toISOString();
  const startDate = body.startDate ?? null;
  const endDate = body.endDate ?? null;
  const businessDate = endDate || now.slice(0, 10);
  const ignored = JSON.stringify(body.ignoredProducts ?? []);
  const half = JSON.stringify(body.halfProducts ?? []);
  const details = JSON.stringify(body.details ?? []);
  const name = body.dlAccountName ?? null;
  const turnover = body.turnover ?? null;

  const existing = db
    .prepare(
      `SELECT id, dl_account_name FROM captures
       WHERE user_id = ?
         AND dl_account_id = ?
         AND IFNULL(start_date, '') = IFNULL(?, '')
         AND IFNULL(end_date, '') = IFNULL(?, '')`
    )
    .get(userId, body.dlAccountId, startDate, endDate) as
    | { id: string; dl_account_name: string | null }
    | undefined;

  if (existing) {
    // Keep the stored name when the new capture has no name.
    const resolvedName = name ?? existing.dl_account_name ?? null;
    db.prepare(
      `UPDATE captures SET
        dl_account_name = ?,
        business_date = ?,
        total_business = ?,
        turnover = ?,
        ignored_products = ?,
        half_products = ?,
        details = ?,
        source = 'extension',
        updated_at = ?
       WHERE id = ?`
    ).run(
      resolvedName,
      businessDate,
      body.totalBusiness,
      turnover,
      ignored,
      half,
      details,
      now,
      existing.id
    );

    const row = db
      .prepare("SELECT * FROM captures WHERE id = ?")
      .get(existing.id) as CaptureRow;
    return rowToCapture(row);
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO captures (
      id, user_id, dl_account_id, dl_account_name,
      start_date, end_date, business_date,
      total_business, turnover,
      ignored_products, half_products, details,
      source, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'extension', ?, ?)`
  ).run(
    id,
    userId,
    body.dlAccountId,
    name,
    startDate,
    endDate,
    businessDate,
    body.totalBusiness,
    turnover,
    ignored,
    half,
    details,
    now,
    now
  );

  const row = db
    .prepare("SELECT * FROM captures WHERE id = ?")
    .get(id) as CaptureRow;
  return rowToCapture(row);
}

export function listCaptures(
  userId: string,
  filters: { dlAccountId?: string; startDate?: string; endDate?: string }
): CaptureRecord[] {
  const clauses = ["user_id = ?"];
  const params: string[] = [userId];

  if (filters.dlAccountId) {
    clauses.push("dl_account_id = ?");
    params.push(filters.dlAccountId);
  }
  if (filters.startDate) {
    clauses.push("IFNULL(start_date, '') >= ?");
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    clauses.push("IFNULL(end_date, '') <= ?");
    params.push(filters.endDate);
  }

  const rows = getDb()
    .prepare(
      `SELECT * FROM captures
       WHERE ${clauses.join(" AND ")}
       ORDER BY updated_at DESC`
    )
    .all(...params) as CaptureRow[];

  return rows.map(rowToCapture);
}

export function summarizeCaptures(userId: string) {
  // Same account captured on another day: show the latest row, not a sum.
  const rows = getDb()
    .prepare(
      `WITH ranked AS (
         SELECT
           dl_account_id,
           dl_account_name,
           start_date,
           end_date,
           total_business,
           turnover,
           updated_at,
           COUNT(*) OVER (PARTITION BY dl_account_id) AS capture_count,
           ROW_NUMBER() OVER (
             PARTITION BY dl_account_id
             ORDER BY updated_at DESC, created_at DESC, id DESC
           ) AS rn
         FROM captures
         WHERE user_id = ?
       )
       SELECT
         dl_account_id AS dlAccountId,
         dl_account_name AS dlAccountName,
         start_date AS startDate,
         end_date AS endDate,
         total_business AS totalBusiness,
         turnover AS turnover,
         updated_at AS updatedAt,
         capture_count AS captureCount
       FROM ranked
       WHERE rn = 1
       ORDER BY updated_at DESC`
    )
    .all(userId) as Array<{
    dlAccountId: string;
    dlAccountName: string | null;
    startDate: string | null;
    endDate: string | null;
    totalBusiness: number;
    turnover: number | null;
    updatedAt: string;
    captureCount: number;
  }>;

  return rows.map((row) => ({
    dlAccountId: row.dlAccountId,
    dlAccountName: row.dlAccountName,
    startDate: row.startDate,
    endDate: row.endDate,
    totalBusiness: Math.round(row.totalBusiness * 100) / 100,
    turnover:
      row.turnover == null ? null : Math.round(row.turnover * 100) / 100,
    updatedAt: row.updatedAt,
    captureCount: row.captureCount,
  }));
}
