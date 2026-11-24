import { isSiteTotalRow, matchesAny, numberOrZero, round2 } from "./helpers.js";
import type {
  BusinessRules,
  CalculateResult,
  CalculationDetail,
  ProductRow,
} from "./types.js";

/**
 * Apply ignore / half / renewal-half rules to product rows.
 * Ported from xlnc/src/rules.js — keep behaviour identical.
 */
export function calculateBusiness(
  rows: ProductRow[],
  rules: BusinessRules
): CalculateResult {
  let totalBusiness = 0;
  let turnover: number | null = null;
  const details: CalculationDetail[] = [];
  const ignoredProducts: string[] = [];
  const halfProducts: string[] = [];
  let renewalHalfAmount = 0;

  for (const row of rows) {
    const name = String(row.productName || "").trim();
    if (!name) continue;

    if (isSiteTotalRow(name)) {
      if (rules.turnoverFromSiteTotalRow) {
        turnover = numberOrZero(row.total);
      }
      details.push({
        productName: name,
        role: "site_total",
        counted: 0,
        turnoverValue: turnover,
      });
      continue;
    }

    if (matchesAny(name, rules.ignoreProducts, rules.match)) {
      ignoredProducts.push(name);
      details.push({
        productName: name,
        role: "ignore",
        counted: 0,
        personalNew: row.personalNew,
        personalRenewal: row.personalRenewal,
        groupNew: row.groupNew,
        groupRenewal: row.groupRenewal,
      });
      continue;
    }

    const cols = rules.columns;
    const newAmount =
      (cols.personalNew ? numberOrZero(row.personalNew) : 0) +
      (cols.groupNew ? numberOrZero(row.groupNew) : 0);
    const renewalAmount =
      (cols.personalRenewal ? numberOrZero(row.personalRenewal) : 0) +
      (cols.groupRenewal ? numberOrZero(row.groupRenewal) : 0);

    const halfProduct = matchesAny(name, rules.halfProducts, rules.match);
    const countedNew = halfProduct ? newAmount * 0.5 : newAmount;
    const countedRenewal = rules.halfAllRenewal
      ? renewalAmount * 0.5
      : renewalAmount;
    const counted = countedNew + countedRenewal;

    if (halfProduct) {
      halfProducts.push(name);
    }
    if (rules.halfAllRenewal && renewalAmount > 0) {
      renewalHalfAmount += renewalAmount;
    }

    totalBusiness += counted;
    details.push({
      productName: name,
      role: halfProduct ? "half_product" : "full_new",
      counted,
      countedNew,
      countedRenewal,
      personalNew: row.personalNew,
      personalRenewal: row.personalRenewal,
      groupNew: row.groupNew,
      groupRenewal: row.groupRenewal,
    });
  }

  return {
    totalBusiness: round2(totalBusiness),
    turnover: turnover == null ? null : round2(turnover),
    ignoredProducts,
    halfProducts,
    renewalHalf: {
      applied: rules.halfAllRenewal,
      rawRenewalTotal: round2(renewalHalfAmount),
      countedRenewalTotal: round2(renewalHalfAmount * 0.5),
    },
    details,
  };
}
