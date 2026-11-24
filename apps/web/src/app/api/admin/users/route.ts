import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ensureDb } from "@/lib/db";
import { jsonOk } from "@/lib/http";

export const runtime = "nodejs";

type AdminUserRow = {
  id: string;
  email: string;
  createdAt: string;
  captureCount: number | string;
};

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const sql = await ensureDb();
  const rows = (await sql`
    SELECT
      u.id,
      u.email,
      u.created_at AS "createdAt",
      COUNT(c.id) AS "captureCount"
    FROM users u
    LEFT JOIN captures c ON c.user_id = u.id
    GROUP BY u.id, u.email, u.created_at
    ORDER BY u.created_at DESC
  `) as AdminUserRow[];

  return jsonOk({
    users: rows.map((row) => ({
      id: row.id,
      email: row.email,
      createdAt: row.createdAt,
      captureCount: Number(row.captureCount) || 0,
      isAdmin: row.email.toLowerCase() === auth.user.email.toLowerCase(),
    })),
  });
}
