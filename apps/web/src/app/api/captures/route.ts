import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { listCaptures, upsertCapture } from "@/lib/captures";
import { jsonError, jsonOk, rejectSecrets } from "@/lib/http";
import {
  asNumber,
  asOptionalString,
  asStringArray,
} from "@/lib/validate";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  const { searchParams } = req.nextUrl;
  const items = listCaptures(auth.user.id, {
    dlAccountId: searchParams.get("dlAccountId") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
  });

  return jsonOk({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON");
  }

  if (!body || typeof body !== "object") return jsonError("Invalid body");
  const data = body as Record<string, unknown>;

  const secrets = rejectSecrets(data);
  if (secrets) return secrets;

  const dlAccountId = asOptionalString(data.dlAccountId, 64);
  if (!dlAccountId) return jsonError("dlAccountId required");

  const totalBusiness = asNumber(data.totalBusiness);
  if (totalBusiness == null) return jsonError("totalBusiness must be a number");

  const dlAccountName = asOptionalString(data.dlAccountName, 120);
  if (dlAccountName === undefined && data.dlAccountName != null) {
    return jsonError("dlAccountName invalid");
  }

  const startDate = asOptionalString(data.startDate, 32);
  if (startDate === undefined && data.startDate != null) {
    return jsonError("startDate invalid");
  }

  const endDate = asOptionalString(data.endDate, 32);
  if (endDate === undefined && data.endDate != null) {
    return jsonError("endDate invalid");
  }

  let turnover: number | null = null;
  if (data.turnover !== undefined && data.turnover !== null) {
    const t = asNumber(data.turnover);
    if (t == null) return jsonError("turnover must be a number");
    turnover = t;
  }

  const capture = upsertCapture(auth.user.id, {
    dlAccountId,
    dlAccountName: dlAccountName ?? null,
    startDate: startDate ?? null,
    endDate: endDate ?? null,
    totalBusiness,
    turnover,
    ignoredProducts: asStringArray(data.ignoredProducts),
    halfProducts: asStringArray(data.halfProducts),
    details: Array.isArray(data.details) ? data.details.slice(0, 500) : [],
  });

  return jsonOk({ capture }, 201);
}
