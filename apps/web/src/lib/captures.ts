import { randomUUID } from "node:crypto";
import type { CaptureCreateBody, CaptureRecord } from "@dlbh/shared";
import { ensureDb, type CaptureRow } from "./db";

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

export async function upsertCapture(
  userId: string,
  body: Required<
    Pick<CaptureCreateBody, "dlAccountId" | "totalBusiness">
  > &
    CaptureCreateBody
): Promise<CaptureRecord> {
  const sql = await ensureDb();
  const now = new Date().toISOString();
  const startDate = body.startDate ?? null;
  const endDate = body.endDate ?? null;
  const businessDate = endDate || now.slice(0, 10);
  const ignored = JSON.stringify(body.ignoredProducts ?? []);
  const half = JSON.stringify(body.halfProducts ?? []);
  const details = JSON.stringify(body.details ?? []);
  const name = body.dlAccountName ?? null;
  const turnover = body.turnover ?? null;

  const existingRows = await sql`
    SELECT id, dl_account_name FROM captures
    WHERE user_id = ${userId}
      AND dl_account_id = ${body.dlAccountId}
      AND COALESCE(start_date, '') = COALESCE(${startDate}, '')
      AND COALESCE(end_date, '') = COALESCE(${endDate}, '')
  `;
  const existing = existingRows[0] as
    | { id: string; dl_account_name: string | null }
    | undefined;

  if (existing) {
    // Keep the stored name when the new capture has no name.
    const resolvedName = name ?? existing.dl_account_name ?? null;
    await sql`
      UPDATE captures SET
        dl_account_name = ${resolvedName},
        business_date = ${businessDate},
        total_business = ${body.totalBusiness},
        turnover = ${turnover},
        ignored_products = ${ignored},
        half_products = ${half},
        details = ${details},
        source = 'extension',
        updated_at = ${now}
      WHERE id = ${existing.id}
    `;

    const rows = await sql`
      SELECT * FROM captures WHERE id = ${existing.id}
    `;
    return rowToCapture(rows[0] as CaptureRow);
  }

  const id = randomUUID();
  await sql`
    INSERT INTO captures (
      id, user_id, dl_account_id, dl_account_name,
      start_date, end_date, business_date,
      total_business, turnover,
      ignored_products, half_products, details,
      source, created_at, updated_at
    ) VALUES (
      ${id}, ${userId}, ${body.dlAccountId}, ${name},
      ${startDate}, ${endDate}, ${businessDate},
      ${body.totalBusiness}, ${turnover},
      ${ignored}, ${half}, ${details},
      'extension', ${now}, ${now}
    )
  `;

  const rows = await sql`
    SELECT * FROM captures WHERE id = ${id}
  `;
  return rowToCapture(rows[0] as CaptureRow);
}

export async function listCaptures(
  userId: string,
  filters: { dlAccountId?: string; startDate?: string; endDate?: string }
): Promise<CaptureRecord[]> {
  const sql = await ensureDb();
  const clauses = ["user_id = $1"];
  const params: string[] = [userId];

  if (filters.dlAccountId) {
    params.push(filters.dlAccountId);
    clauses.push(`dl_account_id = $${params.length}`);
  }
  if (filters.startDate) {
    params.push(filters.startDate);
    clauses.push(`COALESCE(start_date, '') >= $${params.length}`);
  }
  if (filters.endDate) {
    params.push(filters.endDate);
    clauses.push(`COALESCE(end_date, '') <= $${params.length}`);
  }

  const rows = (await sql.query(
    `SELECT * FROM captures
     WHERE ${clauses.join(" AND ")}
     ORDER BY updated_at DESC`,
    params
  )) as CaptureRow[];

  return rows.map(rowToCapture);
}

export async function summarizeCaptures(userId: string) {
  const sql = await ensureDb();
  // Same account captured on another day: show the latest row, not a sum.
  const rows = await sql`
    WITH ranked AS (
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
      WHERE user_id = ${userId}
    )
    SELECT
      dl_account_id AS "dlAccountId",
      dl_account_name AS "dlAccountName",
      start_date AS "startDate",
      end_date AS "endDate",
      total_business AS "totalBusiness",
      turnover AS "turnover",
      updated_at AS "updatedAt",
      capture_count AS "captureCount"
    FROM ranked
    WHERE rn = 1
    ORDER BY updated_at DESC
  `;

  return (
    rows as Array<{
      dlAccountId: string;
      dlAccountName: string | null;
      startDate: string | null;
      endDate: string | null;
      totalBusiness: number;
      turnover: number | null;
      updatedAt: string;
      captureCount: number;
    }>
  ).map((row) => ({
    dlAccountId: row.dlAccountId,
    dlAccountName: row.dlAccountName,
    startDate: row.startDate,
    endDate: row.endDate,
    totalBusiness: Math.round(row.totalBusiness * 100) / 100,
    turnover:
      row.turnover == null ? null : Math.round(row.turnover * 100) / 100,
    updatedAt: row.updatedAt,
    captureCount: Number(row.captureCount),
  }));
}
