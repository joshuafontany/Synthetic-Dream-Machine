/**
 * lares ingest — the disk→records gesture (NEXT VECTOR build 2).
 *
 *   lares ingest --source <dir|file> --to <bagUri> [--apply] [--yes] [--port N]
 *
 * The gesture holds the disk grant and the Synced tree (the island holds
 * neither — readiness reads local on both sides of the membrane):
 *   scan      walk source for .md carriers; derive each uri by the loci law
 *   diff      disk-hash vs synced-hash per carrier (the cheap two legs)
 *   preview   (default) print NEW / UNCHANGED / CHANGED; submit nothing
 *   --apply   send NEW+CHANGED carriers with their hashes riding an INGEST
 *             verb; the island runs the full §6 gate (its currentRenderHash
 *             = the third leg) and answers per-carrier decisions
 *
 * Meme: lar:///ha.ka.ba/@lares/v0.1/docs/lares/handoff (NEXT VECTOR, build 2)
 */

import { createInterface } from "readline/promises";
import { stdin, stdout } from "process";
import type { ParsedArgs } from "../parse-args.js";
import { emit, wantsJson } from "../render.js";
import { connectAdminVessel, summaryOutput } from "../admin-connector.js";
import { larRoot, operatorDid } from "../env.js";
import { openSyncedTree, scanSource, candidatesOf, submitIngestOn } from "../ingest-core.js";

function printUsage(): void {
  console.log("usage: lares ingest --source <dir|file> --to <bagUri> [--apply] [--in-wiki] [--yes] [--port N]");
  console.log("  default  = preview (scan + two-leg diff, no submission);");
  console.log("  --apply  sends NEW+CHANGED carriers through the island's INGEST gate;");
  console.log("  --in-wiki runs the INGEST in the active wiki island (the path for @working");
  console.log("           ingest-back — a wikis/ source derives its URIs off the @working plane).");
}

export async function cmdIngest(args: ParsedArgs): Promise<number> {
  const source = args.options["source"];
  const toBag  = args.options["to"];
  if (!source || !toBag) { printUsage(); return 2; }

  const root = larRoot();
  const tree = openSyncedTree(root);

  // scan — observations only, never a work queue
  const scan = scanSource(root, source, toBag, tree);
  if (scan === null) {
    emit(args, { ok: false, error: `source "${source}" does not resolve`, human: () => console.error(`lares ingest: source "${source}" does not resolve`) });
    return 2;
  }
  const { rows, skipped } = scan;
  const candidates = candidatesOf(rows);

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
        skipped,
        rows: rows.filter((r) => r.status !== "unchanged").map((r) => ({ uri: r.uri, status: r.status })),
      },
      human: () => {
        for (const r of rows) console.log(`  ${r.status.toUpperCase().padEnd(10)} ${r.uri}`);
        for (const f of skipped) console.log(`  SKIPPED    ${f} (no loci derivation — outside bags//wikis/, non-.md, or rootless interior)`);
        console.log(`\n  ${rows.length} scanned · ${candidates.length} would submit · preview only (pass --apply)`);
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
      emit(args, { ok: false, error: "confirmation required: pass --yes for non-interactive (agent) invocation", human: () => { /* unreachable */ } });
      return 1;
    }
    for (const r of candidates) console.log(`  ${r.status.toUpperCase().padEnd(8)} ${r.uri}`);
    const rl = createInterface({ input: stdin, output: stdout });
    const answer = await rl.question(`INGEST ${candidates.length} carriers into ${toBag}? [y/N] `);
    rl.close();
    if (!/^y(es)?$/i.test(answer.trim())) { console.log("aborted"); return 1; }
  }

  // ── submit — hashes travel WITH the content ────────────────────────────
  let did: string;
  try { did = await operatorDid(); } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: msg, human: () => console.error(`lares ingest: ${msg}`) });
    return 3;
  }
  let vessel;
  try {
    const portOpt = args.options["port"];
    vessel = await connectAdminVessel(portOpt ? { port: Number(portOpt) } : {});
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: msg, human: () => { console.error(`lares ingest: ${msg}`); console.error("  Start the daemon with `lares serve` and try again."); } });
    return 3;
  }

  try {
    const result = await submitIngestOn(vessel, {
      source, toBag, candidates, did,
      inWiki: Boolean(args.flags["in-wiki"]),
      ...(args.options["change-id"] ? { changeId: args.options["change-id"] } : {}),
    });
    if (result.status === "error") {
      const msg = result.errorMessage ?? "unknown";
      emit(args, { ok: false, requestId: result.requestId, error: msg, human: () => console.error(`INGEST failed: ${msg}`) });
      return 4;
    }
    const summary = summaryOutput(result) ?? {};
    const auditUri = `lar:///ha.ka.ba/@admin/outcomes/${result.requestId}`;
    emit(args, {
      ok: true,
      requestId: result.requestId,
      data: { verb: "INGEST", scanned: rows.length, submitted: candidates.length, ...summary, audit: auditUri },
      human: () => {
        const carriers = (summary as { carriers?: Array<Record<string, unknown>> })["carriers"] ?? [];
        for (const c of carriers) {
          const extra = c["reason"] ?? (Array.isArray(c["tombstoned"]) && (c["tombstoned"] as unknown[]).length ? `tombstoned ${(c["tombstoned"] as unknown[]).length}` : "");
          console.log(`  ${String(c["decision"]).toUpperCase().padEnd(10)} ${c["uri"]}${extra ? `  (${extra})` : ""}`);
        }
        console.log(`\n  audit: ${auditUri}`);
      },
    });
    return 0;
  } finally {
    await vessel.disconnect();
  }
}
