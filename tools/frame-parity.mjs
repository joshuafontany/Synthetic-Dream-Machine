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
// The reading runs one way on purpose: a DECLARED-BUT-UNRECOGNISED mark is a promise the tree cannot
// keep, and it fails. A RECOGNISED-BUT-UNDECLARED mark only means the code reads more than the spec
// wrote down, which is tolerable and reported rather than refused.
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

// What the readers actually scan for. Source only: `dist/` is a build of this same source and would
// agree with it by construction, which is the failure mode this witness exists to refuse.
const sources = execSync(
  "git ls-files 'packages/*/src/**/*.ts' 'packages/*/src/*.ts'",
  { encoding: "utf8", cwd: REPO },
).split("\n").filter(Boolean);

const seen = new Set();
for (const f of sources) {
  const t = readFileSync(join(REPO, f), "utf8");
  for (const m of t.matchAll(/&#x00[0-9A-Fa-f]{2};|\b00[0-9A-Fa-f]{2}\b/g)) {
    const raw = m[0];
    const hex = raw.startsWith("&") ? raw.slice(3, 7) : raw;
    seen.add(`&#x${hex};`);
  }
}

const unrecognised = standing.filter((s) => !seen.has(s.code));
const undeclared = [...seen].filter(
  (c) => !standing.some((s) => s.code === c) && !reserved.some((r) => r.code === c),
);

console.log(
  `[frame-parity] spec declares ${standing.length} standing + ${reserved.length} reserved; ` +
  `source recognises ${seen.size}`,
);

if (undeclared.length > 0) {
  console.log(`  recognised but undeclared (tolerated): ${undeclared.sort().join(" ")}`);
}

if (unrecognised.length === 0) {
  console.log("  every mark the spec stands, some reader scans for");
  process.exit(0);
}
console.log(`  DECLARED, RECOGNISED BY NOTHING — a promise the tree cannot keep:`);
for (const { code, mark } of unrecognised) console.log(`    ${code}  ${mark}`);
process.exit(1);
