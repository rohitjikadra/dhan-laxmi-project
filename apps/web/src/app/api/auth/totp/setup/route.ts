import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { isAdminEmail, readAccessToken } from "@/lib/auth";
import { ensureDb, type UserRow } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import {
  encryptTotpSecret,
  generateTotpSecret,
  otpauthUrl,
} from "@/lib/totp";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON");
  }

  const setupToken = (body as Record<string, unknown>).setupToken;
  if (typeof setupToken !== "string" || !setupToken) {
    return jsonError("Setup session missing");
  }

  const access = await readAccessToken(setupToken);
  if (!access || access.purpose !== "totp-setup" || !isAdminEmail(access.email)) {
    return jsonError("Setup session expired. Log in again.", 401);
  }

  const sql = await ensureDb();
  const rows = await sql`
    SELECT id, email, totp_enabled FROM users WHERE id = ${access.id}
  `;
  const user = rows[0] as
    | Pick<UserRow, "id" | "email" | "totp_enabled">
    | undefined;
  if (!user || !isAdminEmail(user.email)) {
    return jsonError("Admin account not found", 401);
  }
  if (user.totp_enabled) {
    return jsonError("Authenticator is already enabled. Enter the current code.");
  }

  const secret = generateTotpSecret();
  const stored = encryptTotpSecret(secret);
  await sql`
    UPDATE users
    SET totp_secret = ${stored}, totp_last_step = NULL
    WHERE id = ${user.id} AND totp_enabled = FALSE
  `;

  const url = otpauthUrl(user.email, secret);
  const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 220 });
  return jsonOk({ qrDataUrl, secret });
}
