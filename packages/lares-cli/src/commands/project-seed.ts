/**
 * `lares carrier project-seed [--check]`
 *
 * The boot seed stands in two files and one dialect apart:
 *
 *   bags/lares/ha.ka.ba/lares/api/noosphere-boot.mem   the corpus carrier
 *   noosphere-boot.md                                   what the harness loads
 *
 * Neither file holds the source. The source sits with the operator; the carrier is the first thing
 * it becomes, and the markdown renders FROM the carrier for a harness that reads no wikitext. So the
 * projection runs carrier → markdown, and a divergence names the markdown as the drifted one.
 *
 * Their bodies say one thing in two markups, so no byte comparison can hold them together and every
 * hand that edits one must remember the other. A forgotten twin drifts SILENTLY: both files parse,
 * both round-trip, both read correct, and the house holds two boot seeds that disagree — the drift
 * no other instrument here can see, because each of them compares a file to its own reflection.
 *
 * Default renders the twin. `--check` reports drift and writes nothing, exit 1 if any.
 *
 * Meme: lar:///ha.ka.ba/lares/docs/handoff
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { transposeSeed } from "@lararium/tw5/meme-markdown";
import type { ParsedArgs } from "../parse-args.js";

const MEM = "bags/lares/ha.ka.ba/lares/api/noosphere-boot.mem";
const MD  = "noosphere-boot.md";
/**
 * Both bodies open at the SOH — everything above it belongs to the file's own frame.
 *
 * Read as a pattern rather than matched as a literal: a near-miss here fails as "no SOH opener",
 * which sends the reader hunting for a sigil that is plainly present.
 */
const SOH_RE = /<<\^ code="&#x0001;" namespace="ॐ ँ"/;

function body(text: string, path: string): string {
  const m = SOH_RE.exec(text);
  if (!m) {
    console.error(`project-seed: no SOH opener in ${path}`);
    process.exit(1);
  }
  return text.slice(m.index);
}

export async function cmdProjectSeed(args: ParsedArgs): Promise<number> {
  const check = "check" in args.flags || "check" in args.options;
  const repo  = process.env["REPO"] ?? process.cwd();
  const mem   = join(repo, MEM);
  const md    = join(repo, MD);

  // A THIRD SEED IS THE DRIFT A PAIR CHECK CANNOT SEE. Comparing a named pair proves the pair agrees
  // and says nothing about a copy standing somewhere else — and a copy is what a projection tree
  // grows, because rendering and copying look identical the day they run and diverge every day
  // after. So the pair reading runs beside a census: any other file whose name claims this seed is a
  // seed the pair never checked, and a claim nothing checks is the shape this reading exists to end.
  const strays = execSync_ls(repo).filter((f) => join(repo, f) !== mem && join(repo, f) !== md);
  if (strays.length > 0) {
    console.log(`project-seed: ${strays.length} file(s) claim the boot seed outside the checked pair`);
    for (const f of strays) console.log(`  ${f}`);
    console.log("  The pair is the seed. A third copy drifts with nothing watching it — render it or cut it.");
    return 1;
  }

  // THE DECLARATION SITS ABOVE THE SOH, so a body comparison never reaches it, and the markdown seed
  // can hold a retired declaration through every green run. The first line of each seed is the one
  // line that selects the grammar; it gets read first, and on its own terms.
  const memText = readFileSync(mem, "utf8");
  const mdText  = readFileSync(md, "utf8");
  const memFirst = memText.split("\n")[0] ?? "";
  const mdFirst  = mdText.split("\n")[0] ?? "";
  if (memFirst !== mdFirst) {
    console.log("project-seed: the seeds open on different declarations");
    console.log(`  carrier -> ${memFirst}`);
    console.log(`  md      -> ${mdFirst}`);
    return 1;
  }

  const expected = transposeSeed(body(memText, mem));
  const actual   = body(mdText, md);

  if (!check) {
    // The head above the SOH belongs to the markdown file's own frame and carries through untouched.
    writeFileSync(md, mdText.slice(0, SOH_RE.exec(mdText)!.index) + expected);
    console.log(`project-seed: rendered the markdown seed from the carrier — ${expected.split("\n").length} lines`);
    return 0;
  }

  const exp = expected.split("\n"), act = actual.split("\n");
  const drift: Array<[number, string | undefined, string | undefined]> = [];
  for (let i = 0; i < Math.max(exp.length, act.length); i++) {
    if (exp[i] !== act[i]) drift.push([i + 1, exp[i], act[i]]);
  }
  if (drift.length === 0) {
    console.log(`project-seed: the markdown seed reads the carrier, transposed — ${act.length} lines`);
    return 0;
  }
  console.log(`project-seed: ${drift.length} line(s) where the markdown left the carrier`);
  for (const [n, e, a] of drift.slice(0, 20)) {
    console.log(`  line ${n}`);
    console.log(`    carrier -> ${(e ?? "<absent>").slice(0, 150)}`);
    console.log(`    md      -> ${(a ?? "<absent>").slice(0, 150)}`);
  }
  if (drift.length > 20) console.log(`  … and ${drift.length - 20} more`);
  console.log("  `lares carrier project-seed` renders it — the markdown is a projection, never a source.");
  return 1;
}

/** Every tracked file whose name claims the boot seed. */
function execSync_ls(repo: string): string[] {
  return execFileSync("git", ["ls-files", "*noosphere-boot*"], { encoding: "utf8", cwd: repo })
    .split("\n").filter(Boolean);
}
