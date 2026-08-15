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
const ROW = /^\|`(&#x[0-9A-Fa-f]{4};)`\s*\|([A-Za-z₂]+)\s*\|/gm;
/** The reserved list names its marks inline, each in backticks beside a bolded name. */
const RESERVED = /^\*\s+`(&#x[0-9A-Fa-f]{4};)`\s+''([A-Z/ ]+)''/gm;

const spec = readFileSync(SPEC, "utf8");

const standing = [...spec.matchAll(ROW)].map(([, code, mark]) => ({ code, mark }));
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
for (const f of tiddlers) {
  const t = readFileSync(join(REPO, f), "utf8");
  const code = /^lar-code:\s*(&#x[0-9A-Fa-f]{4};)\s*$/m.exec(t);
  const pattern = /^lar-pattern:\s*\S/m.test(t);
  if (code && pattern) seen.add(code[1]);
  else if (code) console.log(`  ${f} declares ${code[1]} and carries no lar-pattern`);
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

// AND THE EMITTER, which closes the cycle. `expandMemeRefs` in `deserializer.ts` recomposes a carrier
// from records back to bytes, and it writes every frame mark as a STRING LITERAL — four recognisers
// read the frame, one hand-written emitter writes it, and none of the five consults the others.
//
// A MARK THE EMITTER CANNOT WRITE IS A MARK PROJECTION SILENTLY DROPS. A carrier could gain an
// attestation block, parse correctly, and lose it the first time a wiki wrote it back to disk — the
// read side would never complain, because nothing it reads went missing.
const EMITTER = join(REPO, "packages/lararium-tw5/src/deserializer.ts");
const emitterSrc = readFileSync(EMITTER, "utf8");
const emitterBody = emitterSrc.slice(emitterSrc.indexOf("export function expandMemeRefs"));
const emitted = new Set([...emitterBody.matchAll(/&#x00[0-9A-Fa-f]{2};/g)].map((m) => m[0]));
const unemitted = standing.filter((s) => !emitted.has(s.code));

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
if (unemitted.length > 0) {
  console.log(`  the emitter cannot write, so projection would drop:`);
  for (const { code, mark } of unemitted) console.log(`    ${code}  ${mark}`);
}
if (undeclared.length > 0) {
  console.log(`  recognised but undeclared (tolerated): ${undeclared.sort().join(" ")}`);
}

if (unrecognised.length === 0) {
  console.log("  every mark the spec stands, a tiddler declares and patterns");
  process.exit(0);
}
console.log(`  DECLARED BY THE SPEC, DECLARED BY NO TIDDLER — a promise the tree cannot keep:`);
for (const { code, mark } of unrecognised) console.log(`    ${code}  ${mark}`);
process.exit(1);
