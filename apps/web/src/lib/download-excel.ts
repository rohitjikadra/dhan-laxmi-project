import { getToken } from "./client-auth";

export async function downloadCapturesExcel(dlAccountId?: string) {
  const query = dlAccountId
    ? `?dlAccountId=${encodeURIComponent(dlAccountId)}`
    : "";
  const headers = new Headers();
  const token = getToken();
  if (!token) throw new Error("Log in again.");
  headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`/api/captures/export${query}`, { headers });
  } catch {
    throw new Error(
      "Network error. Is the website server running? (npm run dev:web)"
    );
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `Export failed (${res.status})`);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const filename = match?.[1] || "dhanlaxmi-captures.xlsx";
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
