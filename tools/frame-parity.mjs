// frame-parity — the control marks the SPEC declares against the marks the CODE recognises.
//
// `api/pono/memetic-wikitext` states the carrier frame: which control characters stand, what slots
// each carries, which stay reserved. The parser, the deserializer and the stream framer recognise
// their own set, written by hand, one regex at a time.
//
// NOTHING HERE COMPARED THE TWO. `rite-commands` checks an instructed command against a real door;
// `surface-parity` checks an MCP tool against a CLI door; `seed-parity` checks a seed against its
// twin. Every one of those pairs an instruction with an implementation — except the grammar, which
// is the one place a declaration can run ahead of the code that must hold it and nothing says so.
//
// A spec that names a mark no reader recognises is not a bug in either half. It is a bug in the SEAM,
// and a seam is exactly what no single-artifact witness can see.
//
// The reading runs one way on purpose: a mark the SPEC stands and no TIDDLER declares is a promise the
// tree cannot keep, and it fails. A tiddler declaring a mark the spec never wrote down only means the
// readers hold more than the spec says — reported, never refused.
import { readFileSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

const REPO = process.env["REPO"] ?? process.cwd();
const SPEC = join(REPO, "bags/@lares/ha.ka.ba/lares/api/pono/memetic-wikitext.mem");

/** Rows of the control-set table: `|`&#x000N;` |MARK |slots |carries |`. */
const ROW = /^\|`(&#x[0-9A-Fa-f]{4};)`\s*\|([A-Za-z₂]+)\s*\|([^|]*)\|/gm;
/** The reserved list names its marks inline, each in backticks beside a bolded name. */
const RESERVED = /^\*\s+`(&#x[0-9A-Fa-f]{4};)`\s+''([A-Z/ ]+)''/gm;

const spec = readFileSync(SPEC, "utf8");

const slotsOf = (cell) => [...(cell ?? "").matchAll(/`([a-z-]+)`/g)].map((m) => m[1]).join(" ");
const standing = [...spec.matchAll(ROW)].map(([, code, mark, cell]) => ({ code, mark, slots: slotsOf(cell) }));
const reserved = [...spec.matchAll(RESERVED)].map(([, code, mark]) => ({ code, mark }));

if (standing.length === 0) {
  console.error("[frame-parity] the spec's control-set table parsed to nothing — the table shape moved");
  process.exit(1);
}

// What the tree actually recognises. The frame marks DECLARE THEMSELVES in `tiddlers/sigil-frame-*.tid`,
// each carrying `lar-code` and the `lar-pattern` that matches it — the same self-declaring shape the
// plugin build already uses for modules, where a `.ts` becomes a tiddler by carrying a tiddler header.
//
// READING THE TIDDLERS RATHER THAN THE SOURCE IS THE POINT. Grepping TypeScript for control codes finds
// every incidental `0004` in unrelated arithmetic and misses a mark declared in wikitext, so it answers
// a question adjacent to the one asked. A frame mark the corpus can carry is a mark some tiddler
// declares; anything else is a coincidence in a number.
const tiddlers = execSync(
  "git ls-files 'packages/lararium-tw5/tiddlers/sigil-frame-*.tid'",
  { encoding: "utf8", cwd: REPO },
).split("\n").filter(Boolean);

const seen = new Set();
const tiddlerSlots = new Map();
const tiddlerPatterns = new Map();
for (const f of tiddlers) {
  const t = readFileSync(join(REPO, f), "utf8");
  const code = /^lar-code:\s*(&#x[0-9A-Fa-f]{4};)\s*$/m.exec(t);
  const pattern = /^lar-pattern:\s*(\S.*)$/m.exec(t);
  if (code && pattern) {
    seen.add(code[1]);
    tiddlerSlots.set(code[1], (/^lar-slots:(.*)$/m.exec(t)?.[1] ?? "").trim());
    tiddlerPatterns.set(code[1], pattern[1].trim());
  } else if (code) console.log(`  ${f} declares ${code[1]} and carries no lar-pattern`);
}

// A DECLARED PATTERN THAT MATCHES NOTHING IS A DECLARATION, NOT A RECOGNISER. Presence of the field
// proved the tiddler carried one and never that the one it carried still finds a carrier — so a frame
// migration could move every head in the corpus and leave seven patterns declaring the shape that left.
//
// The corpus decides. Each pattern must find the mark it names in a real carrier, and must MISS the
// speaking head, because a frame pattern that also matches `<<~` erases the split the heads make.
const corpus = execSync("git ls-files 'bags/**/*.mem'", { encoding: "utf8", cwd: REPO })
  .split("\n").filter(Boolean).slice(0, 400)
  .map((f) => readFileSync(join(REPO, f), "utf8")).join("\n");

// A MARK THE CORPUS NEVER WRITES AND A PATTERN THAT CANNOT FIND ONE READ AS DIFFERENT FACTS, and
// collapsing them would make this check useless exactly where it earns its keep. The literal code
// decides which question applies: present in the corpus, the pattern MUST find it; absent, the mark
// stands on paper alone — reported, never failed, because a grammar may legitimately stand a mark
// before anything writes one.
//
// The speaking head is the second question. `<<^` opens the control set and `<<~` the speaking set, so
// a frame pattern must go blind when the head flips. One that still fires never depended on the head.
const inert = [];
const onPaper = [];
const overreaching = [];
const speaking = corpus.replace(/<<\^/g, "<<~");
for (const [code, src] of tiddlerPatterns) {
  let re;
  try { re = new RegExp(src); } catch { inert.push([code, `unparseable: ${src}`]); continue; }
  if (!corpus.includes(`code:"${code}"`)) { onPaper.push(code); continue; }
  if (!re.test(corpus)) inert.push([code, `a carrier writes ${code} and this pattern misses it: ${src}`]);
  if (re.test(speaking)) overreaching.push([code, src]);
}

// AND THE BOOTSTRAP SCANNER, which reads before any tiddler loads. `BOOTSTRAP_SCANS` carries its own
// control table so a cold parse can find a frame at all — a second recogniser, hand-written, that no
// tiddler governs. Comparing spec to tiddlers alone reads TAUTOLOGICAL while one hand writes both;
// the scanner is the independent side, and drift between the two is the seam this witness exists for.
const SCANNER = join(REPO, "packages/lararium-tw5/src/meme-ast/scanner.ts");
const scannerCodes = new Set(
  [...readFileSync(SCANNER, "utf8").matchAll(/&#x00[0-9A-Fa-f]{2};/g)].map((m) => m[0]),
);
const scannerOnly = [...scannerCodes].filter(
  (c) => !standing.some((s) => s.code === c) && !reserved.some((r) => r.code === c),
);
const specOnly = standing.filter((s) => !scannerCodes.has(s.code));

// AND `FRAME_MARKS`, the shared table every reader and the writer now agree on. The CODES collapsed
// there because they are one fact; the PATTERNS stayed local because each context earned its own scan
// against a bug its comment records. So this seam checks the fact that drifts, and leaves alone the
// three that must differ.
//
// A MARK THE TABLE NEVER DECLARES IS A MARK NOTHING HOLDS — no reader scans for it, and the emitter
// cannot write it, so a carrier that gained one would lose it on the first write-back with nothing on
// the read path able to notice what went missing.
const TABLE = join(REPO, "packages/lararium-tw5/src/frame-marks.ts");
const tableCodes = new Set(
  [...readFileSync(TABLE, "utf8").matchAll(/code:\s*"(&#x00[0-9A-Fa-f]{2};)"/g)].map((m) => m[1]),
);
const untabled = standing.filter((s) => !tableCodes.has(s.code));
const tableOnly = [...tableCodes].filter((c) => !standing.some((s) => s.code === c));

// AND EVERY READER, checked against the table rather than rewritten onto it.
//
// Four readers spell their own control codes inside scans their contexts earned — the stream framer
// refusing to cross a line, the bootstrap taking the wider read, the deserializer anchoring on the
// code itself. Rewriting those to build from a shared constant would collapse three scars into one
// regex and reopen the bugs their comments record.
//
// So the table stays authoritative BY VERIFICATION rather than by construction: every code any reader
// scans for must stand in `FRAME_MARKS`, and every mark the table declares must be scanned somewhere.
// Six spellings of one fact do not always want one spelling — sometimes they want an instrument that
// notices when they disagree.
const READERS = [
  "packages/lararium-tw5/src/meme-ast/scanner.ts",
  "packages/lararium-tw5/src/meme-stream.ts",
  "packages/lararium-tw5/src/deserializer.ts",
  "packages/lararium-tw5/src/block-check.ts",
];
const readerCodes = new Map();
for (const f of READERS) {
  for (const m of readFileSync(join(REPO, f), "utf8").matchAll(/&#x00[0-9A-Fa-f]{2};/g)) {
    if (!readerCodes.has(m[0])) readerCodes.set(m[0], []);
    const at = readerCodes.get(m[0]);
    if (!at.includes(f)) at.push(f);
  }
}
const strayInReader = [...readerCodes.keys()].filter((c) => !tableCodes.has(c));
const unscanned = [...tableCodes].filter((c) => !readerCodes.has(c));

// AND THE SLOTS, three-spelled and read by nobody — the spec's table cell, the tiddler's `lar-slots`,
// and `FRAME_MARKS`. A fact no code consumes drifts fastest, because nothing fails when it goes wrong;
// the migration that gave every mark a `code:` param left all three under-declaring by exactly one and
// every test stayed green. Three spellings of one fact want an instrument, not a fourth spelling.
const tableSlots = new Map(
  [...readFileSync(TABLE, "utf8").matchAll(/code: "(&#x00[0-9A-Fa-f]{2};)",[^}]*?slots: \[([^\]]*)\]/g)]
    .map((m) => [m[1], [...m[2].matchAll(/"([a-z-]+)"/g)].map((x) => x[1]).join(" ")]),
);
const slotDrift = standing.filter(
  (s) => tiddlerSlots.get(s.code) !== s.slots || tableSlots.get(s.code) !== s.slots,
);

const unrecognised = standing.filter((s) => !seen.has(s.code));
const undeclared = [...seen].filter(
  (c) => !standing.some((s) => s.code === c) && !reserved.some((r) => r.code === c),
);

console.log(
  `[frame-parity] spec declares ${standing.length} standing + ${reserved.length} reserved; ` +
  `tiddlers recognise ${seen.size}`,
);

if (scannerOnly.length > 0) {
  console.log(`  the bootstrap scanner reads marks the spec never wrote down: ${scannerOnly.sort().join(" ")}`);
}
if (specOnly.length > 0) {
  console.log(`  the spec stands marks the bootstrap scanner cannot find:`);
  for (const { code, mark } of specOnly) console.log(`    ${code}  ${mark}`);
}
if (strayInReader.length > 0) {
  console.log(`  a reader scans for marks FRAME_MARKS never declares:`);
  for (const c of strayInReader.sort()) console.log(`    ${c}  ${readerCodes.get(c).join(" ")}`);
}
if (unscanned.length > 0) {
  console.log(`  FRAME_MARKS declares marks no reader scans for: ${unscanned.sort().join(" ")}`);
}
if (untabled.length > 0) {
  console.log(`  the spec stands marks FRAME_MARKS never declares, so no reader or writer holds them:`);
  for (const { code, mark } of untabled) console.log(`    ${code}  ${mark}`);
}
if (tableOnly.length > 0) {
  console.log(`  FRAME_MARKS declares marks the spec never wrote down: ${tableOnly.sort().join(" ")}`);
}
if (inert.length > 0) {
  console.log(`  a tiddler declares a pattern that finds nothing in the corpus:`);
  for (const [c, why] of inert) console.log(`    ${c}  ${why}`);
}
if (overreaching.length > 0) {
  console.log(`  a frame pattern fires without the control head — the head split does not hold:`);
  for (const [c, src] of overreaching) console.log(`    ${c}  ${src}`);
}
if (onPaper.length > 0) {
  console.log(`  declared and never written — these marks stand on paper alone: ${onPaper.sort().join(" ")}`);
}
if (slotDrift.length > 0) {
  console.log(`  the slot declaration disagrees across spec · tiddler · FRAME_MARKS:`);
  for (const s of slotDrift) {
    console.log(`    ${s.code}  spec[${s.slots}] tiddler[${tiddlerSlots.get(s.code) ?? "—"}] table[${tableSlots.get(s.code) ?? "—"}]`);
  }
}
if (undeclared.length > 0) {
  console.log(`  recognised but undeclared (tolerated): ${undeclared.sort().join(" ")}`);
}

// A WITNESS THAT PRINTS WITHOUT FAILING IS THE ABSENCE-OF-FINDING SHAPE IN ITS OWN CLOTHES: every
// seam below either fails the run or it is decoration, so all of them count.
const broken =
  unrecognised.length + strayInReader.length + unscanned.length + untabled.length + specOnly.length +
  inert.length + overreaching.length + slotDrift.length;

if (broken === 0) {
  console.log("  every mark the spec stands, a tiddler declares, patterns against a real carrier, and slots alike");
  process.exit(0);
}
console.log(`  DECLARED BY THE SPEC, DECLARED BY NO TIDDLER — a promise the tree cannot keep:`);
for (const { code, mark } of unrecognised) console.log(`    ${code}  ${mark}`);
process.exit(1);
