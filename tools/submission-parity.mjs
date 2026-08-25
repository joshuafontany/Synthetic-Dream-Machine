// submission-parity — every pair on the submissions shelf re-projects from its source, byte-identical.
//
// A projected pair proves its currency by RE-PROJECTION, never by a stamp: the meta carries no clock,
// so the only way a pair reads current is that projecting its source again produces the same bytes.
// This witness runs that proof over the whole shelf, plus the two failures re-projection alone
// cannot see:
//
//   - a pair whose SOURCE moved (the meta's source-check no longer matches the carrier's standing
//     check) — the markdown may still agree line-for-line while the carrier gained a section the
//     transposer dropped; the check comparison catches the move itself;
//   - a pair whose source is GONE — a submission claiming an address nothing answers.
//
// A hand edit to a pair dies here by design; the meta's own `law:` line says so on its face.
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { projectSubmission } from "../packages/lararium-tw5/dist/meme-markdown.js";

const REPO = process.env["REPO"] ?? process.cwd();
const SHELF = join(REPO, "bags/lares/ha.ka.ba/lares/api/pono/submissions");
const TITLE_BASE = "lar:///ha.ka.ba/lares/api/pono/submissions";

const pairs = readdirSync(SHELF).filter((f) => f.endsWith(".md"));
if (pairs.length === 0) { console.error("[submission-parity] the shelf stands empty — nothing to prove"); process.exit(1); }

let failed = 0;
for (const md of pairs) {
  const name = md.replace(/\.md$/, "");
  const meta = readFileSync(join(SHELF, `${md}.meta`), "utf8");
  const source = /^source: (\S+)$/m.exec(meta)?.[1];
  const claimedCheck = /^source-check: (\S+)$/m.exec(meta)?.[1];
  if (!source) { console.log(`  ${name}: the meta names no source`); failed += 1; continue; }
  const srcPath = join(REPO, "bags/lares", source.replace(/^lar:\/\/\//, "") + ".mem");
  if (!existsSync(srcPath)) { console.log(`  ${name}: source GONE — ${source}`); failed += 1; continue; }
  const p = projectSubmission(readFileSync(srcPath, "utf8"), { title: `${TITLE_BASE}/${name}` });
  const mdNow = readFileSync(join(SHELF, md), "utf8");
  if (p.check !== claimedCheck) { console.log(`  ${name}: source MOVED — carrier check ${p.check} ≠ meta ${claimedCheck}; re-project`); failed += 1; continue; }
  if (p.markdown !== mdNow)     { console.log(`  ${name}: markdown DRIFTED from its re-projection; re-project (hand edits do not survive)`); failed += 1; continue; }
  if (p.meta !== meta)          { console.log(`  ${name}: meta DRIFTED from its re-projection`); failed += 1; continue; }
}
console.log(`[submission-parity] ${pairs.length} pair(s) on the shelf · ${failed} out of step`);
process.exit(failed === 0 ? 0 : 1);
