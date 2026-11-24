import type { BusinessRulesRaw } from "./types.js";

/** Same content as config/business-rules.json (keep in sync). */
export const defaultRulesRaw: BusinessRulesRaw = {
  version: 1,
  notes:
    "Is file ko edit karke ignore/half lists badal sakte ho. Code isko padhega.",
  match: "includes",
  ignoreProducts: ["180 DAYS 7%", "DDS 90DAYS NEW"],
  halfProducts: ["MIP", "12XFD WSC 10.00%", "XFD 12M 9.75 NEW"],
  halfAllRenewal: true,
  skipSiteTotalRow: true,
  turnoverFromSiteTotalRow: true,
  columns: {
    personalNew: true,
    personalRenewal: true,
    groupNew: true,
    groupRenewal: true,
  },
};
