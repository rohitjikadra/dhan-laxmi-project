import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ensureDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  if (!id || id.length > 80) return jsonError("Invalid entry");

  const sql = await ensureDb();
  const deleted = await sql`
    DELETE FROM captures WHERE id = ${id} RETURNING id
  `;
  if (!deleted.length) return jsonError("Entry not found", 404);
  return jsonOk({ ok: true });
}
