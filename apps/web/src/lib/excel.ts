import ExcelJS from "exceljs";
import type { CaptureRecord } from "@dlbh/shared";

const ROLE_LABEL: Record<string, string> = {
  site_total: "Site total",
  ignore: "Ignored",
  half_product: "Half",
  full_new: "Counted",
};

function cellNum(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function wholeAmount(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

export function capturesWorkbookFilename(accountId?: string) {
  const day = new Date().toISOString().slice(0, 10);
  if (!accountId) return `dhanlaxmi-captures-${day}.xlsx`;
  const safe = accountId.replace(/[^\w.-]+/g, "_").slice(0, 40);
  return `dhanlaxmi-${safe}-${day}.xlsx`;
}

function styleSheet(
  sheet: ExcelJS.Worksheet,
  widths: number[],
  numberColumns: number[],
  numFmt = "#,##0.00"
) {
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  for (const column of numberColumns) {
    sheet.getColumn(column).numFmt = numFmt;
  }
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: sheet.rowCount, column: widths.length },
  };
}

export async function capturesToXlsx(items: CaptureRecord[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const captures = wb.addWorksheet("Captures");
  captures.addRow([
    "Account name",
    "Account id",
    "Start date",
    "End date",
    "Business",
    "Turnover",
    "Ignored products",
    "Half products",
    "Updated",
  ]);

  const products = wb.addWorksheet("Products");
  products.addRow([
    "Account name",
    "Account id",
    "Start date",
    "End date",
    "Product",
    "Role",
    "Counted",
    "Counted new",
    "Counted renewal",
    "Personal new",
    "Personal renewal",
    "Group new",
    "Group renewal",
  ]);

  for (const item of items) {
    captures.addRow([
      item.dlAccountName || "",
      item.dlAccountId,
      item.startDate || "",
      item.endDate || "",
      wholeAmount(item.totalBusiness),
      wholeAmount(item.turnover),
      (item.ignoredProducts ?? []).join(", "),
      (item.halfProducts ?? []).join(", "),
      item.updatedAt || item.createdAt,
    ]);

    const details = Array.isArray(item.details) ? item.details : [];
    for (const raw of details) {
      const row = asRecord(raw);
      if (!row) continue;
      const role = text(row.role);
      products.addRow([
        item.dlAccountName || "",
        item.dlAccountId,
        item.startDate || "",
        item.endDate || "",
        text(row.productName),
        ROLE_LABEL[role] || role,
        cellNum(row.counted),
        cellNum(row.countedNew),
        cellNum(row.countedRenewal),
        cellNum(row.personalNew),
        cellNum(row.personalRenewal),
        cellNum(row.groupNew),
        cellNum(row.groupRenewal),
      ]);
    }
  }

  styleSheet(captures, [28, 16, 14, 14, 14, 14, 36, 28, 24], [5, 6], "0");
  styleSheet(
    products,
    [28, 16, 14, 14, 32, 12, 12, 14, 16, 14, 16, 12, 14],
    [7, 8, 9, 10, 11, 12, 13]
  );

  const raw = await wb.xlsx.writeBuffer();
  return Buffer.from(raw);
}
