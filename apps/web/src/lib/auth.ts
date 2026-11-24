import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { ensureDb, type UserRow } from "./db";

const TOKEN_TTL = "30d";
const ADMIN_TOKEN_TTL = "24h";
export const TOTP_MAX_FAILS = 5;

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET missing or too short (min 16 chars)");
  }
  return new TextEncoder().encode(secret);
}

export type AuthUser = {
  id: string;
  email: string;
};

export type SessionUser = AuthUser & {
  isAdmin: boolean;
};

export type TokenPurpose = "session" | "totp" | "totp-setup";

export type AccessToken = {
  id: string;
  email: string;
  purpose: TokenPurpose;
  jti: string | null;
  iat: number;
};

export function isAdminEmail(email: string): boolean {
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!admin) return false;
  return email.trim().toLowerCase() === admin;
}

export async function signToken(user: AuthUser): Promise<string> {
  return signSessionToken(user);
}

export async function signSessionToken(user: AuthUser): Promise<string> {
  const ttl = isAdminEmail(user.email) ? ADMIN_TOKEN_TTL : TOKEN_TTL;
  return new SignJWT({ email: user.email, purpose: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(getSecret());
}

export async function signTotpChallenge(
  user: AuthUser,
  jti: string
): Promise<string> {
  return new SignJWT({ email: user.email, purpose: "totp" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(getSecret());
}

export async function signTotpSetup(user: AuthUser): Promise<string> {
  return new SignJWT({ email: user.email, purpose: "totp-setup" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getSecret());
}

export async function readAccessToken(
  token: string
): Promise<AccessToken | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = payload.sub;
    const email = payload.email;
    if (!id || typeof email !== "string") return null;
    const raw = payload.purpose;
    const purpose: TokenPurpose | null =
      raw === "totp" || raw === "totp-setup" || raw === "session"
        ? raw
        : raw == null
          ? "session"
          : null;
    if (!purpose) return null;
    return {
      id,
      email,
      purpose,
      jti: typeof payload.jti === "string" ? payload.jti : null,
      iat: typeof payload.iat === "number" ? payload.iat : 0,
    };
  } catch {
    return null;
  }
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  const access = await readAccessToken(token);
  if (!access || access.purpose !== "session") return null;
  return { id: access.id, email: access.email };
}

export function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

export async function requireUser(
  req: NextRequest
): Promise<{ user: SessionUser } | { error: Response }> {
  const token = getBearerToken(req);
  if (!token) {
    return {
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const access = await readAccessToken(token);
  if (!access || access.purpose !== "session") {
    return {
      error: Response.json({ error: "Invalid or expired token" }, { status: 401 }),
    };
  }

  const sql = await ensureDb();
  const rows = await sql`
    SELECT id, email, totp_enabled, totp_enabled_at
    FROM users WHERE id = ${access.id}
  `;
  const row = rows[0] as
    | Pick<UserRow, "id" | "email" | "totp_enabled" | "totp_enabled_at">
    | undefined;

  if (!row) {
    return {
      error: Response.json({ error: "User not found" }, { status: 401 }),
    };
  }

  if (isAdminEmail(row.email)) {
    if (!row.totp_enabled) {
      return {
        error: Response.json(
          { error: "Admin must finish Google Authenticator setup" },
          { status: 401 }
        ),
      };
    }
    const enabledAt = row.totp_enabled_at
      ? Date.parse(row.totp_enabled_at)
      : Number.POSITIVE_INFINITY;
    if (access.iat * 1000 + 5000 < enabledAt) {
      return {
        error: Response.json(
          { error: "Admin session expired. Log in with the authenticator code." },
          { status: 401 }
        ),
      };
    }
  }

  return {
    user: {
      id: row.id,
      email: row.email,
      isAdmin: isAdminEmail(row.email),
    },
  };
}

export async function requireAdmin(
  req: NextRequest
): Promise<{ user: SessionUser } | { error: Response }> {
  const auth = await requireUser(req);
  if ("error" in auth) return auth;
  if (!auth.user.isAdmin) {
    return {
      error: Response.json({ error: "Admin only" }, { status: 403 }),
    };
  }
  return auth;
}
