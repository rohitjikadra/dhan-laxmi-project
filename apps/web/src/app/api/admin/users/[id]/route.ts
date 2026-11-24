import { NextRequest } from "next/server";
import { isAdminEmail, requireAdmin } from "@/lib/auth";
import { ensureDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  if (!id || id.length > 80) return jsonError("Invalid user");
  if (id === auth.user.id) {
    return jsonError("Cannot delete the admin account");
  }

  const sql = await ensureDb();
  const rows = await sql`
    SELECT id, email FROM users WHERE id = ${id}
  `;
  const user = rows[0] as { id: string; email: string } | undefined;
  if (!user) return jsonError("User not found", 404);
  if (isAdminEmail(user.email)) {
    return jsonError("Cannot delete the admin account");
  }

  await sql`DELETE FROM users WHERE id = ${user.id}`;
  return jsonOk({ ok: true });
}
