import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listCaptures } from "@/lib/captures";
import { capturesToXlsx, capturesWorkbookFilename } from "@/lib/excel";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  const dlAccountId = req.nextUrl.searchParams.get("dlAccountId") || undefined;
  if (dlAccountId && dlAccountId.length > 64) {
    return jsonError("dlAccountId invalid");
  }

  const items = await listCaptures(auth.user.id, { dlAccountId });
  const body = await capturesToXlsx(items);
  const filename = capturesWorkbookFilename(dlAccountId);

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
