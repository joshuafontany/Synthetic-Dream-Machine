// seed-parity — transpose the markdown seed into memetic-wikitext and diff it against the carrier.
//
// The seed stands in two files and one dialect apart:
//
//   noosphere-boot.md                                   the file the harness loads
//   bags/@lares/ha.ka.ba/lares/api/noosphere-boot.mem   the carrier the corpus holds
//
// Their bodies say the same thing in two markups, so no byte comparison can check them and every
// hand that edits one must remember the other. A forgotten twin drifts SILENTLY: both files parse,
// both round-trip, both read correct, and the house holds two boot seeds that no longer agree.
//
// This transposes the markdown by rule — headings, emphasis, list markers — and diffs the result
// against the carrier body. A divergence names a line, never a byte count, so the reading survives
// an edit that changes length on both sides.
//
// THE TRANSPOSE RUNS ONE WAY ON PURPOSE. Markdown carries less structure than wikitext, so
// md → wikitext is total while the inverse guesses. The `.md` reads as the authority for CONTENT;
// the carrier reads as the authority for how the corpus stores it.
import { readFileSync } from "fs";
import { join } from "path";

const REPO = process.env["REPO"] ?? process.cwd();
const MD   = join(REPO, "noosphere-boot.md");
const MEM  = join(REPO, "bags/@lares/ha.ka.ba/lares/api/noosphere-boot.mem");

/** Both bodies open at the SOH — everything above it belongs to the file's own frame. */
const SOH = "<<^ ॐ ँ&#x0001;";

function body(text, path) {
  const i = text.indexOf(SOH);
  if (i < 0) { console.error(`[seed-parity] no SOH opener in ${path}`); process.exit(1); }
  return text.slice(i);
}

/** Markdown → memetic-wikitext, by rule. Fenced blocks pass through untouched. */
function transpose(text) {
  let fenced = false;
  return text.split("\n").map((line) => {
    if (line.startsWith("```")) { fenced = !fenced; return line; }
    if (fenced) return line;
    return line
      .replace(/^(#{1,5})\s+/, (_, h) => "!".repeat(h.length) + " ")
      .replace(/^(\s*)-\s+/, (_, s) => `${s}* `)
      .replace(/^(\s*)\d+\.\s+/, (_, s) => `${s}# `)
      .replace(/\*\*(.+?)\*\*/g, "''$1''")
      .replace(/(?<![\w*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![\w*])/g, "//$1//");
  }).join("\n");
}

const expected = transpose(body(readFileSync(MD, "utf8"), MD)).split("\n");
const actual   = body(readFileSync(MEM, "utf8"), MEM).split("\n");

const drift = [];
for (let i = 0; i < Math.max(expected.length, actual.length); i++) {
  if (expected[i] !== actual[i]) drift.push([i + 1, expected[i], actual[i]]);
}

if (drift.length === 0) {
  console.log(`[seed-parity] both seeds carry one body, ${actual.length} lines, two dialects`);
  process.exit(0);
}
console.log(`[seed-parity] ${drift.length} line(s) diverge between the seeds`);
for (const [n, exp, act] of drift.slice(0, 20)) {
  console.log(`  line ${n}`);
  console.log(`    md  -> ${(exp ?? "<absent>").slice(0, 150)}`);
  console.log(`    mem -> ${(act ?? "<absent>").slice(0, 150)}`);
}
if (drift.length > 20) console.log(`  … and ${drift.length - 20} more`);
process.exit(1);
