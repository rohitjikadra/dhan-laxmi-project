import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listCaptures } from "@/lib/captures";
import { ensureDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  if (!id || id.length > 80) return jsonError("Invalid user");

  const sql = await ensureDb();
  const rows = await sql`
    SELECT id, email FROM users WHERE id = ${id}
  `;
  const user = rows[0] as { id: string; email: string } | undefined;
  if (!user) return jsonError("User not found", 404);

  const items = await listCaptures(user.id, {});
  return jsonOk({
    user: { id: user.id, email: user.email },
    items,
  });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  if (!id || id.length > 80) return jsonError("Invalid user");

  const sql = await ensureDb();
  const rows = await sql`SELECT id FROM users WHERE id = ${id}`;
  if (!rows[0]) return jsonError("User not found", 404);

  const deleted = await sql`
    DELETE FROM captures WHERE user_id = ${id} RETURNING id
  `;
  return jsonOk({ ok: true, deleted: deleted.length });
}
