/**
 * `lares repack --source <bundle-file> --to <bagUri> [--out <file>]` — the
 * collect-the-residency EXPORT.
 *
 * A multi-tiddler bundle (a `.json` array of tiddlers) rides as a PACK — one file,
 * many tiddlers — whose membership rides ASIDE in the bag's `$:/config/OriginalTiddlerPaths`
 * (never on the tiddlers). REPACK asks the island to collect the pack's members
 * from that aside map and re-render the bundle via TW5's OWN serializer, then
 * writes the bytes back to disk — the deliberate round-trip a foreign bundle takes
 * before the operator opens an upstream TW5 PR (the `.mem` path auto-recomposes;
 * a foreign pack re-renders only on this verb).
 *
 * Meme: lar:///ha.ka.ba/lararium/api/pack-model
 */

import { writeFileSync } from "node:fs";
import { extname } from "node:path";
import { larRoot, operatorDid } from "../env.js";
import { runVerb } from "../verb-call.js";
import { summaryOutput } from "../verb-result.js";
import { emit, exitFor } from "../render.js";
import { fileToUriForSource } from "../ingest-core.js";
import type { ParsedArgs } from "../parse-args.js";

function printUsage(): void {
  console.log("usage: lares repack --source <bundle-file> --from <bagUri> [--in-wiki] [--out <file>]");
  console.log("  re-renders a multi-tiddler bundle (.json / .multids) from its recorded pack members —");
  console.log("  the collect-the-residency export for an upstream TW5 PR. Reads members FROM the bag,");
  console.log("  writes the bundle to --out (default --source). Flags align the family:");
  console.log("  --source = the disk bundle file (ingest/watch), --from = the source bag (act), --in-wiki = context.");
}

export async function cmdRepack(args: ParsedArgs): Promise<number> {
  const source  = args.options["source"];
  const fromBag = args.options["from"];
  if (!source || !fromBag) { printUsage(); return 2; }
  const out = args.options["out"] ?? source;

  const root = larRoot();
  // Derive the pack path (mirror-relative, WITH extension) exactly as the island
  // recorded it in the aside provenance: the loci URI's path + the file's extension.
  const uri = fileToUriForSource(root, source)(root, source);
  if (!uri || !uri.startsWith("lar:///")) {
    emit(args, { ok: false, error: { code: "usage", message: `no loci derivation for "${source}" (outside bags//wikis/, or rootless)` }, human: () => console.error(`lares repack: no loci derivation for "${source}"`) });
    return exitFor("usage");
  }
  const packPath = uri.slice("lar:///".length) + extname(source);

  let did: string;
  try { did = await operatorDid(); } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "not-found", message: msg }, human: () => console.error(`lares repack: ${msg}`) });
    return exitFor("not-found");
  }

  // --in-wiki: run REPACK IN the active wiki island, so the members render
  // through THAT wiki's composite layer stack — the SAME bundle of titles renders
  // distinctly per wiki (shadowing edits above the canon), on purpose. The default
  // path resolves daemon-side (canon bags, no working-layer shadow).
  const inWiki     = Boolean(args.flags["in-wiki"]);
  const repackArgs = { bag: fromBag, "pack-path": packPath };
  const submitName = inWiki ? "wiki-act" : "REPACK";
  const submitArgs = inWiki ? { verb: "REPACK", args: repackArgs } : repackArgs;

  let result;
  try {
    result = await runVerb(submitName, submitArgs, did);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "daemon-unreachable", message: msg, hint: "Start the daemon with `lares serve` and try again." }, human: () => { console.error(`lares repack: ${msg}`); console.error("  Start the daemon with `lares serve` and try again."); } });
    return exitFor("daemon-unreachable");
  }
  if (result.status === "error") {
    const msg = result.errorMessage ?? "unknown";
    const code = /^cap-denied/.test(msg) ? "cap-denied" : "verb-error";
    emit(args, { ok: false, requestId: result.requestId, error: { code, message: msg }, human: () => console.error(`REPACK failed: ${msg}`) });
    return exitFor(code);
  }

  const summary = summaryOutput(result) ?? {};
  const text    = typeof summary["text"] === "string" ? (summary["text"] as string) : "";
  const count   = summary["count"] ?? 0;
  const missing = summary["missing"];
  writeFileSync(out, text, "utf-8");
  emit(args, {
    ok: true, requestId: result.requestId,
    data: { verb: "REPACK", pack: packPath, out, count, ...(missing ? { missing } : {}) },
    human: () => {
      console.log(`REPACK ✓ ${count} member(s) → ${out}`);
      if (Array.isArray(missing) && missing.length > 0) console.error(`  ⚠ ${missing.length} member(s) missing (tombstoned): ${(missing as string[]).join(", ")}`);
    },
  });
  return 0;
}
