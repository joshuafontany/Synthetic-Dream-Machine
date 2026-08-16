// type-parity — every place that names the carrier's media type agrees with the one declaration.
//
// FOUR MECHANISMS DISPATCH ON THIS STRING, each a different one: the TW5 parser module exports under
// it, the deserializer module exports under it, `registerFileType` binds `.mem` to it, and a stored
// `type` field is compared against it. A fifth reads it back off disk from a carrier's own iam.
//
// They agree only by hand, and the failure is silent in the worst way: a record whose type no reader
// admits simply stops projecting. No throw, no diagnostic, no file — the carrier is just absent from
// the next disk pass, and the diff reads as though nobody edited it.
//
// So `carrier-type.ts` holds the declaration and this witness checks that nothing spells it inline.
// A LITERAL IS THE FAULT, not a mismatch — by the time two literals disagree the damage has landed.
import { readFileSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

const REPO = process.env["REPO"] ?? process.cwd();
const DECL = "packages/lararium-mesh/src/carrier-type.ts";

const decl = readFileSync(join(REPO, DECL), "utf8");
const canonical = /CARRIER_TYPE = "([^"]+)"/.exec(decl)?.[1];
const legacy = /CARRIER_TYPE_UNSUFFIXED = "([^"]+)"/.exec(decl)?.[1];
if (!canonical || !legacy) {
  console.error("[type-parity] carrier-type.ts declares neither name — the declaration moved");
  process.exit(1);
}

// THE EXPORT KEYS ARE THE ONE PLACE A LITERAL MUST STAND. TypeScript's `export { X as "literal" }`
// takes no expression, so the dispatch keys spell both names by necessity — and both must be there,
// because a carrier stored under either name needs a module registered for it.
const KEYED = [
  "packages/lararium-tw5/src/memetic-parser.ts",
  "packages/lararium-tw5/src/deserializer.ts",
];

const faults = [];
for (const f of KEYED) {
  const t = readFileSync(join(REPO, f), "utf8");
  for (const name of [canonical, legacy]) {
    if (!t.includes(`as "${name}"`)) faults.push([f, `registers no module under "${name}"`]);
  }
}

// EVERY OTHER SITE READS THE DECLARATION. A source file spelling the type inline has forked it.
const SOURCES = execSync("git ls-files 'packages/*/src/*.ts' 'packages/*/src/**/*.ts' 'tools/*.mjs' 'scripts/*.ts'", {
  encoding: "utf8", cwd: REPO,
}).split("\n").filter(Boolean).filter((f) => f !== DECL && !KEYED.includes(f) && !f.includes(".generated."));

const inline = [];
for (const f of SOURCES) {
  const t = readFileSync(join(REPO, f), "utf8");
  for (const [i, line] of t.split("\n").entries()) {
    if (line.trimStart().startsWith("*") || line.trimStart().startsWith("//")) continue;  // prose
    if (line.includes(`"${canonical}"`) || line.includes(`"${legacy}"`)) inline.push([`${f}:${i + 1}`, line.trim().slice(0, 90)]);
  }
}

// AND THE CORPUS. A carrier declares its own type in its iam; both spellings read, and which one a
// carrier carries says when it was written — reported, never failed, because rewriting a carrier's
// type re-addresses it wherever a store addresses carriers by their bytes.
const carriers = execSync("git ls-files 'bags/**/*.mem'", { encoding: "utf8", cwd: REPO })
  .split("\n").filter(Boolean);
let suffixed = 0, unsuffixed = 0, neither = 0;
for (const f of carriers) {
  const t = readFileSync(join(REPO, f), "utf8");
  if (t.includes(`= "${canonical}"`)) suffixed++;
  else if (t.includes(`= "${legacy}"`)) unsuffixed++;
  else neither++;
}

console.log(`[type-parity] canonical "${canonical}" · also read "${legacy}"`);
console.log(`  corpus: ${suffixed} suffixed · ${unsuffixed} on the earlier name · ${neither} declaring neither`);

if (inline.length > 0) {
  console.log(`  a source spells the type inline instead of reading the declaration:`);
  for (const [where, line] of inline) console.log(`    ${where}\n      ${line}`);
}
for (const [f, why] of faults) console.log(`  ${f} ${why}`);

if (inline.length + faults.length === 0) {
  console.log("  one declaration, and every dispatch key registers both names");
  process.exit(0);
}
console.log("  Read `carrier-type.ts`; a literal here is the fork, not the mismatch it becomes later.");
process.exit(1);
