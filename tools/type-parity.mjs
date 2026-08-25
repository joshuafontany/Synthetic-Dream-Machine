// type-parity — every place that names the carrier's media type agrees with the one declaration.
//
// FOUR MECHANISMS DISPATCH ON THIS STRING, each a different one: the TW5 parser module exports under
// it, the deserializer module exports under it, `registerFileType` binds `.mem` to it, and a stored
// `type` field is compared against it. A fifth reads it back off disk from a carrier's own meta block.
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
// The authority builds its declaration from the type constant, so this witness builds the same
// string the same way rather than string-matching a template it cannot evaluate.
const declSpec = /DECLARATION[\s\S]{0,120}?(lar:\/\/\/[^\s`"]+)/.exec(decl)?.[1];
// MIRRORED FROM THE AUTHORITY, character for character — `DECLARATION` strips `text/`, so this does
// too. An earlier generation stripped `text/x-`, the provisional prefix RFC 6838 deprecates; against a
// canonical name that no longer carries it that reconstruction kept the prefix, and the one legitimate
// inline copy read as a fork of a line it matches exactly.
const declaration = declSpec ? `<<!DOCTYPE ${canonical.replace("text/", "")} ${declSpec} >>` : null;
if (!canonical) {
  console.error("[type-parity] carrier-type.ts names no CARRIER_TYPE — the declaration moved");
  process.exit(1);
}

// THE DOCTYPE LINE GETS THE SAME GUARD, AND FOR THE SAME REASON A CARRIER TAUGHT US.
//
// Two writers once spelled that line by hand while the authority held another, and they drifted the
// moment the grammar took its `+tiddlywiki` suffix — three library indexes opened by naming the
// grammar's ADDRESS and never its name, parsed, and rendered back to something else. One module still
// spells it inline out of necessity: `meme-normalize` gets bundled into the TW5 plugin, so an import
// from the mesh package would drag that package's automerge wasm into a bundle that cannot hold it.
// A necessary copy is fine; an UNWATCHED one is how the last three carriers broke.

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
  if (!t.includes(`as "${canonical}"`)) faults.push([f, `registers no module under "${canonical}"`]);
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
    if (line.includes(`"${canonical}"`)) inline.push([`${f}:${i + 1}`, line.trim().slice(0, 90)]);
  }
}

// AND THE CORPUS. A carrier declares its own type in its own meta block. Reported, never failed:
// rewriting a carrier's type re-addresses it wherever a store addresses carriers by their bytes, so a
// census belongs in a reading rather than in a gate.
const carriers = execSync("git ls-files 'bags/**/*.mem'", { encoding: "utf8", cwd: REPO })
  .split("\n").filter(Boolean);
let declared = 0, neither = 0;
for (const f of carriers) {
  const t = readFileSync(join(REPO, f), "utf8");
  if (t.includes(`= "${canonical}"`)) declared++;
  else neither++;
}

// Every literal DOCTYPE in a source must match the authority character for character.
const declFaults = [];
if (declaration) {
  for (const f of SOURCES) {
    if (f === DECL) continue;
    const t = readFileSync(join(REPO, f), "utf8");
    for (const m of t.matchAll(/<<!DOCTYPE[^"`\n]*/g)) {
      const lit = m[0].trim().replace(/\s*>>$/, " >>");
      // A CONCRETE declaration names the grammar and its address; anything else is a source
      // DESCRIBING the form rather than writing one — a grammar sketch in a comment, or a template
      // that builds the line from the constants it already reads. Neither can drift.
      if (lit.includes("${") || !lit.includes("lar:///")) continue;
      if (!declaration.includes(lit.replace(/ >>$/, ""))) declFaults.push([f, lit.slice(0, 90)]);
    }
  }
}

console.log(`[type-parity] one spelling: "${canonical}"`);
if (declFaults.length > 0) {
  console.log(`  a source spells a DOCTYPE that differs from the one authority:`);
  for (const [where, lit] of declFaults) console.log(`    ${where}\n      ${lit}`);
}
console.log(`  corpus: ${declared} declaring it · ${neither} declaring none`);

if (inline.length > 0) {
  console.log(`  a source spells the type inline instead of reading the declaration:`);
  for (const [where, line] of inline) console.log(`    ${where}\n      ${line}`);
}
for (const [f, why] of faults) console.log(`  ${f} ${why}`);

if (inline.length + faults.length + declFaults.length === 0) {
  console.log("  one declaration, and every dispatch key registers it");
  process.exit(0);
}
console.log("  Read `carrier-type.ts`; a literal here is the fork, not the mismatch it becomes later.");
process.exit(1);
