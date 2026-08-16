// doctype — every carrier opens by naming the grammar that reads it.
//
// The spec states it as a MUST and 84 carriers did not do it, which is the ordinary fate of a law with
// no instrument: true where someone remembered, false where nobody did, and nothing anywhere counting.
//
// ── WHY THE DECLARATION IS THE ONE LINE THAT MUST BE RIGHT ──────────────────────────────────────
// It is the FIRST line of every carrier — the line a stranger meets before knowing any of this, and the
// line that selects which grammar reads everything below it. A carrier without one asks its reader to
// guess; a carrier pointing at the wrong address names a grammar that does not read it, which is worse,
// because the guess would at least have been informed by the extension.
//
// One address, exactly: this grammar's spec. A DOCTYPE aimed anywhere else is not a variant, it is a
// declaration that does not hold.
import { readFileSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

const REPO = process.env["REPO"] ?? process.cwd();
const SPEC_URI = "lar:///ha.ka.ba/lares/api/pono/memetic-wikitext";
const ROOT = "memetic-wikitext+tiddlywiki";
const DECLARATION = `<<!DOCTYPE ${ROOT} ${SPEC_URI} >>`;

// THE RETIRED FORM READ AS A COMMENT, which is exactly why it survived so long: a declaration hidden
// inside `<!-- -->` renders as nothing, parses as nothing, and reads to a human as though it were there.
const RETIRED = /^<!--\s*<<~\s*!DOCTYPE/;

const carriers = execSync("git ls-files 'bags/**/*.mem' 'wikis/**/*.mem'", {
  encoding: "utf8", cwd: REPO,
}).split("\n").filter(Boolean);

const missing = [], retired = [], misaimed = [];
for (const f of carriers) {
  const first = (readFileSync(join(REPO, f), "utf8").split("\n")[0] ?? "").trim();
  if (RETIRED.test(first)) { retired.push(f); continue; }
  if (!first.startsWith("<<!DOCTYPE")) { missing.push(f); continue; }
  if (first !== DECLARATION) misaimed.push([f, first.slice(0, 100)]);
}

console.log(`[doctype] ${carriers.length} carriers · ${missing.length} without · ${retired.length} in the retired comment form · ${misaimed.length} aimed elsewhere`);
for (const f of missing.slice(0, 10)) console.log(`  no declaration   ${f}`);
if (missing.length > 10) console.log(`  … and ${missing.length - 10} more`);
for (const f of retired) console.log(`  hidden in a comment   ${f}`);
for (const [f, line] of misaimed) console.log(`  ${f}\n    ${line}`);

if (missing.length + retired.length + misaimed.length === 0) {
  console.log("  every carrier opens by naming the grammar that reads it, at the one address that does");
  process.exit(0);
}
console.log(`  The declaration reads exactly:  ${DECLARATION}`);
process.exit(1);
