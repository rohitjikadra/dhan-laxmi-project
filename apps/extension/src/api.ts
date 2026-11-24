import type { CaptureCreateBody, CaptureRecord } from "@dlbh/shared";
import { getApiBase, getToken } from "./storage.js";

async function request<T>(
  path: string,
  init: RequestInit = {},
  auth = true
): Promise<T> {
  const base = await getApiBase();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = await getToken();
    if (!token) throw new Error("Pehle website account se login karo.");
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { ...init, headers });
  } catch {
    throw new Error(
      `Network fail — API base check karo (${base}). Website chal raha hai?`
    );
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `API failed (${res.status})`);
  }
  return data;
}

export async function login(
  email: string,
  password: string
): Promise<{ token: string; user: { id: string; email: string } }> {
  return request(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
    false
  );
}

export async function saveCapture(
  body: CaptureCreateBody
): Promise<CaptureRecord> {
  const data = await request<{ capture: CaptureRecord }>("/api/captures", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data.capture;
}
