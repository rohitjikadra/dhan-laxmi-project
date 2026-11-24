import { extractPage } from "./extract.js";
import { MSG_EXTRACT, type ExtractRequest, type ExtractResponse } from "./messages.js";

chrome.runtime.onMessage.addListener((message: ExtractRequest, _sender, sendResponse) => {
  if (!message || message.type !== MSG_EXTRACT) return;

  try {
    const data = extractPage(document);
    const response: ExtractResponse = { ok: true, data };
    sendResponse(response);
  } catch (err) {
    const response: ExtractResponse = {
      ok: false,
      error: err instanceof Error ? err.message : "Extract failed",
    };
    sendResponse(response);
  }

  return true;
});

console.info("[dlbh] content script ready");
