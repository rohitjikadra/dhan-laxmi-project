/** Shared API request/response types (Phase 2 wires real handlers). */

export type AuthRegisterBody = {
  email: string;
  password: string;
};

export type AuthLoginBody = {
  email: string;
  password: string;
};

export type AuthTokenResponse = {
  token: string;
};

export type CaptureCreateBody = {
  dlAccountId: string;
  dlAccountName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  totalBusiness: number;
  turnover?: number | null;
  ignoredProducts?: string[];
  halfProducts?: string[];
  details?: unknown[];
};

export type CaptureRecord = CaptureCreateBody & {
  id: string;
  userId: string;
  businessDate?: string | null;
  source: "extension";
  createdAt: string;
  updatedAt: string;
};

export type CapturesListResponse = {
  items: CaptureRecord[];
};

export type CapturesSummaryItem = {
  dlAccountId: string;
  dlAccountName: string | null;
  startDate: string | null;
  endDate: string | null;
  totalBusiness: number;
  turnover: number | null;
  updatedAt: string;
  captureCount: number;
};

export type CapturesSummaryResponse = {
  items: CapturesSummaryItem[];
};
