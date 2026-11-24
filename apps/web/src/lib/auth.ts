import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { getDb, type UserRow } from "./db";

const TOKEN_TTL = "30d";

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

export async function signToken(user: AuthUser): Promise<string> {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = payload.sub;
    const email = payload.email;
    if (!id || typeof email !== "string") return null;
    return { id, email };
  } catch {
    return null;
  }
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
): Promise<{ user: AuthUser } | { error: Response }> {
  const token = getBearerToken(req);
  if (!token) {
    return {
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const auth = await verifyToken(token);
  if (!auth) {
    return {
      error: Response.json({ error: "Invalid or expired token" }, { status: 401 }),
    };
  }

  const row = getDb()
    .prepare("SELECT id, email FROM users WHERE id = ?")
    .get(auth.id) as Pick<UserRow, "id" | "email"> | undefined;

  if (!row) {
    return {
      error: Response.json({ error: "User not found" }, { status: 401 }),
    };
  }

  return { user: { id: row.id, email: row.email } };
}
