/**
 * `lares normalize <file.md ...> [--check]`
 *
 * The normalize gesture — canonicalize a meme carrier's framing so the
 * round-trip lens laws hold (meme-corpus-roundtrip: single-closer · content-
 * whole · idempotent). The doctrine: corpus files are "non-canonical at rest
 * until a deliberate normalization commit" (wiki-layer-ontology). Author freely;
 * run this before committing a new carrier — the gate stays strict, the
 * authoring stays graceful.
 *
 * Currently homes a carrier's iam-declared `namespace` into its SOH opener as
 * literal glyphs (the class a hand-authored carrier most often trips). The
 * transform is pure + idempotent (`@lararium/tw5/meme-normalize`).
 *
 *   --check   report carriers that WOULD change; write nothing. Exit 1 if any
 *             drift — for CI / pre-commit gates.
 *
 * Meme: lar:///ha.ka.ba/@lares/docs/lares/handoff
 */

import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { normalizeMemeSource } from "@lararium/tw5/meme-normalize";
import type { ParsedArgs } from "../parse-args.js";

export async function cmdNormalize(args: ParsedArgs): Promise<number> {
  // parse-args reads `--check` as a boolean only when the next token is another
  // option or the end; `--check <file>` instead binds the file as its value. Read
  // check from both, and recover any file it ate, so flag position is free.
  const check = "check" in args.flags || "check" in args.options;
  const files = [...args.positional];
  if (typeof args.options["check"] === "string") files.push(args.options["check"]);

  if (files.length === 0) {
    console.error("usage: lares normalize <file.md ...> [--check]");
    console.error("  canonicalize a meme carrier's framing (embeds the iam-declared namespace into the SOH).");
    console.error("  --check   report carriers that would change; write nothing (exit 1 if any) — for CI/pre-commit.");
    return 2;
  }

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
