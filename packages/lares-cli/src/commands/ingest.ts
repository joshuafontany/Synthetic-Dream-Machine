/**
 * lares ingest — the disk→records gesture.
 *
 *   lares ingest --source <dir|file> --to <bagUri> [--apply] [--yes]
 *
 * The gesture holds the disk grant and the Synced tree (the island holds
 * neither — readiness reads local on both sides of the shore):
 *   scan      walk source for .md carriers; derive each uri by the loci law
 *   diff      disk-hash vs synced-hash per carrier (the cheap two legs)
 *   preview   (default) print NEW / UNCHANGED / CHANGED; submit nothing
 *   --apply   send NEW+CHANGED carriers with their hashes riding an INGEST
 *             verb; the island runs the full Confluence gate (its currentRenderHash
 *             = the third leg) and answers per-carrier decisions
 *
 * Meme: lar:///ha.ka.ba/lares/docs/lares/handoff
 */

import { createInterface } from "readline/promises";
import { stdin, stdout } from "process";
import type { ParsedArgs } from "../parse-args.js";
import { emit, wantsJson, exitFor } from "../render.js";
import { summaryOutput } from "../verb-result.js";
import { OUTCOME_URI_PREFIX } from "@lararium/mesh";
import { larRoot, vesselDid } from "../env.js";
import { openSyncedTree, scanSource, candidatesOf, submitIngest, recordLandedPacks, applyConfirmedRenames } from "../ingest-core.js";
import { carrierNeedsTag, tagBlobs } from "../tag-blobs.js";

function printUsage(): void {
  console.log("usage: lares ingest --source <dir|file> --to <bagUri> [--apply] [--tag-blobs] [--in-wiki] [--yes]");
  console.log("  default    = preview (scan + two-leg diff, no submission);");
  console.log("  --tag-blobs writes the CAS opt-in flag (`.meta` sidecar / meme ahu iam) for the");
  console.log("             large un-flagged carriers that would fault at regenesis; writes no records;");
  console.log("  --apply    sends NEW+CHANGED carriers through the island's INGEST gate;");
  console.log("  --in-wiki  runs the INGEST in the active wiki island (the path for the working");
  console.log("             write-layer ingest-back — a wikis/ source derives its URIs off that layer).");
}

export async function cmdIngest(args: ParsedArgs): Promise<number> {
  const source = args.options["source"];
  const toBag  = args.options["to"];
  if (!source || !toBag) { printUsage(); return 2; }

  const root = larRoot();
  const tree = openSyncedTree();

  // scan — observations only, never a work queue
  const scan = scanSource(root, source, toBag, tree);
  if (scan === null) {
    emit(args, { ok: false, error: { code: "usage", message: `source "${source}" does not resolve` }, human: () => console.error(`lares ingest: source "${source}" does not resolve`) });
    return exitFor("usage");
  }
  const { rows, skipped } = scan;
  const candidates = candidatesOf(rows);
  // R2 — a full scan discovers a moved carrier's gone source; it rides the wave as a
  // rename-deletion so the island re-links records (change-id preserved) and the
  // observation survives the move (see applyConfirmedRenames, post-submit).
  const renameDeletions = scan.renameDeletions ?? [];

  // Carriers that would hit the ungated-large-inline wall at regenesis, still
  // un-flagged — the readiness law reads off text the scan already holds.
  const wouldFault = rows.filter((r) => carrierNeedsTag(r));

  // ── --tag-blobs (write the CAS opt-in flag; submit nothing) ─────────────
  if (args.flags["tag-blobs"]) {
    const outcomes = tagBlobs(rows);
    const wrote = outcomes.filter((o) => o.wrote);
    emit(args, {
      ok: true,
      data: { toBag, scanned: rows.length, tagged: wrote.length, outcomes },
      human: () => {
        for (const o of outcomes) console.log(`  ${(o.wrote ? "TAGGED" : "REPORT").padEnd(8)} ${o.file}  (${o.kind}: ${o.detail})`);
        console.log(`\n  ${wrote.length} of ${outcomes.length} flag-ready carrier(s) tagged · the rest reported, canon untouched`);
      },
    });
    return 0;
  }

  // ── preview (the default posture) ──────────────────────────────────────
  if (!args.flags["apply"]) {
    emit(args, {
      ok: true,
      data: {
        toBag,
        scanned: rows.length,
        new: rows.filter((r) => r.status === "new").length,
        changed: rows.filter((r) => r.status === "changed").length,
        unchanged: rows.filter((r) => r.status === "unchanged").length,
        nonNfc: rows.filter((r) => r.status === "non-nfc").map((r) => r.uri),
        wouldFault: wouldFault.map((r) => r.uri),
        skipped,
        rows: rows.filter((r) => r.status !== "unchanged").map((r) => ({ uri: r.uri, status: r.status })),
      },
      human: () => {
        for (const r of rows) console.log(`  ${r.status.toUpperCase().padEnd(10)} ${r.uri}`);
        for (const f of skipped) console.log(`  SKIPPED    ${f} (no loci derivation — outside bags//wikis/, non-.md, or rootless interior)`);
        console.log(`\n  ${rows.length} scanned · ${candidates.length} would submit · preview only (pass --apply)`);
        if (wouldFault.length > 0) console.log(`  ${wouldFault.length} large un-flagged file(s) would fault on regenesis — run \`--tag-blobs\` to flag them.`);
      },
    });
    return 0;
  }

  if (candidates.length === 0) {
    emit(args, { ok: true, data: { toBag, scanned: rows.length, submitted: 0 }, human: () => console.log("nothing to ingest — all carriers match the Synced tree") });
    return 0;
  }

  // ── confirm (HUMAN path; agents carry --yes) ───────────────────────────
  if (!args.flags["yes"]) {
    if (wantsJson(args)) {
      emit(args, { ok: false, error: { code: "usage", message: "confirmation required", hint: "pass --yes for non-interactive (agent) invocation" }, human: () => { /* unreachable */ } });
      return exitFor("usage");
    }
    for (const r of candidates) console.log(`  ${r.status.toUpperCase().padEnd(8)} ${r.uri}`);
    const rl = createInterface({ input: stdin, output: stdout });
    const answer = await rl.question(`INGEST ${candidates.length} carriers into ${toBag}? [y/N] `);
    rl.close();
    if (!/^y(es)?$/i.test(answer.trim())) { console.log("aborted"); return 1; }
  }

  // ── submit — hashes travel WITH the content ────────────────────────────
  let did: string;
  try { did = await vesselDid(); } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "not-found", message: msg }, human: () => console.error(`lares ingest: ${msg}`) });
    return exitFor("not-found");
  }
  // ── submit — one line over the daemon's sock (the lares↔lararium binding) ──
  let result;
  try {
    result = await submitIngest({
      source, toBag, candidates, did,
      inWiki: Boolean(args.flags["in-wiki"]),
      ...(renameDeletions.length > 0 ? { deletions: renameDeletions } : {}),
      ...(args.options["change-id"] ? { changeId: args.options["change-id"] } : {}),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "daemon-unreachable", message: msg, hint: "Start the daemon with `lares serve` and try again." }, human: () => { console.error(`lares ingest: ${msg}`); console.error("  Start the daemon with `lares serve` and try again."); } });
    return exitFor("daemon-unreachable");
  }
  if (result.status === "error") {
    const msg = result.errorMessage ?? "unknown";
    const code = /^cap-denied/.test(msg) ? "cap-denied" : /conflict/i.test(msg) ? "conflict" : "verb-error";
    emit(args, { ok: false, requestId: result.requestId, error: { code, message: msg }, human: () => console.error(`INGEST failed: ${msg}`) });
    return exitFor(code);
  }
  const summary = summaryOutput(result) ?? {};

  // Pack echo-gate: record each landed PACK's synced observation (the projector
  // never does — a pack file has no project-back), so an unchanged pack noops on
  // the next scan instead of re-landing the whole bundle.
  const landedCarriers = (summary as { carriers?: Array<Record<string, unknown>> }).carriers ?? [];
  const packsRecorded = recordLandedPacks(tree, toBag, candidates, landedCarriers);
  // R2 — a confirmed rename moves its observation to the new location (delete old key,
  // set new), so the moved carrier reads `unchanged` next scan instead of re-landing.
  const renamesMoved = applyConfirmedRenames(tree, toBag, candidates, (summary as { deletions?: Record<string, unknown> }).deletions);
  if (packsRecorded + renamesMoved > 0) tree.flush();

  const auditUri = `${OUTCOME_URI_PREFIX}${result.requestId}`;
  emit(args, {
    ok: true,
    requestId: result.requestId,
    data: { verb: "INGEST", scanned: rows.length, submitted: candidates.length, ...summary, audit: auditUri },
    human: () => {
      console.log(`INGEST ✓ applied locally — ${candidates.length} carrier(s) submitted (req ${result.requestId.slice(0, 8)})`);
      const carriers = (summary as { carriers?: Array<Record<string, unknown>> })["carriers"] ?? [];
      for (const c of carriers) {
        const extra = c["reason"] ?? (Array.isArray(c["tombstoned"]) && (c["tombstoned"] as unknown[]).length ? `tombstoned ${(c["tombstoned"] as unknown[]).length}` : "");
        console.log(`  ${String(c["decision"]).toUpperCase().padEnd(10)} ${c["uri"]}${extra ? `  (${extra})` : ""}`);
      }
      console.log(`\n  audit: ${auditUri}`);
    },
  });
  return 0;
}
