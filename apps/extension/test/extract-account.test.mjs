import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = mkdtempSync(join(tmpdir(), "dlbh-extract-"));
const outfile = join(tmp, "extract.mjs");

await esbuild.build({
  entryPoints: [join(root, "src", "extract.ts")],
  outfile,
  bundle: true,
  format: "esm",
  platform: "neutral",
});

const { extractAccountInfo } = await import(pathToFileURL(outfile).href);

/** Minimal DOM stub — sirf extractAccountInfo ke paths cover. */
function docFrom(nodes) {
  const bodyText = nodes.map((n) => n.text).join("\n");
  const elements = nodes.map((n) => ({
    textContent: n.text,
    getAttribute: () => null,
    nextElementSibling: null,
    parentElement: {
      textContent: n.text,
    },
    querySelector: () => null,
  }));

  return {
    body: { innerText: bodyText },
    querySelector: (sel) => {
      if (/header|navbar|topbar|nav/i.test(sel)) {
        return { textContent: nodes.find((n) => n.header)?.text || bodyText.slice(0, 200) };
      }
      return null;
    },
    querySelectorAll: (sel) => {
      if (/title|aria-label|data-name/i.test(sel)) return [];
      return elements;
    },
  };
}

{
  const r = extractAccountInfo(
    docFrom([
      { text: "User Id : 2048452", header: true },
      { text: "User Name : Ramesh Patel" },
      { text: "Welcome, Ramesh Patel" },
    ])
  );
  assert.equal(r.dlAccountId, "2048452");
  assert.equal(r.dlAccountName, "Ramesh Patel");
}

{
  const r = extractAccountInfo(
    docFrom([{ text: "2048452 - SURESH SHAH", header: true }])
  );
  assert.equal(r.dlAccountId, "2048452");
  assert.equal(r.dlAccountName, "SURESH SHAH");
}

// Dhanlaxmi header: h6 name is visible, id is inside display:none dropdown.
// body.innerText must NOT include the hidden id — that is the bug.
{
  const h6 = makeEl("h6", { class: "capitalize text-sm" }, [
    "rohitkumar kishorbhai jikadra",
  ]);
  const nameBlock = makeEl("div", { class: "hidden md:block lg:block" }, [
    makeEl("div", { class: "items-center justify-center m-0 p-0" }, [h6]),
  ]);
  const profileP = makeEl(
    "p",
    { class: "capitalize text-white text-[10px] font-semibold" },
    ["rohitkumar kishorbhai jikadra", makeEl("br", {}, []), "(", "2048452", ")"]
  );
  const dropdown = makeEl(
    "div",
    {
      class: "absolute max-w-full h-auto right-[0%] dropdownheadtwo",
      style: "display: none;",
    },
    [
      makeEl("div", { class: "bg-blue-800" }, [profileP]),
      makeEl("div", { class: "flex flex-col p-6 space-y-3" }, ["Logout"]),
    ]
  );
  const bar = makeEl(
    "div",
    {
      class:
        "z-50 flex items-center justify-between px-5 border-b fixed w-full bg-white",
    },
    [nameBlock, dropdown]
  );
  const body = makeEl("div", { class: "relative w-screen h-screen" }, [
    bar,
    makeEl("p", {}, ["Product Name Personal Renewal"]),
  ]);

  const all = [];
  walk(body, all);

  const r = extractAccountInfo({
    body: { innerText: visibleText(body) },
    querySelector: () => null,
    querySelectorAll: () => all,
  });

  assert.equal(visibleText(body).includes("2048452"), false);
  assert.equal(r.dlAccountId, "2048452");
  assert.equal(r.dlAccountName, "rohitkumar kishorbhai jikadra");
  assert.deepEqual(r.warnings, []);
}

function makeEl(tag, attrs, children) {
  const el = {
    tagName: tag.toUpperCase(),
    attrs,
    children,
    parentElement: null,
    nextElementSibling: null,
    getAttribute(name) {
      return attrs[name] ?? null;
    },
    querySelector: () => null,
    get textContent() {
      return children
        .map((c) => (typeof c === "string" ? c : c.textContent))
        .join("");
    },
  };
  let prev = null;
  for (const child of children) {
    if (typeof child === "string") continue;
    child.parentElement = el;
    if (prev) prev.nextElementSibling = child;
    prev = child;
  }
  return el;
}

function walk(el, acc) {
  acc.push(el);
  for (const child of el.children) {
    if (typeof child !== "string") walk(child, acc);
  }
}

function visibleText(el) {
  const style = el.attrs?.style || "";
  if (/display\s*:\s*none/i.test(style)) return "";
  return el.children
    .map((c) => (typeof c === "string" ? c : visibleText(c)))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

console.log("extract-account tests OK");
