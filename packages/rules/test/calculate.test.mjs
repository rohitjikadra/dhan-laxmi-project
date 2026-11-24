import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  calculateBusiness,
  defaultRules,
  defaultRulesRaw,
  loadRules,
  numberOrZero,
  normalizeRules,
} from "../dist/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("numberOrZero", () => {
  it("parses currency strings", () => {
    assert.equal(numberOrZero("₹1,234.50"), 1234.5);
    assert.equal(numberOrZero(""), 0);
    assert.equal(numberOrZero(null), 0);
    assert.equal(numberOrZero(42), 42);
  });
});

describe("default rules", () => {
  it("matches config/business-rules.json", () => {
    const fromFile = JSON.parse(
      readFileSync(join(root, "config", "business-rules.json"), "utf8")
    );
    assert.deepEqual(defaultRulesRaw.ignoreProducts, fromFile.ignoreProducts);
    assert.deepEqual(defaultRulesRaw.halfProducts, fromFile.halfProducts);
    assert.equal(defaultRulesRaw.halfAllRenewal, fromFile.halfAllRenewal);
    assert.equal(defaultRules.match, "includes");
  });
});

describe("calculateBusiness", () => {
  it("applies ignore, half product, renewal half, and site total turnover", () => {
    const rows = [
      {
        productName: "FD Normal",
        personalNew: 100,
        personalRenewal: 50,
        groupNew: 20,
        groupRenewal: 10,
        total: 180,
      },
      // new=120 @100%, renewal=60 @50% → 120+30 = 150
      {
        productName: "180 DAYS 7% SPECIAL",
        personalNew: 1000,
        personalRenewal: 1000,
        groupNew: 1000,
        groupRenewal: 1000,
        total: 4000,
      },
      // ignore → 0
      {
        productName: "MIP GOLD PLAN",
        personalNew: 100,
        personalRenewal: 40,
        groupNew: 0,
        groupRenewal: 0,
        total: 140,
      },
      // half product: new=50, renewal=20 → 70
      {
        productName: "Total",
        personalNew: 0,
        personalRenewal: 0,
        groupNew: 0,
        groupRenewal: 0,
        total: "₹9,999.00",
      },
      // turnover only
    ];

    const result = calculateBusiness(rows, defaultRules);

    assert.equal(result.totalBusiness, 220);
    assert.equal(result.turnover, 9999);
    assert.deepEqual(result.ignoredProducts, ["180 DAYS 7% SPECIAL"]);
    assert.deepEqual(result.halfProducts, ["MIP GOLD PLAN"]);
    assert.equal(result.renewalHalf.applied, true);
    // FD renewal 60 + MIP renewal 40 = 100 raw (ignore excluded)
    assert.equal(result.renewalHalf.rawRenewalTotal, 100);
    assert.equal(result.renewalHalf.countedRenewalTotal, 50);
  });

  it("supports includes match for DDS ignore and XFD half", () => {
    const rows = [
      {
        productName: "DDS 90DAYS NEW A",
        personalNew: 500,
        personalRenewal: 100,
        groupNew: 0,
        groupRenewal: 0,
      },
      {
        productName: "XFD 12M 9.75 NEW",
        personalNew: 200,
        personalRenewal: 0,
        groupNew: 0,
        groupRenewal: 0,
      },
      {
        productName: "12XFD WSC 10.00%",
        personalNew: 0,
        personalRenewal: 80,
        groupNew: 0,
        groupRenewal: 0,
      },
    ];

    const result = calculateBusiness(rows, defaultRules);
    // ignore DDS; XFD half new 100; 12XFD renewal half of 80 = 40
    assert.equal(result.totalBusiness, 140);
    assert.deepEqual(result.ignoredProducts, ["DDS 90DAYS NEW A"]);
    assert.deepEqual(result.halfProducts, [
      "XFD 12M 9.75 NEW",
      "12XFD WSC 10.00%",
    ]);
  });

  it("can turn off halfAllRenewal via normalizeRules", () => {
    const rules = normalizeRules({
      ...defaultRulesRaw,
      halfAllRenewal: false,
      halfProducts: [],
      ignoreProducts: [],
    });
    const result = calculateBusiness(
      [
        {
          productName: "Plain",
          personalNew: 100,
          personalRenewal: 40,
          groupNew: 0,
          groupRenewal: 0,
        },
      ],
      rules
    );
    assert.equal(result.totalBusiness, 140);
    assert.equal(result.renewalHalf.applied, false);
  });

  it("loadRules() returns defaults when raw omitted", () => {
    assert.equal(loadRules().ignoreProducts.length, 2);
  });
});
