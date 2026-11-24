import type { ProductRow } from "@dlbh/rules";

export type PageExtract = {
  rows: ProductRow[];
  startDate: string | null;
  endDate: string | null;
  dlAccountId: string | null;
  dlAccountName: string | null;
  pageUrl: string;
  warnings: string[];
};

/** Port of xlnc extractProductRows DOM logic (browser). */
export function extractProductRows(doc: Document = document): ProductRow[] {
  const tables = [...doc.querySelectorAll("table")];
  let target: HTMLTableElement | null = null;
  for (const table of tables) {
    const text = (table.innerText || "").toLowerCase();
    if (text.includes("product name") && text.includes("personal")) {
      target = table;
      break;
    }
  }
  if (!target) return [];

  const out: ProductRow[] = [];
  for (const tr of target.querySelectorAll("tr")) {
    const cells = [...tr.querySelectorAll("th, td")].map((td) =>
      (td.textContent || "").replace(/\s+/g, " ").trim()
    );
    if (cells.length < 5) continue;
    const productName = cells[0];
    if (!productName || /^product name$/i.test(productName)) continue;
    if (/^new$/i.test(productName) || /^renewal$/i.test(productName)) continue;

    const nums = cells.slice(1);
    out.push({
      productName,
      personalNew: nums[0] ?? "0",
      personalRenewal: nums[1] ?? "0",
      groupNew: nums[2] ?? "0",
      groupRenewal: nums[3] ?? "0",
      total: nums[4] ?? nums[nums.length - 1] ?? "0",
      rawCells: cells,
    });
  }
  return out;
}

export function extractDates(doc: Document = document): {
  startDate: string | null;
  endDate: string | null;
} {
  const dateInputs = [
    ...doc.querySelectorAll<HTMLInputElement>('input[type="date"]'),
  ];
  const values = dateInputs
    .map((el) => (el.value || "").trim())
    .filter(Boolean);

  if (values.length >= 2) {
    return { startDate: values[0], endDate: values[1] };
  }

  const bodyText = doc.body?.innerText || "";
  const fromMatch = bodyText.match(
    /from\s*[:\-]?\s*(\d{4}-\d{2}-\d{2}|\d{2}[\/\-]\d{2}[\/\-]\d{4})/i
  );
  const toMatch = bodyText.match(
    /to\s*[:\-]?\s*(\d{4}-\d{2}-\d{2}|\d{2}[\/\-]\d{2}[\/\-]\d{4})/i
  );
  return {
    startDate: fromMatch?.[1] ?? null,
    endDate: toMatch?.[1] ?? null,
  };
}

/**
 * Best-effort account id/name from visible page + storage.
 * Dhanlaxmi DOM change ho to patterns yahan badhao.
 */
export function extractAccountInfo(doc: Document = document): {
  dlAccountId: string | null;
  dlAccountName: string | null;
  warnings: string[];
} {
  const warnings: string[] = [];
  let dlAccountId: string | null = null;
  let dlAccountName: string | null = null;

  // 0) Dhanlaxmi top bar: visible h6 = name, id sits in a closed
  //    dropdown (`display: none`) as "name<br>(2048452)".
  //    innerText skips that node; textContent still has it.
  const chip = extractProfileChip(doc);
  if (chip?.id) dlAccountId = chip.id;
  if (chip?.name) dlAccountName = chip.name;
  if (dlAccountId && dlAccountName) {
    return { dlAccountId, dlAccountName, warnings };
  }

  // 1) Labeled fields (common portal headers)
  const idLabeled = findLabeledValue(doc, [
    /user\s*id/i,
    /login\s*id/i,
    /agent\s*(code|id)/i,
    /member\s*id/i,
    /distributor\s*(code|id)/i,
    /associate\s*(code|id)/i,
    /code\s*no\.?/i,
    /account\s*(id|code|no\.?)/i,
  ]);
  if (idLabeled) {
    const digits = idLabeled.match(/\d{4,}/);
    dlAccountId = digits?.[0] ?? null;
    if (!dlAccountName) {
      const nameFromIdLine = splitNameBesideId(idLabeled, dlAccountId);
      if (nameFromIdLine) dlAccountName = nameFromIdLine;
    }
  }

  const nameLabeled = findLabeledValue(doc, [
    /(?:user|agent|member|associate|distributor|advisor)\s*name/i,
    /full\s*name/i,
    /display\s*name/i,
    /name\s*of\s*(?:the\s*)?(?:agent|member|associate|user)/i,
    /^name$/i,
    /welcome/i,
  ]);
  if (nameLabeled) {
    const cleaned = cleanName(nameLabeled);
    if (cleaned) dlAccountName = cleaned;
  }

  // 2) Header / topbar blob
  const header = doc.querySelector(
    "header, .header, .navbar, .topbar, .top-bar, nav, .MuiAppBar-root, .toolbar"
  );
  const headerText = (header?.textContent || "").replace(/\s+/g, " ").trim();
  const topBlob = (
    headerText ||
    (doc.body?.innerText || "").slice(0, 2500)
  ).replace(/\s+/g, " ");

  if (!dlAccountId) {
    const idMatch = topBlob.match(
      /(?:user\s*id|login\s*id|agent\s*code|member\s*id|code(?:\s*no\.?)?)\s*[:\-#]?\s*(\d{4,})/i
    );
    if (idMatch) dlAccountId = idMatch[1];
  }

  if (!dlAccountName) {
    const fromWelcome = matchWelcomeName(topBlob);
    if (fromWelcome) dlAccountName = fromWelcome;
  }

  if (!dlAccountName || !dlAccountId) {
    const paired = matchIdNamePair(topBlob);
    if (paired) {
      if (!dlAccountId && paired.id) dlAccountId = paired.id;
      if (!dlAccountName && paired.name) dlAccountName = paired.name;
    }
  }

  // 3) title / aria-label on profile-ish nodes
  if (!dlAccountName) {
    const fromAttrs = nameFromAttributes(doc);
    if (fromAttrs) dlAccountName = fromAttrs;
  }

  // 4) SPA storage (many portals stash profile here)
  const fromStorage = readProfileFromStorage();
  if (!dlAccountId && fromStorage.id) dlAccountId = fromStorage.id;
  if (!dlAccountName && fromStorage.name) dlAccountName = fromStorage.name;

  // 5) Last pass: any "Name : X" in first screenful
  if (!dlAccountName) {
    const nameLine = topBlob.match(
      /(?:^|[\s|])name\s*[:\-]\s*([^\n|]{2,60}?)(?:\s{2,}|\||$)/i
    );
    if (nameLine) {
      const cleaned = cleanName(nameLine[1]);
      if (cleaned && !/^(id|code|user|login)$/i.test(cleaned)) {
        dlAccountName = cleaned;
      }
    }
  }

  if (!dlAccountId) {
    warnings.push(
      "Account id DOM se nahi mila — neeche manually enter karo."
    );
  }
  if (!dlAccountName) {
    warnings.push(
      "Account name DOM se nahi mila — optional field me manually bharo."
    );
  }

  return { dlAccountId, dlAccountName, warnings };
}

export function extractPage(doc: Document = document): PageExtract {
  const rows = extractProductRows(doc);
  const { startDate, endDate } = extractDates(doc);
  const account = extractAccountInfo(doc);
  const warnings = [...account.warnings];

  if (!rows.length) {
    warnings.unshift(
      "Product table nahi mili. Product Wise Business pe Search karke phir try karo."
    );
  }

  return {
    rows,
    startDate,
    endDate,
    dlAccountId: account.dlAccountId,
    dlAccountName: account.dlAccountName,
    pageUrl: doc.location?.href || "",
    warnings,
  };
}

/**
 * Profile chip in the fixed header / dropdown.
 * Short nodes only, so a big page blob cannot swallow the name.
 */
function extractProfileChip(doc: Document): {
  id: string | null;
  name: string | null;
} | null {
  let name: string | null = null;
  let id: string | null = null;

  const nodes = doc.querySelectorAll(
    "h1, h2, h3, h4, h5, h6, p, span, a, button, li, div"
  );

  for (const node of nodes) {
    if (!inProfileArea(node)) continue;
    const text = (node.textContent || "").replace(/\s+/g, " ").trim();
    if (!text || text.length > 90) continue;
    // Parent copies child text (h6 name + dropdown name). Use the inner node.
    if (isTextWrapper(node, text)) continue;

    const paired = matchIdNamePair(text);
    if (paired?.id && paired.name && paired.name.split(" ").length >= 2) {
      return { id: paired.id, name: paired.name };
    }

    if (!id) {
      const parenId = text.match(/\(\s*(\d{5,})\s*\)/);
      if (parenId) id = parenId[1];
    }

    const tag = node.tagName || "";
    if (!name && /^H[1-6]$/.test(tag) && text.length <= 60 && !/\d/.test(text)) {
      const cleaned = cleanName(text);
      const words = cleaned?.split(" ") ?? [];
      if (cleaned && words.length >= 2 && words.length <= 6) name = cleaned;
    }
  }

  if (!name && !id) return null;
  return { id, name };
}

function isTextWrapper(node: Element, text: string): boolean {
  const kids = node.children;
  if (!kids) return false;
  for (const child of kids) {
    const childText = (child.textContent || "").replace(/\s+/g, " ").trim();
    if (!childText) continue;
    if (childText === text) return true;
    if (/\(\s*\d{5,}\s*\)/.test(childText)) return true;
  }
  return false;
}

function inProfileArea(node: Element): boolean {
  let el: Element | null = node;
  for (let i = 0; i < 8 && el; i += 1) {
    const tag = (el.tagName || "").toLowerCase();
    if (tag === "header" || tag === "nav") return true;
    const cls = (el.getAttribute?.("class") || "").toLowerCase();
    const tokens = cls.split(/\s+/);
    if (
      tokens.some(
        (t) =>
          t === "fixed" ||
          t === "sticky" ||
          t.endsWith(":fixed") ||
          t.endsWith(":sticky")
      )
    ) {
      return true;
    }
    if (/dropdown|profile|topbar|navbar|toolbar/.test(cls)) return true;
    el = el.parentElement;
  }
  return false;
}

function findLabeledValue(doc: Document, patterns: RegExp[]): string | null {
  const nodes = [
    ...doc.querySelectorAll(
      "label, th, td, span, div, p, li, strong, b, h1, h2, h3, h4, h5, h6, a, button"
    ),
  ];
  for (const node of nodes) {
    const text = (node.textContent || "").replace(/\s+/g, " ").trim();
    if (!text || text.length > 160) continue;
    for (const re of patterns) {
      if (!re.test(text)) continue;

      // "User Name: Ram" same node
      const afterColon = text.split(/[:\-–]/).slice(1).join(":").trim();
      if (afterColon && afterColon.length < 80 && !re.test(afterColon)) {
        return afterColon;
      }

      // next sibling
      const sibling = node.nextElementSibling;
      const sibText = sibling?.textContent?.replace(/\s+/g, " ").trim();
      if (sibText && sibText.length < 80 && !re.test(sibText)) return sibText;

      // parent combined "Label value"
      const parent = node.parentElement;
      if (parent) {
        const parentText = parent.textContent?.replace(/\s+/g, " ").trim() || "";
        const m = parentText.match(
          new RegExp("(?:" + re.source + ")\\s*[:\\-–]?\\s*(.+)$", "i")
        );
        if (m?.[1]) {
          const v = m[1].trim().slice(0, 80);
          if (v && !re.test(v)) return v;
        }
      }

      // following text node / child value span
      const valueChild = node.querySelector(
        ".value, .val, [class*='value'], [class*='name']"
      );
      const childText = valueChild?.textContent?.replace(/\s+/g, " ").trim();
      if (childText && childText.length < 80 && !re.test(childText)) {
        return childText;
      }
    }
  }
  return null;
}

function matchWelcomeName(blob: string): string | null {
  const patterns = [
    /welcome\s*[,:]?\s+([^\n|,]{2,60})/i,
    /(?:hi|hello|dear)\s+([^\n|,]{2,60})/i,
    /logged\s*in\s*as\s*[:\-]?\s*([^\n|,]{2,60})/i,
  ];
  for (const re of patterns) {
    const m = blob.match(re);
    if (!m?.[1]) continue;
    const cleaned = cleanName(m[1]);
    if (cleaned) return cleaned;
  }
  return null;
}

function matchIdNamePair(
  blob: string
): { id: string | null; name: string | null } | null {
  // 2048452 - RAMESH PATEL  OR  RAMESH PATEL (2048452)
  const a = blob.match(
    /(\d{5,})\s*[-–|:]\s*([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F0-9 .']{1,60})/
  );
  if (a) {
    return { id: a[1], name: cleanName(a[2]) };
  }
  const b = blob.match(
    /([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F0-9 .']{1,60})\s*[\(\[]\s*(\d{5,})\s*[\)\]]/
  );
  if (b) {
    return { id: b[2], name: cleanName(b[1]) };
  }
  return null;
}

function splitNameBesideId(
  labeled: string,
  id: string | null
): string | null {
  if (!id) return null;
  const withoutId = labeled.replace(id, " ").replace(/[-–|:()]/g, " ");
  return cleanName(withoutId);
}

function nameFromAttributes(doc: Document): string | null {
  const nodes = [
    ...doc.querySelectorAll(
      "[title], [aria-label], [data-name], [data-username], [data-user-name]"
    ),
  ].slice(0, 80);
  for (const node of nodes) {
    const candidates = [
      node.getAttribute("data-user-name"),
      node.getAttribute("data-username"),
      node.getAttribute("data-name"),
      node.getAttribute("aria-label"),
      node.getAttribute("title"),
    ];
    for (const raw of candidates) {
      if (!raw) continue;
      if (/welcome|profile|account|menu|logout|login/i.test(raw) && raw.length < 12) {
        continue;
      }
      const fromWelcome = matchWelcomeName(raw);
      if (fromWelcome) return fromWelcome;
      const cleaned = cleanName(raw);
      if (cleaned && cleaned.split(" ").length <= 6) return cleaned;
    }
  }
  return null;
}

function readProfileFromStorage(): {
  id: string | null;
  name: string | null;
} {
  const out = { id: null as string | null, name: null as string | null };
  try {
    const stores: Storage[] = [];
    if (typeof localStorage !== "undefined") stores.push(localStorage);
    if (typeof sessionStorage !== "undefined") stores.push(sessionStorage);

    for (const store of stores) {
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (!key) continue;
        if (
          !/(user|profile|auth|account|agent|member|session)/i.test(key) &&
          store.length > 40
        ) {
          // skip noisy keys when storage is huge; still scan likely keys
          continue;
        }
        const raw = store.getItem(key);
        if (!raw || raw.length > 5000) continue;
        scanStorageValue(raw, out);
        if (out.id && out.name) return out;
      }
    }
  } catch {
    // storage blocked — ignore
  }
  return out;
}

function scanStorageValue(
  raw: string,
  out: { id: string | null; name: string | null }
) {
  // plain string id
  if (!out.id) {
    const idOnly = raw.trim().match(/^\d{5,}$/);
    if (idOnly) out.id = idOnly[0];
  }

  let parsed: unknown = raw;
  if (raw.startsWith("{") || raw.startsWith("[")) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
  }

  const objs: Record<string, unknown>[] = [];
  if (parsed && typeof parsed === "object") {
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item && typeof item === "object") {
          objs.push(item as Record<string, unknown>);
        }
      }
    } else {
      objs.push(parsed as Record<string, unknown>);
    }
  }

  for (const obj of objs) {
    walkObject(obj, out, 0);
  }

  if ((!out.id || !out.name) && typeof parsed === "string") {
    const paired = matchIdNamePair(parsed);
    if (paired) {
      if (!out.id && paired.id) out.id = paired.id;
      if (!out.name && paired.name) out.name = paired.name;
    }
  }
}

function walkObject(
  obj: Record<string, unknown>,
  out: { id: string | null; name: string | null },
  depth: number
) {
  if (depth > 4) return;
  for (const [key, value] of Object.entries(obj)) {
    if (value == null) continue;
    const k = key.toLowerCase();

    if (
      !out.id &&
      /(userid|user_id|loginid|login_id|agentcode|agent_code|memberid|accountid|account_id|^code$|^id$)/i.test(
        k
      )
    ) {
      const digits = String(value).match(/\d{4,}/);
      if (digits) out.id = digits[0];
    }

    if (
      !out.name &&
      /(displayname|display_name|fullname_name|agentname|agent_name|membername|member_name|associatename|^name$)/i.test(
        k
      )
    ) {
      const cleaned = cleanName(String(value));
      if (cleaned && !/^\d+$/.test(cleaned)) out.name = cleaned;
    }

    // username / login: digits → id, otherwise → name
    if (/^(username|user_name|login|loginname|login_name)$/i.test(k)) {
      const s = String(value).trim();
      const digits = s.match(/^\d{4,}$/);
      if (digits && !out.id) out.id = digits[0];
      else {
        const cleaned = cleanName(s);
        if (cleaned && !out.name) out.name = cleaned;
      }
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      walkObject(value as Record<string, unknown>, out, depth + 1);
    }
  }
}

/** Keep Latin + Devanagari letters; strip junk that emptied Indian names before. */
function cleanName(value: string): string | null {
  let cleaned = value
    .replace(/welcome/gi, " ")
    .replace(/\b(hi|hello|dear|mr\.?|mrs\.?|ms\.?)\b/gi, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\p{L}\p{M}0-9 .']/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  // drop pure ids
  if (/^\d+$/.test(cleaned)) return null;
  // too short / garbage
  if (cleaned.length < 2) return null;
  if (
    /^(user|name|id|code|login|account|profile|menu|home|dashboard)$/i.test(
      cleaned
    )
  ) {
    return null;
  }
  return cleaned;
}
