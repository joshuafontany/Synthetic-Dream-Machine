// frame-shape — every carrier's frame marks stand on the CONTROL head, and the frame closes.
//
// `round-trip` catches a malformed frame, but it reports the damage as a LINE DIFF against a render —
// a reader meets seven lines of unified diff and has to infer that a mark rode the wrong opener. It is
// the right instrument for "this carrier does not survive a projection" and the wrong one for "this
// carrier's frame is malformed", which is a different fault with a different repair.
//
// THE SPLIT THE HEADS MAKE. `<<^` opens the control set; `<<~` opens the speaking set. A frame mark on
// the speaking head names a MALFORMED carrier, never an older one — the sets divide by capability, and
// merging them would re-fuse the domains the split exists to hold apart.
//
// Reported per carrier, per mark, so a repair reads off the finding instead of out of a diff.
import { readFileSync } from "fs";
import { maskedExecAll } from "../packages/lararium-tw5/dist/deserializer.js";
import { execSync } from "child_process";
import { join } from "path";

const REPO = process.env["REPO"] ?? process.cwd();
const MARKS = [
  ["&#x0001;", "SOH", true],
  ["&#x0011;", "SOH2", false],
  ["&#x0002;", "STX", false],
  ["&#x0003;", "ETX", false],
  ["&#x0017;", "ETB", false],
  ["&#x0004;", "EOT", false],
  ["&#x0014;", "EOT2", false],
];

const files = execSync("git ls-files 'bags/**/*.mem'", { encoding: "utf8", cwd: REPO })
  .split("\n").filter(Boolean);

const faults = [];
for (const f of files) {
  const t = readFileSync(join(REPO, f), "utf8");
  for (const [code, name] of MARKS) {
    // A mark riding the SPEAKING head. Fenced examples legitimately quote frames, so only a mark
    // standing at the start of its own line counts — a quotation sits inside prose or a fence.
    const wrong = new RegExp(`^<<~[^>\\n]*${code}`, "m");
    if (wrong.test(t)) faults.push([f, `${name} rides <<~ — the frame takes <<^`]);
  }
  // THE BEARING ARROW IS STRUCTURE, so a frame that lost it is malformed rather than terse.
  //
  // `? -> uri` at the heading and `-> ?` at the close carry ONE relation read from two ends — source
  // unresolved and target known, then source known and target unresolved. A named parameter would state
  // a PROPERTY; the arrow states a RELATION, and the control-soh scan captures its target as a group.
  // Drop it and the capture returns nothing while every other check here still reads the frame as sound.
  const masked = (re) => [...maskedExecAll(t, re)];
  const soh = masked(/^<<\^[^>\n]*&#x(?:0001|0011);[^\n]*$/gm).length > 0;
  if (soh && masked(/^<<\^[^>\n]*&#x(?:0001|0011);[^>\n]*?\?\s*->\s*\S+\s*>>/gm).length === 0) {
    faults.push([f, "SOH carries no `? -> uri` — the heading states no bearing"]);
  }
  // THE CLOSE NAMES ITS SLOT. The frame's ends took `from=` and `to=`, so an EOT reads `-> to=?` —
  // and a check wanting a bare `?` after the arrow matches nothing, then reports the whole corpus.
  const eot = masked(/^<<\^[^>\n]*&#x(?:0004|0014);[^\n]*$/gm).length > 0;
  if (eot && masked(/^<<\^[^>\n]*&#x(?:0004|0014);[^>\n]*?->\s*(?:to=)?\?\s*>>/gm).length === 0) {
    faults.push([f, "EOT carries no `-> to=?` — the close resolves a bearing it cannot know"]);
  }

  // AN OPENED BODY CLOSES — and a carrier that never opens one carries no fault. The frame acts as a
  // FIELD OF THE TEXT BODY (operator ruling), so a bag manifest or a library index whose whole content
  // IS its meta block stands with a heading and nothing to bracket. Demanding ETX there would report ten
  // correct carriers as broken, which is how a witness teaches a reader to ignore it.
  // THE CLOSES COME IN ORDER. Three carriers stood `EOT · ETX · EOT` — an end-of-transmission before
  // the text had ended — and every other check here passed them.
  //
  // THE MASK DECIDES WHAT COUNTS. A frame mark inside a code fence or a backtick span belongs to a
  // lesson: memes that TEACH the frame carry whole example carriers, and a documentation table shows the
  // marks in a row. Reading raw text took those for frames — and an earlier version of this rule carried
  // a shape-specific guard invented to route around exactly that. One mask retires the guard.
  const owned = [...maskedExecAll(t, /^<<\^[^>\n]*&#x(?:0003|0004|0014);[^\n]*$/gm)];
  const lastEtx = owned.filter((m) => m[0].includes("&#x0003;")).pop();
  const firstEot = owned.find((m) => !m[0].includes("&#x0003;"));
  if (lastEtx && firstEot && firstEot.index < lastEtx.index) {
    faults.push([f, "an EOT stands before the text ends — the closes run out of order"]);
  }

  if (masked(/^<<\^[^>\n]*&#x0002;[^\n]*$/gm).length > 0) {
    if (masked(/^<<\^[^>\n]*&#x0003;[^\n]*$/gm).length === 0) faults.push([f, "opens a body on STX and never closes it on ETX"]);
    if (masked(/^<<\^[^>\n]*&#x(?:0004|0014);[^\n]*$/gm).length === 0) faults.push([f, "closes on ETX and never ends on EOT"]);
  }
}

console.log(`[frame-shape] ${files.length} carriers, ${faults.length} malformed frame(s)`);
if (faults.length === 0) {
  console.log("  every frame mark stands on the control head, and every opened carrier closes");
  process.exit(0);
}
for (const [f, why] of faults) console.log(`  ${f}\n     ${why}`);
process.exit(1);
