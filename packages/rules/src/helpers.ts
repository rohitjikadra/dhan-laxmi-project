export function isSiteTotalRow(name: string): boolean {
  return /^total$/i.test(name.trim());
}

export function matchesAny(
  productName: string,
  patterns: string[],
  mode: "includes" | "exact"
): boolean {
  const hay = productName.toLowerCase();
  for (const pattern of patterns) {
    const needle = String(pattern || "").trim().toLowerCase();
    if (!needle) continue;
    if (mode === "exact") {
      if (hay === needle) return true;
    } else if (hay.includes(needle)) {
      return true;
    }
  }
  return false;
}

export function numberOrZero(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const cleaned = String(value).replace(/[₹,\s]/g, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
