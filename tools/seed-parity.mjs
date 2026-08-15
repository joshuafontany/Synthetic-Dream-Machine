// seed-parity — transpose the carrier seed into markdown and diff it against the markdown seed.
//
// The seed stands in two files and one dialect apart:
//
//   bags/@lares/ha.ka.ba/lares/api/noosphere-boot.mem   FIRST projection — the corpus carrier
//   noosphere-boot.md                                   SECOND projection — what the harness loads
//
// Neither file holds the source. The source sits with the operator; the carrier is the first thing
// it becomes, and the markdown renders from there for a harness that reads no wikitext. So the
// transpose runs CARRIER -> MARKDOWN, and a divergence names the markdown as the one that drifted.
//
// Their bodies say one thing in two markups, so no byte comparison can check them and every hand
// that edits one must remember the other. A forgotten twin drifts SILENTLY: both files parse, both
// round-trip, both read correct, and the house holds two boot seeds that no longer agree — the one
// drift no other instrument here can see, because each of them compares a file to its own reflection.
//
// ONE DIRECTION CARRIES MORE THAN THE OTHER. Wikitext marks an ordered list with a bare `#`, which
// markdown spends on headings; markdown numbers each item, which wikitext leaves implicit. So this
// transposer counts list position and re-numbers, and reads `!` depth for headings — both total.
// Going the other way would have to guess where a `#` meant heading and where it meant item.
import { readFileSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

const REPO = process.env["REPO"] ?? process.cwd();
const MEM  = join(REPO, "bags/@lares/ha.ka.ba/lares/api/noosphere-boot.mem");
const MD   = join(REPO, "noosphere-boot.md");

/** Both bodies open at the SOH — everything above it belongs to the file's own frame. */
const SOH = `<<^ code:"&#x0001;" namespace:"ॐ ँ"`;

function body(text, path) {
  const i = text.indexOf(SOH);
  if (i < 0) { console.error(`[seed-parity] no SOH opener in ${path}`); process.exit(1); }
  return text.slice(i);
}

/** Memetic-wikitext → markdown, by rule. Fenced blocks pass through untouched. */
function transpose(text) {
  let fenced = false;
  let ordinal = 0;
  return text.split("\n").map((line) => {
    if (line.startsWith("```")) { fenced = !fenced; return line; }
    if (fenced) return line;
    const ordered = /^(\s*)#\s+(.*)$/.exec(line);
    if (ordered) {
      ordinal += 1;
      return `${ordered[1]}${ordinal}. ${inline(ordered[2] ?? "")}`;
    }
    ordinal = 0;                                     // any other line closes the run
    return inline(
      line
        .replace(/^(!{1,5})\s+/, (_, h) => "#".repeat(h.length) + " ")
        .replace(/^(\s*)\*\s+/, (_, s) => `${s}- `),
    );
  }).join("\n");
}

/**
 * Emphasis, both marks, applied inside a line whichever block form carried it.
 *
 * CODE SPANS STAY SEALED. A `lar:` URI inside backticks carries a slash pair that reads as an italic
 * open and an italic close, so an emphasis pass walking the whole line eats the middle of the scheme
 * and reports the twin as drifted. Split on the backtick, transform the odd segments, and every span
 * the author fenced survives verbatim.
 */
function inline(s) {
  // MASK, TRANSFORM, RESTORE — never split. An emphasis span may WRAP a code span
  // (`''Tag format: `X`''`), so cutting the line at each backtick orphans the closing mark and the
  // whole span survives untransformed. Masking leaves the line whole for the emphasis pass while the
  // fenced text stays out of its reach.
  const spans = [];
  const masked = s.replace(/`[^`]*`/g, (m) => {
    spans.push(m);
    return `${spans.length - 1}`;
  });
  const emphasised = masked.replace(/''(.+?)''/g, "**$1**").replace(/\/\/(.+?)\/\//g, "*$1*");
  return emphasised.replace(/(\d+)/g, (_, i) => spans[Number(i)] ?? "");
}

// A THIRD SEED IS THE DRIFT THIS WITNESS COULD NOT SEE. Comparing a named pair proves the pair agrees
// and says nothing about a copy standing somewhere else — and a copy is what a projection tree grows,
// because rendering and copying look identical the day they run and diverge every day after. So the
// pair check runs beside a census: any other file in the tree whose name claims this seed reads as a
// seed the pair never checked, and a claim nothing checks is exactly the shape the pair check exists
// to end.
const strays = execSync("git ls-files '*noosphere-boot*'", { encoding: "utf8", cwd: REPO })
  .split("\n").filter(Boolean)
  .filter((f) => join(REPO, f) !== MEM && join(REPO, f) !== MD);

if (strays.length > 0) {
  console.log(`[seed-parity] ${strays.length} file(s) claim the boot seed outside the checked pair`);
  for (const f of strays) console.log(`  ${f}`);
  console.log("  The pair is the seed. A third copy drifts with nothing watching it — render it or cut it.");
  process.exit(1);
}

const expected = transpose(body(readFileSync(MEM, "utf8"), MEM)).split("\n");
const actual   = body(readFileSync(MD, "utf8"), MD).split("\n");

const drift = [];
for (let i = 0; i < Math.max(expected.length, actual.length); i++) {
  if (expected[i] !== actual[i]) drift.push([i + 1, expected[i], actual[i]]);
}

if (drift.length === 0) {
  console.log(`[seed-parity] the markdown seed reads the carrier, transposed — ${actual.length} lines`);
  process.exit(0);
}
console.log(`[seed-parity] ${drift.length} line(s) where the markdown left the carrier`);
for (const [n, exp, act] of drift.slice(0, 20)) {
  console.log(`  line ${n}`);
  console.log(`    carrier -> ${(exp ?? "<absent>").slice(0, 150)}`);
  console.log(`    md      -> ${(act ?? "<absent>").slice(0, 150)}`);
}
if (drift.length > 20) console.log(`  … and ${drift.length - 20} more`);
process.exit(1);
