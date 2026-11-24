import { calculateBusiness, defaultRules } from "@dlbh/rules";
import { login, saveCapture } from "./api.js";
import { MSG_EXTRACT, type ExtractResponse } from "./messages.js";
import {
  clearSession,
  getApiBase,
  getEmail,
  getToken,
  setApiBase,
  setSession,
} from "./storage.js";

const DHAN_HOST = "login.dhan-laxmi.co.in";

const authStatus = el<HTMLElement>("auth-status");
const loginForm = el<HTMLFormElement>("login-form");
const logoutBtn = el<HTMLButtonElement>("logout-btn");
const openDashBtn = el<HTMLButtonElement>("open-dash-btn");
const authedActions = el<HTMLElement>("authed-actions");
const emailInput = el<HTMLInputElement>("email");
const passwordInput = el<HTMLInputElement>("password");
const apiBaseInput = el<HTMLInputElement>("api-base");
const accountIdInput = el<HTMLInputElement>("account-id");
const accountNameInput = el<HTMLInputElement>("account-name");
const calcBtn = el<HTMLButtonElement>("calc-btn");
const statusEl = el<HTMLElement>("status");
const previewEl = el<HTMLElement>("preview");

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} missing`);
  return node as T;
}

function setStatus(text: string, kind: "" | "error" | "ok" = "") {
  statusEl.textContent = text;
  statusEl.classList.remove("error", "ok");
  if (kind) statusEl.classList.add(kind);
}

function showPreview(text: string) {
  previewEl.textContent = text;
  previewEl.classList.remove("hidden");
}

async function refreshAuthUi() {
  const token = await getToken();
  const email = await getEmail();
  apiBaseInput.value = await getApiBase();

  if (token && email) {
    authStatus.textContent = `Logged in: ${email}`;
    loginForm.classList.add("hidden");
    authedActions.classList.remove("hidden");
  } else {
    authStatus.textContent =
      "Website login required before Save (Calculate preview bina login bhi).";
    loginForm.classList.remove("hidden");
    authedActions.classList.add("hidden");
  }
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("Logging in…");
  try {
    if (apiBaseInput.value.trim()) {
      await setApiBase(apiBaseInput.value.trim());
    }
    const data = await login(emailInput.value.trim(), passwordInput.value);
    await setSession(data.token, data.user.email);
    passwordInput.value = "";
    setStatus("Login OK.", "ok");
    await refreshAuthUi();
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Login failed", "error");
  }
});

logoutBtn.addEventListener("click", async () => {
  await clearSession();
  setStatus("Logged out.");
  await refreshAuthUi();
});

openDashBtn.addEventListener("click", async () => {
  const base = await getApiBase();
  await chrome.tabs.create({ url: `${base}/dashboard` });
});

calcBtn.addEventListener("click", async () => {
  setStatus("Reading Dhanlaxmi page…");
  previewEl.classList.add("hidden");
  calcBtn.disabled = true;

  try {
    const tab = await getActiveDhanTab();
    const extracted = await extractFromTab(tab.id!);

    if (extracted.dlAccountId && !accountIdInput.value.trim()) {
      accountIdInput.value = extracted.dlAccountId;
    }
    if (extracted.dlAccountName && !accountNameInput.value.trim()) {
      accountNameInput.value = extracted.dlAccountName;
    }

    if (!extracted.rows.length) {
      throw new Error(
        extracted.warnings[0] ||
          "Table nahi mili. Pehle Product Wise Business pe Search karo."
      );
    }

    const result = calculateBusiness(extracted.rows, defaultRules);
    const dlAccountId = accountIdInput.value.trim() || extracted.dlAccountId;
    const dlAccountName =
      accountNameInput.value.trim() || extracted.dlAccountName || null;

    const preview = [
      `Rows: ${extracted.rows.length}`,
      `Dates: ${extracted.startDate || "—"} → ${extracted.endDate || "—"}`,
      `Account: ${dlAccountName || "—"} (${dlAccountId || "missing"})`,
      `total_business: ${result.totalBusiness}`,
      `turnover: ${result.turnover ?? "—"}`,
      `ignored: ${result.ignoredProducts.join(", ") || "(none)"}`,
      `half: ${result.halfProducts.join(", ") || "(none)"}`,
      ...extracted.warnings.map((w) => `⚠ ${w}`),
    ].join("\n");
    showPreview(preview);

    if (!(await getToken())) {
      setStatus("Calculate OK — Save ke liye pehle login karo.", "error");
      return;
    }
    if (!dlAccountId) {
      setStatus("Account id chahiye (auto miss → manually bharo).", "error");
      return;
    }

    setStatus("Saving to website…");
    const saved = await saveCapture({
      dlAccountId,
      dlAccountName,
      startDate: extracted.startDate,
      endDate: extracted.endDate,
      totalBusiness: result.totalBusiness,
      turnover: result.turnover,
      ignoredProducts: result.ignoredProducts,
      halfProducts: result.halfProducts,
      details: result.details,
    });

    setStatus(
      `Saved. business=${saved.totalBusiness} turnover=${saved.turnover ?? "—"}`,
      "ok"
    );
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Calculate failed", "error");
  } finally {
    calcBtn.disabled = false;
  }
});

async function getActiveDhanTab(): Promise<chrome.tabs.Tab> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id || !tab.url) {
    throw new Error("Active tab nahi mili.");
  }
  let host = "";
  try {
    host = new URL(tab.url).hostname;
  } catch {
    throw new Error("Invalid tab URL.");
  }
  if (host !== DHAN_HOST) {
    throw new Error(
      `Dhanlaxmi tab pe kholo (${DHAN_HOST}). Abhi: ${host || "unknown"}`
    );
  }
  return tab;
}

async function extractFromTab(tabId: number) {
  try {
    const response = (await chrome.tabs.sendMessage(tabId, {
      type: MSG_EXTRACT,
    })) as ExtractResponse;
    if (!response?.ok) {
      throw new Error(response?.error || "Content script no response");
    }
    return response.data;
  } catch {
    // Content script missing (SPA / not injected) → inject once
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    const response = (await chrome.tabs.sendMessage(tabId, {
      type: MSG_EXTRACT,
    })) as ExtractResponse;
    if (!response?.ok) {
      throw new Error(response?.error || "Extract failed after inject");
    }
    return response.data;
  }
}

void refreshAuthUi();
