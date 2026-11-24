const TOKEN_KEY = "token";
const API_BASE_KEY = "apiBase";
const EMAIL_KEY = "email";

export const DEFAULT_API_BASE = "http://localhost:3000";

export async function getApiBase(): Promise<string> {
  const data = await chrome.storage.local.get(API_BASE_KEY);
  return (data[API_BASE_KEY] as string) || DEFAULT_API_BASE;
}

export async function setApiBase(url: string): Promise<void> {
  await chrome.storage.local.set({ [API_BASE_KEY]: url.replace(/\/$/, "") });
}

export async function getToken(): Promise<string | null> {
  const data = await chrome.storage.local.get(TOKEN_KEY);
  return (data[TOKEN_KEY] as string) || null;
}

export async function setSession(token: string, email: string): Promise<void> {
  await chrome.storage.local.set({ [TOKEN_KEY]: token, [EMAIL_KEY]: email });
}

export async function getEmail(): Promise<string | null> {
  const data = await chrome.storage.local.get(EMAIL_KEY);
  return (data[EMAIL_KEY] as string) || null;
}

export async function clearSession(): Promise<void> {
  await chrome.storage.local.remove([TOKEN_KEY, EMAIL_KEY]);
}
