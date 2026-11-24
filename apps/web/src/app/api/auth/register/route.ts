import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { signToken } from "@/lib/auth";
import { getDb } from "@/lib/db";
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

  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email) as { id: string } | undefined;
  if (existing) return jsonError("Email already registered", 409);

  const id = randomUUID();
  const passwordHash = await hashPassword(password);
  const createdAt = new Date().toISOString();

  db.prepare(
    "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)"
  ).run(id, email, passwordHash, createdAt);

  const token = await signToken({ id, email });
  return jsonOk({ token, user: { id, email } }, 201);
}
