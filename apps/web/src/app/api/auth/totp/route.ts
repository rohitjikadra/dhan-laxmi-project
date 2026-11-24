import { NextRequest } from "next/server";
import { isAdminEmail, readAccessToken, signSessionToken, TOTP_MAX_FAILS } from "@/lib/auth";
import { ensureDb, type UserRow } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { decryptTotpSecret, matchTotpStep } from "@/lib/totp";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON");
  }

  const data = body as Record<string, unknown>;
  const challengeToken = data.challengeToken;
  const code = data.code;
  if (typeof challengeToken !== "string" || !challengeToken) {
    return jsonError("Authenticator session missing");
  }
  if (typeof code !== "string") return jsonError("Code required");

  const access = await readAccessToken(challengeToken);
  if (
    !access ||
    access.purpose !== "totp" ||
    !access.jti ||
    !isAdminEmail(access.email)
  ) {
    return jsonError("Code expired. Log in again.", 401);
  }

  const sql = await ensureDb();
  const rows = await sql`SELECT * FROM users WHERE id = ${access.id}`;
  const user = rows[0] as UserRow | undefined;
  if (!user || !isAdminEmail(user.email) || !user.totp_enabled) {
    return jsonError("Authenticator is not set up", 401);
  }
  if (user.totp_challenge_jti !== access.jti) {
    return jsonError("Code expired. Log in again.", 401);
  }

  const fails = Number(user.totp_challenge_fails) || 0;
  if (fails >= TOTP_MAX_FAILS) {
    await sql`
      UPDATE users
      SET totp_challenge_jti = NULL
      WHERE id = ${user.id}
    `;
    return jsonError("Too many attempts. Log in again.", 401);
  }

  if (!user.totp_secret) {
    return jsonError("Authenticator is not set up", 401);
  }
  const secret = decryptTotpSecret(user.totp_secret);
  if (!secret) {
    return jsonError(
      "Authenticator secret unreadable. Clear totp columns for this user, then set it up again.",
      500
    );
  }

  const step = matchTotpStep(secret, code);
  if (step == null) {
    const next = fails + 1;
    if (next >= TOTP_MAX_FAILS) {
      await sql`
        UPDATE users
        SET totp_challenge_fails = ${next}, totp_challenge_jti = NULL
        WHERE id = ${user.id} AND totp_challenge_jti = ${access.jti}
      `;
      return jsonError("Too many attempts. Log in again.", 401);
    }
    await sql`
      UPDATE users
      SET totp_challenge_fails = ${next}
      WHERE id = ${user.id} AND totp_challenge_jti = ${access.jti}
    `;
    return jsonError("Invalid authenticator code", 401);
  }

  const last = user.totp_last_step == null ? null : Number(user.totp_last_step);
  if (last != null && step <= last) {
    return jsonError("Code already used. Wait for a new code.", 401);
  }

  await sql`
    UPDATE users SET
      totp_last_step = ${step},
      totp_challenge_jti = NULL,
      totp_challenge_fails = 0
    WHERE id = ${user.id} AND totp_challenge_jti = ${access.jti}
  `;

  const token = await signSessionToken({ id: user.id, email: user.email });
  return jsonOk({ token, user: { id: user.id, email: user.email } });
}
