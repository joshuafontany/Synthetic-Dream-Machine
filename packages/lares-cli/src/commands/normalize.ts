/**
 * `lares carrier normalize <file.mem ...> [--check]`
 *
 * The normalize gesture — canonicalize a meme carrier's framing so the
 * round-trip lens laws hold (meme-corpus-roundtrip: single-closer · content-
 * whole · idempotent). The doctrine: corpus files are "non-canonical at rest
 * until a deliberate normalization commit" (wiki-layer-ontology). Author freely;
 * run this before committing a new carrier — the gate stays strict, the
 * authoring stays graceful.
 *
 * Two classes ride it. A carrier's meta-declared `namespace` homes into its SOH opener as literal
 * glyphs — the class a hand-authored carrier most often trips. A declaration naming the grammar's
 * address and not its name takes the current one, from the authority beside the type constant. The
 * transform is pure + idempotent (`@lararium/tw5/meme-normalize`).
 *
 *   --check     report carriers that WOULD change; write nothing. Exit 1 if any
 *               drift — for CI / pre-commit gates.
 *   --gradient  read how far down the ingest gradient each file sits, and write nothing.
 *   --edges     read the addresses these carriers point AT, and which of them answer.
 *
 * ── WHY `--edges` LOOKS OUTWARD ─────────────────────────────────────────────────────────────────
 * `--gradient` asks whether a carrier is whole. Nothing asked whether the graph it points into exists,
 * because a `lar:` URI names and does not fetch: a carrier whose target moved keeps rendering, keeps
 * round-tripping, and passes every gate this tree stands.
 *
 * Run it BEFORE a move and again after. Equal counts prove the weld held; a rise names what broke.
 *
 * ── WHY `--gradient` IS A SEPARATE READING ──────────────────────────────────────────────────────
 * `--check` asks whether a carrier is CANONICAL. It cannot ask whether a carrier is WHOLE, because
 * graceful parsing means a file missing its address, its declaration, or its whole body frame still
 * parses, still renders, and still round-trips — it just does so as something smaller than a meme.
 *
 * That mercy hides files. A carrier without `uri-path` is skipped by every corpus gate at
 * `if (!uri) continue`, so a sweep reports 601 of 618 while calling itself corpus-wide, and the
 * seventeen it never opened stay invisible for as long as nobody counts.
 *
 * So this reading names the KIND a file declares itself to be, and the marks that kind requires and
 * lacks. It fails on a fault, never on a kind: a bag descriptor carrying no body frame stands exactly
 * where it should.
 *
 * Meme: lar:///ha.ka.ba/lares/docs/handoff
 */

import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { normalizeMemeSource } from "@lararium/tw5/meme-normalize";
import { readCarrierShape, readCarrierEdges } from "@lararium/tw5";
import type { ParsedArgs } from "../parse-args.js";

export async function cmdNormalize(args: ParsedArgs): Promise<number> {
  // parse-args reads `--check` as a boolean only when the next token is another
  // option or the end; `--check <file>` instead binds the file as its value. Read
  // check from both, and recover any file it ate, so flag position is free.
  const check = "check" in args.flags || "check" in args.options;
  const gradient = "gradient" in args.flags || "gradient" in args.options;
  const edges = "edges" in args.flags || "edges" in args.options;
  const files = [...args.positional];
  if (typeof args.options["check"] === "string") files.push(args.options["check"]);
  if (typeof args.options["gradient"] === "string") files.push(args.options["gradient"]);
  if (typeof args.options["edges"] === "string") files.push(args.options["edges"]);

  if (files.length === 0) {
    console.error("usage: lares carrier normalize <file.mem ...> [--check]");
    console.error("  canonicalize a meme carrier's framing (embeds the meta-declared namespace into the SOH).");
    console.error("  --check     report carriers that would change; write nothing (exit 1 if any) — for CI/pre-commit.");
    console.error("  --gradient  name each file's kind and the marks that kind requires and lacks; write nothing.");
    console.error("  --edges     name the addresses these carriers point at, and which of them answer.");
    return 2;
  }

  if (gradient) return surveyGradient(files);
  if (edges) return surveyEdges(files);

  let drifted = 0;
  let flagged = 0;
  for (const f of files) {
    const abs = isAbsolute(f) ? f : join(process.cwd(), f);
    let src: string;
    try {
      src = readFileSync(abs, "utf8");
    } catch {
      console.error(`normalize: cannot read ${f}`);
      return 2;
    }

    const res = normalizeMemeSource(src);

    // Flags surface whether or not the carrier rewrote — advisory triage the
    // gate will NOT auto-fix (e.g. a register value off the band ladder).
    if (res.flags.length > 0) {
      flagged++;
      console.log(`flagged: ${f}`);
      for (const fl of res.flags) console.log(`  ⚠ ${fl}`);
    }

    if (!res.changed) continue;
    drifted++;

    if (check) {
      console.log(`would normalize: ${f}`);
    } else {
      writeFileSync(abs, res.text);
      console.log(`normalized: ${f}`);
    }
    for (const n of res.notes) console.log(`  - ${n}`);
  }

  const tail = flagged > 0 ? ` (${flagged} flagged for triage)` : "";
  if (drifted === 0) {
    console.log(`all ${files.length} carrier(s) canonical.${tail}`);
    return 0;
  }
  console.log(`${drifted} of ${files.length} carrier(s) drifted.${tail}`);
  // --check fails loud so a CI gate or pre-commit hook catches un-normalized carriers.
  // Flags are advisory (needs-triage), never a gate failure.
  return check ? 1 : 0;
}

/**
 * The gradient reading: one line per file, the kind it declares and what that kind still owes.
 *
 * Prints a per-kind tally even when nothing faults, because a run that read nothing must never look
 * like a run that found nothing — the failure this whole reading exists to catch.
 */
function surveyGradient(files: string[]): number {
  const byKind = new Map<string, number>();
  let faulted = 0;

  // THE SIDECAR PAIR IS A CARRIER IN TWO FILES. A content file with a `.meta` beside it declares
  // itself in the sidecar, so its own bytes carry no frame and never should — reading it as unframed
  // would fault the one shape the projector mints for a non-memetic filetype. This is the one kind a
  // reader cannot name from bytes alone, so it is settled here, where the file list is known.
  const declared = new Set(files.filter((f) => f.endsWith(".meta")).map((f) => f.slice(0, -".meta".length)));

  for (const f of files) {
    if (declared.has(f) || f.endsWith(".meta")) {
      byKind.set("sidecar", (byKind.get("sidecar") ?? 0) + 1);
      continue;
    }
    const abs = isAbsolute(f) ? f : join(process.cwd(), f);
    let src: string;
    try {
      src = readFileSync(abs, "utf8");
    } catch {
      console.error(`normalize: cannot read ${f}`);
      return 2;
    }
    const shape = readCarrierShape(src);
    byKind.set(shape.kind, (byKind.get(shape.kind) ?? 0) + 1);
    if (shape.faults.length === 0) continue;
    faulted++;
    console.log(`${shape.kind}: ${f}`);
    for (const fault of shape.faults) console.log(`  ⚠ ${fault}`);
  }

  const tally = [...byKind].sort().map(([k, n]) => `${k} ${n}`).join(" · ");
  if (files.length === 0) {
    console.error("gradient: read 0 files — nothing was measured");
    return 2;
  }
  console.log(`gradient: ${files.length} read — ${tally}`);
  if (faulted === 0) {
    console.log("every file stands at its kind's floor.");
    return 0;
  }
  console.log(`${faulted} file(s) below their kind's floor.`);
  return 1;
}

/**
 * The graph reading: which addresses these carriers name, and which of those any of them holds.
 *
 * The corpus passed IS the universe — an edge answers only if one of the files read declares that
 * address. So a partial file list reads as a broken graph, and the summary always states how many
 * carriers were read so a narrow run cannot be mistaken for a corpus-wide one.
 */
function surveyEdges(files: string[]): number {
  const held = new Set<string>();
  const texts = new Map<string, string>();
  for (const f of files) {
    const abs = isAbsolute(f) ? f : join(process.cwd(), f);
    let src: string;
    try {
      src = readFileSync(abs, "utf8");
    } catch {
      console.error(`normalize: cannot read ${f}`);
      return 2;
    }
    texts.set(f, src);
    const uri = /^uri-path\s*=\s*"([^"]+)"/m.exec(readCarrierShape(src).marks.meta ? src : "")?.[1];
    if (uri) held.add(uri);
  }

  const dangling = new Map<string, { form: string; from: string[] }>();
  let total = 0, unaddressed = 0;
  for (const [f, src] of texts) {
    for (const e of readCarrierEdges(src)) {
      total++;
      // AN EDGE WITH NO ADDRESS NAMES A FILE, not a carrier. It cannot dangle, because it never
      // pointed at an address to begin with — it is counted apart so a sweep can find the class
      // without a resolver guessing which carrier a file became.
      if (e.address === null) { unaddressed++; continue; }
      if (held.has(e.address)) continue;
      const seen = dangling.get(e.address) ?? { form: e.form, from: [] };
      seen.from.push(f);
      dangling.set(e.address, seen);
    }
  }

  const ranked = [...dangling].sort((a, b) => b[1].from.length - a[1].from.length);
  for (const [address, { form, from }] of ranked) {
    console.log(`${from.length}× ${form}  lar:///${address}`);
    for (const f of from.slice(0, 3)) console.log(`     from ${f}`);
    if (from.length > 3) console.log(`     … and ${from.length - 3} more`);
  }
  const n = [...dangling.values()].reduce((a, d) => a + d.from.length, 0);
  const tail = unaddressed > 0 ? ` · ${unaddressed} naming a FILE rather than an address` : "";
  console.log(`edges: ${files.length} carrier(s) read · ${held.size} address(es) held · ${total} edge(s) · ${n} naming nothing${tail}`);
  return n === 0 ? 0 : 1;
}
