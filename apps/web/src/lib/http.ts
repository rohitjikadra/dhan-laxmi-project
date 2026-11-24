import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Reject password fields if client ever sends them. */
export function rejectSecrets(body: Record<string, unknown> | null) {
  if (!body) return null;
  for (const key of Object.keys(body)) {
    const lower = key.toLowerCase();
    if (
      lower === "password" ||
      lower === "dlpassword" ||
      lower === "dhanlaxmipassword" ||
      lower.includes("cookie")
    ) {
      return jsonError(`Field '${key}' is not allowed`, 400);
    }
  }
  return null;
}
