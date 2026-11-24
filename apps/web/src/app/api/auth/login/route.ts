import { NextRequest } from "next/server";
import { signToken } from "@/lib/auth";
import { ensureDb, type UserRow } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { verifyPassword } from "@/lib/password";
import { normalizeEmail, validatePassword } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON");
  }

  const data = body as Record<string, unknown>;
  const email = normalizeEmail(data.email);
  const password = validatePassword(data.password);

  if (!email || !password) {
    return jsonError("Email and password required");
  }

  const sql = await ensureDb();
  const rows = await sql`
    SELECT * FROM users WHERE LOWER(email) = LOWER(${email})
  `;
  const user = rows[0] as UserRow | undefined;

  if (!user) return jsonError("Invalid email or password", 401);

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return jsonError("Invalid email or password", 401);

  const token = await signToken({ id: user.id, email: user.email });
  return jsonOk({ token, user: { id: user.id, email: user.email } });
}
