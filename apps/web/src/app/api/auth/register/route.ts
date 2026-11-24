import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { isAdminEmail, signToken } from "@/lib/auth";
import { ensureDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { hashPassword } from "@/lib/password";
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

  if (!email) return jsonError("Valid email required");
  if (!password) return jsonError("Password must be 8–128 characters");

  const sql = await ensureDb();
  const existing = await sql`
    SELECT id FROM users WHERE LOWER(email) = LOWER(${email})
  `;
  if (existing[0]) return jsonError("Email already registered", 409);

  const id = randomUUID();
  const passwordHash = await hashPassword(password);
  const createdAt = new Date().toISOString();

  await sql`
    INSERT INTO users (id, email, password_hash, created_at)
    VALUES (${id}, ${email}, ${passwordHash}, ${createdAt})
  `;

  if (isAdminEmail(email)) {
    return jsonOk({ needsTotpSetup: true, user: { id, email } }, 201);
  }

  const token = await signToken({ id, email });
  return jsonOk({ token, user: { id, email } }, 201);
}
