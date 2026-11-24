import { NextRequest } from "next/server";
import { isAdminEmail, readAccessToken, signSessionToken } from "@/lib/auth";
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
  const setupToken = data.setupToken;
  const code = data.code;
  if (typeof setupToken !== "string" || !setupToken) {
    return jsonError("Setup session missing");
  }
  if (typeof code !== "string") return jsonError("Code required");

  const access = await readAccessToken(setupToken);
  if (!access || access.purpose !== "totp-setup" || !isAdminEmail(access.email)) {
    return jsonError("Setup session expired. Log in again.", 401);
  }

  const sql = await ensureDb();
  const rows = await sql`SELECT * FROM users WHERE id = ${access.id}`;
  const user = rows[0] as UserRow | undefined;
  if (!user || !isAdminEmail(user.email)) {
    return jsonError("Admin account not found", 401);
  }
  if (user.totp_enabled) {
    return jsonError("Authenticator is already enabled. Log in again.");
  }
  if (!user.totp_secret) {
    return jsonError("Scan the QR code first.");
  }

  const secret = decryptTotpSecret(user.totp_secret);
  if (!secret) {
    return jsonError(
      "Authenticator secret unreadable. Log in again to generate a new QR.",
      500
    );
  }

  const step = matchTotpStep(secret, code);
  if (step == null) return jsonError("Invalid authenticator code", 401);

  const enabledAt = new Date(Date.now() - 5000).toISOString();
  await sql`
    UPDATE users SET
      totp_enabled = TRUE,
      totp_enabled_at = ${enabledAt},
      totp_last_step = ${step},
      totp_challenge_jti = NULL,
      totp_challenge_fails = 0
    WHERE id = ${user.id} AND totp_enabled = FALSE
  `;

  const token = await signSessionToken({ id: user.id, email: user.email });
  return jsonOk({ token, user: { id: user.id, email: user.email } });
}
