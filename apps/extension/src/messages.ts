import type { PageExtract } from "./extract.js";

export const MSG_EXTRACT = "DLBH_EXTRACT_PAGE" as const;

export type ExtractRequest = { type: typeof MSG_EXTRACT };

export type ExtractResponse =
  | { ok: true; data: PageExtract }
  | { ok: false; error: string };
