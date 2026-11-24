import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const FILENAME = "dhanlaxmi-business-hub-extension.zip";

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "extension", FILENAME);
  try {
    const body = await readFile(filePath);
    return new Response(body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${FILENAME}"`,
        "Cache-Control": "public, max-age=300",
        "Content-Length": String(body.byteLength),
      },
    });
  } catch {
    return Response.json(
      { error: "Extension zip not found on server" },
      { status: 404 }
    );
  }
}
