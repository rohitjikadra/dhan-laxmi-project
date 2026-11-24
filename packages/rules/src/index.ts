import { calculateBusiness } from "./calculate.js";
import { defaultRulesRaw } from "./default-rules.js";
import { normalizeRules } from "./normalize.js";
import type { BusinessRules, BusinessRulesRaw } from "./types.js";

export type {
  BusinessRules,
  BusinessRulesRaw,
  CalculateResult,
  CalculationDetail,
  ColumnFlags,
  DetailRole,
  MatchMode,
  ProductRow,
  RenewalHalfSummary,
} from "./types.js";

export { calculateBusiness } from "./calculate.js";
export { defaultRulesRaw } from "./default-rules.js";
export { normalizeRules } from "./normalize.js";
export {
  isSiteTotalRow,
  matchesAny,
  numberOrZero,
  round2,
} from "./helpers.js";

/** Bundled default rules (same lists as xlnc config). */
export const defaultRules: BusinessRules = normalizeRules(defaultRulesRaw);

/** Normalize raw JSON (e.g. from API / config file) into BusinessRules. */
export function loadRules(raw?: BusinessRulesRaw): BusinessRules {
  if (!raw) return defaultRules;
  return normalizeRules(raw);
}

/** Convenience: calculate with bundled defaults when rules omitted. */
export function calculateBusinessWithDefaults(
  rows: Parameters<typeof calculateBusiness>[0],
  raw?: BusinessRulesRaw
) {
  return calculateBusiness(rows, loadRules(raw));
}
