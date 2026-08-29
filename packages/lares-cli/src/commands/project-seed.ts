/**
 * `lares carrier project-seed [<carrier.mem> <out.md>] [--check]`
 *
 * With no pair named, the boot seed. Any OTHER seed names its own pair — one implementation, because
 * a second seed rendered by a second code path is two seeds nothing holds together.
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

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, basename } from "node:path";
import { transposeSeed, seedFrontmatter, seedMeta, seedIdentity, stripTomlMeta } from "@lararium/tw5/meme-markdown";
import type { ParsedArgs } from "../parse-args.js";

const MEM = "bags/lares/ha.ka.ba/lares/api/noosphere-boot.mem";
const MD  = "noosphere-boot.md";
/**
 * Both bodies open at the SOH — everything above it belongs to the file's own frame.
 *
 * Read as a pattern rather than matched as a literal: a near-miss here fails as "no SOH opener",
 * which sends the reader hunting for a sigil that is plainly present.
 */
const SOH_RE = /<<\^ code="&#x0001;"/;

/**
 * The projected head: frontmatter, then the declaration, then everything down to the SOH.
 *
 * THE DECLARATION STAYS INSIDE THE PROJECTION rather than carrying through from the old markdown. A
 * head copied forward is a head nothing re-derives, and the one line that selects the grammar is the
 * line least able to afford that.
 */
function head(memText: string): string {
  const { uri, check } = seedIdentity(memText);
  if (!uri) { console.error("project-seed: the carrier declares no address"); process.exit(1); }
  void check;
  const declaration = memText.slice(0, SOH_RE.exec(memText)!.index);
  return seedFrontmatter(memText) + declaration;
}

/** Everything a projection derives — so a comparison never reads a hand-carried head as agreement. */
function projected(memText: string, path: string): string {
  return head(memText) + stripTomlMeta(transposeSeed(body(memText, path)));
}

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
  const [argMem, argMd] = args.positional;
  if ((argMem && !argMd) || (!argMem && argMd)) {
    console.error("usage: lares carrier project-seed [<carrier.mem> <out.md>] [--check]");
    return 1;
  }
  const mem   = join(repo, argMem ?? MEM);
  const md    = join(repo, argMd ?? MD);
  // The census globs the pair's OWN name, so a named seed counts its own copies and never the boot
  // seed's. A shared glob would report every seed as a stray of every other.
  const stem  = basename(mem).replace(/\.mem$/, "");

  // A THIRD SEED IS THE DRIFT A PAIR CHECK CANNOT SEE. Comparing a named pair proves the pair agrees
  // and says nothing about a copy standing somewhere else — and a copy is what a projection tree
  // grows, because rendering and copying look identical the day they run and diverge every day
  // after. So the pair reading runs beside a census: any other file whose name claims this seed is a
  // seed the pair never checked, and a claim nothing checks is the shape this reading exists to end.
  const strays = execSync_ls(repo, stem).filter((f) => join(repo, f) !== mem && join(repo, f) !== md);
  if (strays.length > 0) {
    console.log(`project-seed: ${strays.length} file(s) claim ${stem} outside the checked pair`);
    for (const f of strays) console.log(`  ${f}`);
    console.log("  The pair is the seed. A third copy drifts with nothing watching it — render it or cut it.");
    return 1;
  }

  // THE DECLARATION SITS ABOVE THE SOH, so a body comparison never reaches it, and the markdown seed
  // can hold a retired declaration through every green run. The first line of each seed is the one
  // line that selects the grammar; it gets read first, and on its own terms.
  const memText = readFileSync(mem, "utf8");
  // A FIRST RENDER HAS NO TWIN TO READ. The comparison below wants one and the render does not, so an
  // absent markdown reads as an empty one: every line drifts, which is exactly true of a file that
  // does not exist yet, and `--check` reports it rather than dying on the open.
  const mdText  = existsSync(md) ? readFileSync(md, "utf8") : "";
  const memFirst = memText.split("\n")[0] ?? "";
  // The markdown opens on its frontmatter, so its declaration reads as the first line BELOW that head.
  const mdFirst  = (mdText.startsWith("---\n")
    ? mdText.slice(mdText.indexOf("\n---\n") + 5)
    : mdText).split("\n").find((l) => l.trim() !== "") ?? "";
  if (mdText !== "" && memFirst !== mdFirst) {
    console.log("project-seed: the seeds open on different declarations");
    console.log(`  carrier -> ${memFirst}`);
    console.log(`  md      -> ${mdFirst}`);
    return 1;
  }

  const expected = projected(memText, mem);
  const actual   = mdText;

  if (!check) {
    writeFileSync(md, expected);
    writeFileSync(`${md}.meta`, seedMeta(memText));
    console.log(`project-seed: rendered the markdown seed from the carrier — ${expected.split("\n").length} lines (+.meta)`);
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
function execSync_ls(repo: string, stem: string): string[] {
  // The glob reads a SUBSTRING where the census means a STEM: `*ai-phrasebook*` also answers with
  // `ai-phrasebook-design.mem`, a different carrier that claims nothing. So the glob casts wide and
  // the stem comparison decides — a file claims this seed when its name BEFORE the first dot is
  // this seed's name, at whatever path it stands.
  return execFileSync("git", ["ls-files", `*${stem}*`], { encoding: "utf8", cwd: repo })
    .split("\n").filter(Boolean)
    .filter((f) => (basename(f).split(".")[0] ?? "") === stem);
}
