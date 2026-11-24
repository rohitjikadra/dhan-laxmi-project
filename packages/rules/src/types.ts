export type MatchMode = "includes" | "exact";

export type ColumnFlags = {
  personalNew: boolean;
  personalRenewal: boolean;
  groupNew: boolean;
  groupRenewal: boolean;
};

/** Normalized rules used by calculateBusiness. */
export type BusinessRules = {
  version: number;
  match: MatchMode;
  ignoreProducts: string[];
  halfProducts: string[];
  halfAllRenewal: boolean;
  skipSiteTotalRow: boolean;
  turnoverFromSiteTotalRow: boolean;
  columns: ColumnFlags;
};

/** Raw JSON shape (config/business-rules.json). */
export type BusinessRulesRaw = {
  version?: number;
  match?: MatchMode | string;
  ignoreProducts?: string[];
  halfProducts?: string[];
  halfAllRenewal?: boolean;
  skipSiteTotalRow?: boolean;
  turnoverFromSiteTotalRow?: boolean;
  columns?: Partial<ColumnFlags>;
  notes?: string;
};

export type ProductRow = {
  productName: string;
  personalNew?: string | number | null;
  personalRenewal?: string | number | null;
  groupNew?: string | number | null;
  groupRenewal?: string | number | null;
  /** Site Total row amount (turnover source). */
  total?: string | number | null;
  rawCells?: string[];
};

export type DetailRole = "site_total" | "ignore" | "half_product" | "full_new";

export type CalculationDetail = {
  productName: string;
  role: DetailRole;
  counted: number;
  countedNew?: number;
  countedRenewal?: number;
  turnoverValue?: number | null;
  personalNew?: string | number | null;
  personalRenewal?: string | number | null;
  groupNew?: string | number | null;
  groupRenewal?: string | number | null;
};

export type RenewalHalfSummary = {
  applied: boolean;
  rawRenewalTotal: number;
  countedRenewalTotal: number;
};

export type CalculateResult = {
  totalBusiness: number;
  turnover: number | null;
  ignoredProducts: string[];
  halfProducts: string[];
  renewalHalf: RenewalHalfSummary;
  details: CalculationDetail[];
};
