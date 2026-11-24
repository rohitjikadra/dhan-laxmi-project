import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { summarizeCaptures } from "@/lib/captures";
import { jsonOk } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;
  return jsonOk({ items: summarizeCaptures(auth.user.id) });
}
