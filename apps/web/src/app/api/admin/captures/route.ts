import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { rowToCapture } from "@/lib/captures";
import { ensureDb, type CaptureRow } from "@/lib/db";
import { jsonOk } from "@/lib/http";

export const runtime = "nodejs";

type EntryRow = CaptureRow & { user_email: string };

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const sql = await ensureDb();
  const rows = (await sql`
    SELECT c.*, u.email AS user_email
    FROM captures c
    JOIN users u ON u.id = c.user_id
    ORDER BY c.updated_at DESC
  `) as EntryRow[];

  return jsonOk({
    items: rows.map((row) => ({
      ...rowToCapture(row),
      email: row.user_email,
    })),
  });
}
