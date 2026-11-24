import type { BusinessRules, BusinessRulesRaw, MatchMode } from "./types.js";

export function normalizeRules(raw: BusinessRulesRaw = {}): BusinessRules {
  const match: MatchMode = raw.match === "exact" ? "exact" : "includes";

  return {
    version: raw.version ?? 1,
    match,
    ignoreProducts: raw.ignoreProducts || [],
    halfProducts: raw.halfProducts || [],
    halfAllRenewal: raw.halfAllRenewal !== false,
    skipSiteTotalRow: raw.skipSiteTotalRow !== false,
    turnoverFromSiteTotalRow: raw.turnoverFromSiteTotalRow !== false,
    columns: {
      personalNew: raw.columns?.personalNew !== false,
      personalRenewal: raw.columns?.personalRenewal !== false,
      groupNew: raw.columns?.groupNew !== false,
      groupRenewal: raw.columns?.groupRenewal !== false,
    },
  };
}
