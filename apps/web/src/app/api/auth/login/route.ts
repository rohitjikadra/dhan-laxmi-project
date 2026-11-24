import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import {
  isAdminEmail,
  signSessionToken,
  signTotpChallenge,
  signTotpSetup,
} from "@/lib/auth";
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

  if (isAdminEmail(user.email)) {
    if (!user.totp_enabled) {
      const setupToken = await signTotpSetup({
        id: user.id,
        email: user.email,
      });
      return jsonOk({
        needsTotpSetup: true,
        setupToken,
        email: user.email,
      });
    }

    const jti = randomUUID();
    await sql`
      UPDATE users
      SET totp_challenge_jti = ${jti}, totp_challenge_fails = 0
      WHERE id = ${user.id}
    `;
    const challengeToken = await signTotpChallenge(
      { id: user.id, email: user.email },
      jti
    );
    return jsonOk({
      needsTotp: true,
      challengeToken,
      email: user.email,
    });
  }

  const token = await signSessionToken({ id: user.id, email: user.email });
  return jsonOk({ token, user: { id: user.id, email: user.email } });
}
