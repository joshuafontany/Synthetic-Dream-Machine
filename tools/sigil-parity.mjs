// sigil-parity — what a COLD parse must find, declared by the tiddlers that own it.
//
// ── TWO REGISTERS, ONE VOCABULARY ───────────────────────────────────────────────────────────────
// A sigil can stand in two places and mean differently in each. In an exchange turn `<<~ confidence
// Canon 18/20 >>` STEERS — it vows a band the claim generates within. Inside a meme, in a chat-history
// lares or an in-character scene, the same glyphs are CONTENT: what was said, quoted. Resolving those
// to a widget would make a transcript lie about itself.
//
// So the corpus writes them 545 times and no cold parse scans one, and that reads as a hole only until
// you ask which register the carrier is in. `lar-cold` states the answer where the sigil is defined:
//
//   structure  a cold parse MUST find it — it bounds a worksite, carries an edge, frames a carrier
//   verbatim   a cold parse MUST leave it as text — the meme quotes it, and quoting is the point
//
// ── WHY MEASURING THIS TOOK THREE TRIES ─────────────────────────────────────────────────────────
// A raw scan reported 29 sigils written-and-unscanned. Two artifacts made that number:
//
//   · THE FRAME REGISTERS UNDER ITS ROLE, not its tiddler name — `control-soh`, never `frame-soh`.
//     Seven marks read unscanned that the bootstrap finds every time.
//   · THE SPEC AND THE SIGIL MEMES QUOTE THEIR OWN VOCABULARY constantly. Unmasked, every teaching
//     example counted as a use, and `procedure`, `widget`, `if`, `for` and a dozen others read as live
//     gaps while the corpus never wrote one outside a fence.
//
// Masked and aliased, the written-and-unscanned set is exactly the six `verbatim` sigils. The split is
// one clean line, and this witness holds it there.
import { readFileSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";
import { maskedExecAll } from "../packages/lararium-tw5/dist/deserializer.js";

const REPO = process.env["REPO"] ?? process.cwd();

/** The frame marks register by ROLE; the tiddlers name them by mark. */
const FRAME_ALIAS = {
  "frame-soh": "control-soh", "frame-soh2": "control-soh", "frame-stx": "control-stx",
  "frame-etx": "control-etx", "frame-etb": "control-etb",
  "frame-eot": "control-eot", "frame-eot2": "control-eot",
};

const scanned = new Set(
  [...readFileSync(join(REPO, "packages/lararium-tw5/src/meme-ast/scanner.ts"), "utf8")
    .matchAll(/sigilName:\s*"([^"]+)"/g)].map((m) => m[1]),
);

const tally = new Map();
for (const f of execSync("git ls-files 'bags/**/*.mem'", { encoding: "utf8", cwd: REPO }).split("\n").filter(Boolean)) {
  for (const m of maskedExecAll(readFileSync(join(REPO, f), "utf8"), /<<[~^!][ /]*\\?([A-Za-z][\w-]*)/g)) {
    tally.set(m[1], (tally.get(m[1]) ?? 0) + 1);
  }
}

const undeclared = [], blind = [], contradicted = [];
for (const f of execSync("git ls-files 'packages/lararium-tw5/tiddlers/sigil-*.tid'", { encoding: "utf8", cwd: REPO })
  .split("\n").filter(Boolean)) {
  const t = readFileSync(join(REPO, f), "utf8");
  const name = f.replace(/.*sigil-|\.tid$/g, "");
  const field = (k) => new RegExp(`^${k}:\\s*(.+)$`, "m").exec(t)?.[1]?.trim() ?? null;
  if (field("lar-kind") === "family") continue;

  const cold = field("lar-cold");
  if (cold !== "structure" && cold !== "verbatim") { undeclared.push([name, cold]); continue; }

  const alias = (field("lar-alias-for") ?? "").replace(/^\\/, "");
  const key = FRAME_ALIAS[name] ?? name;
  const isScanned = [key, alias, `\\${name}`].some((k) => k && scanned.has(k));
  const uses = (tally.get(name) ?? 0) + (alias ? tally.get(alias) ?? 0 : 0);

  // A sigil the corpus WRITES and declares `structure` must be findable cold, or the graph is missing
  // a boundary it was told to hold.
  if (cold === "structure" && uses > 0 && !isScanned) blind.push([name, uses]);
  // And one declared `verbatim` must NOT be scanned, or the doctrine and the scanner disagree about
  // which register the carrier is in — the render would resolve what the meme meant to quote.
  if (cold === "verbatim" && isScanned) contradicted.push([name, uses]);
}

const verbatimUses = [...tally].filter(([n]) => ["confidence", "hud", "syad", "lares", "oracle", "ward"].includes(n))
  .reduce((a, [, c]) => a + c, 0);
console.log(`[sigil-parity] the chat register stands ${verbatimUses} times in the corpus, verbatim by declaration`);

if (undeclared.length) {
  console.log("  a sigil states no `lar-cold` — nothing says what a cold parse should do with it:");
  for (const [n, v] of undeclared) console.log(`    ${n}${v ? ` (reads "${v}")` : ""}`);
}
if (blind.length) {
  console.log("  declared `structure`, written by the corpus, and no cold parse finds it:");
  for (const [n, u] of blind) console.log(`    ${n}  ${u} uses`);
}
if (contradicted.length) {
  console.log("  declared `verbatim` and scanned anyway — the render would resolve what the meme quotes:");
  for (const [n, u] of contradicted) console.log(`    ${n}  ${u} uses`);
}

if (undeclared.length + blind.length + contradicted.length === 0) {
  console.log("  every sigil declares its cold reading, and the scanner agrees with every declaration");
  process.exit(0);
}
process.exit(1);
