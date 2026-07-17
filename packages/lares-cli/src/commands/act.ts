/**
 * `lares act <VERB> [flags...]` — Residency Model ACTION verb operator surface.
 *
 * VERB ∈ { ADD, COPY, MOVE, CLEAR, DROP, LOAD }
 *
 * Args per verb (kebab-case CLI flags):
 *
 *   ADD / COPY / MOVE
 *     --title <t>       tiddler title (Work-level identity)
 *     --from <bag>      source bag URI
 *     --to <bag>        destination bag URI
 *     --change-id <id>  (optional) explicit change-id; defaults to newChangeId()
 *
 *   CLEAR / DROP
 *     --bag <bag>       target bag URI
 *
 *   LOAD
 *     --source-uri <u>  external content source (https://... etc.)
 *     --to <bag>        destination bag URI
 *     --change-id <id>  (optional) explicit change-id; defaults to newChangeId()
 *
 * Common flags:
 *   --yes             skip confirmation prompt
 *
 * Each invocation submits a verb-tiddler to the daemon vessel; the wiki island's
 * action-handler family executes the residency mutation wrapped in
 * withEffectRecord (writes the archival audit tiddlers).
 *
 * Meme: lar:///ha.ka.ba/lararium/api/residency-model
 */

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { join, extname, resolve, relative, sep } from "node:path";
import { statSync, readdirSync, readFileSync, existsSync } from "node:fs";
import { loadVesselVerifyingKey } from "@lararium/node";
import { larDataDir } from "../env.js";
import { ACTION_VERBS, isActionVerb, isTransferVerb, isBagVerb, newChangeId, taskContentId, OUTCOME_URI_PREFIX } from "@lararium/mesh";
import { summaryOutput } from "../verb-result.js";
import { runVerb } from "../verb-call.js";
import { emit, wantsJson, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

async function operatorDid(): Promise<string> {
  return "0x" + (await loadVesselVerifyingKey(larDataDir()));
}

/**
 * The loci title a LOADed file carries — used when the file is NOT a memetic
 * carrier (a memetic carrier self-titles from its own heading; this rides as the
 * fallback baseUri). Two derivations:
 *   1. A file under a `bags/<holding>/…` or `wikis/<slug>/…` mirror tree carries
 *      its stable lar: name — the interior after the holding dir, any extension
 *      stripped, when it bears a `w.w.w` loci root.
 *   2. Otherwise the file namespaces under the destination bag by its path
 *      relative to the LOAD source (extension stripped) — unique + projectable.
 */
function lociTitleForLoad(source: string, file: string, toBag: string): string {
  const parts = resolve(file).split(sep);
  for (const plane of ["bags", "wikis"]) {
    const i = parts.lastIndexOf(plane);
    if (i >= 0 && i + 2 < parts.length) {
      const interior = parts.slice(i + 2).join("/").replace(/\.[^/.]+$/, "");
      if (/^\w+\.\w+\.\w+\//.test(interior)) return `lar:///${interior}`;
    }
  }
  const rel = relative(source, file).split(sep).join("/").replace(/\.[^/.]+$/, "");
  const base = toBag.replace(/\/+$/, "");
  return rel ? `${base}/${rel}` : base;
}

function printUsage(): void {
  console.error("usage: lares act <VERB> [flags...]");
  console.error("");
  console.error(`  VERB ∈ { ${ACTION_VERBS.join(", ")} }`);
  console.error("");
  console.error("  ADD / COPY / MOVE  --title <t> --from <bag> --to <bag> [--change-id <id>]");
  console.error("  CLEAR / DROP       --bag <bag>");
  console.error("  LOAD               --source-uri <u> --to <bag> [--change-id <id>]");
  console.error("");
  console.error("  --yes              skip confirmation prompt");
}

export async function cmdAct(args: ParsedArgs): Promise<number> {
  const verbRaw = args.positional[0];
  if (!verbRaw) { printUsage(); return 2; }
  if (!isActionVerb(verbRaw)) {
    console.error(`lares act: "${verbRaw}" is not an ACTION verb`);
    console.error(`  ACTION verbs: ${ACTION_VERBS.join(", ")}`);
    return 2;
  }
  if (verbRaw === "INGEST") {
    console.error("lares act INGEST: the ingest gesture carries hashes the act surface does not — use `lares ingest --source <dir> --to <bag>`");
    return 2;
  }
  const verb = verbRaw;

  // Build the kebab-case args bag per residency-actions encoding.
  const actionArgs: Record<string, unknown> = {};
  let carrierCount = 0;
  if (isTransferVerb(verb)) {
    const title    = args.options["title"];
    const fromBag  = args.options["from"];
    const toBag    = args.options["to"];
    const changeId = args.options["change-id"] ?? newChangeId();
    if (!title || !fromBag || !toBag) {
      console.error(`lares act ${verb}: --title, --from, --to all required`);
      return 2;
    }
    actionArgs["title"]      = title;
    actionArgs["from-bag"]   = fromBag;
    actionArgs["to-bag"]     = toBag;
    actionArgs["change-id"]  = changeId;
  } else if (isBagVerb(verb)) {
    const bag = args.options["bag"];
    if (!bag) {
      console.error(`lares act ${verb}: --bag required`);
      return 2;
    }
    actionArgs["bag"] = bag;
  } else if (verb === "CREATE") {
    const bag = args.options["bag"];
    if (!bag) {
      console.error(`lares act CREATE: --bag required`);
      return 2;
    }
    // TODO(name): the plane-signal flag is co-designed with the operator;
    // `--plane <catalog|oracle>` is a provisional placeholder (default catalog).
    const plane = args.options["plane"] === "oracle" ? "oracle" : "catalog";
    actionArgs["bag"]   = bag;
    actionArgs["plane"] = plane;
  } else {
    // verb === "LOAD"
    const sourceUri = args.options["source-uri"];
    const toBag     = args.options["to"];
    const changeId  = args.options["change-id"] ?? newChangeId();
    if (!sourceUri || !toBag) {
      console.error(`lares act LOAD: --source-uri and --to required`);
      return 2;
    }
    actionArgs["source-uri"] = sourceUri;
    actionArgs["to-bag"]     = toBag;
    actionArgs["change-id"]  = changeId;

    // The disk grant lives HERE — the operator gesture reads the carriers and
    // sends content WITH the verb (islands hold no fetch capability). A local
    // .md file or a directory of .md memes packs into args.carriers.
    try {
      const st = statSync(sourceUri);
      const isDir = st.isDirectory();
      const paths = (isDir
        ? (readdirSync(sourceUri, { recursive: true }) as string[])
            .map((f) => join(sourceUri, f))
            .filter((f) => { try { return statSync(f).isFile(); } catch { return false; } })
        : [sourceUri])
        // A `.meta` sidecar rides WITH its content file, never as a carrier of its own.
        .filter((f) => !f.endsWith(".meta"));
      // The feed lands BOTH memetic-wikitext memes AND every other legal TW5
      // filetype: each carrier rides its text + a loci title + its extension, and
      // the island routes by content (an SOH heading → the memetic membrane; else
      // TW5's own deserializer registry, keyed by extension). Only an empty /
      // whitespace-only file is skipped — it holds no carrier and would reject the
      // whole batch (the validator forbids an empty-text carrier).
      // TODO(binary): read per TW5's content-type encoding (base64 for images/PDF)
      //   and carry an `encoding` field; today the feed reads utf8 (text filetypes).
      const carriers = paths
        .map((f) => ({ f, text: readFileSync(f, "utf8") }))
        .filter(({ f, text }) => {
          if (text.trim().length === 0) {
            console.error(`lares act LOAD: skipping empty file "${f}" — no content to land`);
            return false;
          }
          return true;
        })
        .map(({ f, text }) => {
          // Pair a `.meta` sidecar so a content filetype keeps its fields at the membrane.
          let meta: string | undefined;
          try { if (existsSync(f + ".meta")) meta = readFileSync(f + ".meta", "utf8"); } catch { /* none */ }
          return { text, title: lociTitleForLoad(sourceUri, f, toBag), ext: extname(f), ...(meta !== undefined ? { meta } : {}) };
        });
      if (carriers.length > 0) {
        actionArgs["carriers"] = carriers;
        carrierCount = carriers.length;
      }
    } catch {
      // Honesty at the gesture: a non-resolving local path probably means a
      // typo — the island will refuse a carrier-less LOAD loudly either way.
      console.error(`lares act LOAD: "${sourceUri}" does not resolve locally — sending provenance-only LOAD (no carriers)`);
    }
  }

  // --dry-run / preview: capture the projected effect, commit nothing. Rides the
  // raw args; the island reactor reads it and runs the verb through a capturing access.
  if (args.flags["dry-run"]) actionArgs["dry-run"] = true;

  // ── Operator identity ─────────────────────────────────────────────────

  let did: string;
  try {
    did = await operatorDid();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "not-found", message: msg }, human: () => console.error(`lares act: ${msg}`) });
    return exitFor("not-found");
  }

  // ── Confirm (HUMAN/TTY path only; agents carry --yes) ─────────────────
  // An agent (JSON / off-TTY) cannot answer y/N — it MUST carry intent via --yes;
  // refusing the prompt keeps the surface non-interactive for unattended actors.
  if (!args.flags["yes"] && !args.flags["dry-run"]) {
    if (wantsJson(args)) {
      emit(args, {
        ok: false, error: { code: "usage", message: "confirmation required", hint: "pass --yes for non-interactive (agent) invocation" },
        human: () => { /* unreachable on the JSON path */ },
      });
      return exitFor("usage");
    }
    console.log("");
    console.log(`  ${verb}`);
    for (const [k, v] of Object.entries(actionArgs)) {
      console.log(`    ${k.padEnd(12)} ${v}`);
    }
    console.log("");
    const rl = createInterface({ input: stdin, output: stdout });
    const answer = await rl.question("Proceed? [y/N] ");
    rl.close();
    if (!/^y(es)?$/i.test(answer.trim())) {
      console.log("aborted");
      return 1;
    }
  }

  // ── Submit (UDS fast path, WS fallback — the lares↔lararium binding) ───
  // V1 — content-address this idempotent residency change (empty nonce). The
  // subject names the bag the change lands in; re-issuing the SAME logical change
  // (same change-id + verb + target) collapses to one requestId, and the
  // dispatcher's outcome-keyed dedup then gives exactly-once EFFECT. A fresh
  // change-id (the --change-id default) means a genuinely distinct change → runs.
  const subject   = String(actionArgs["to-bag"] ?? actionArgs["bag"] ?? "");
  // --in-wiki: run the ACTION IN the active wiki island over ITS composite
  // (where @working + canon both live) — the daemon commands via `wiki-act`,
  // never reaching the per-fingerprint @working binding. The default path
  // executes daemon-side (write-then-sync).
  const inWiki     = Boolean(args.flags["in-wiki"]);
  const submitName = inWiki ? "wiki-act" : verb;
  const submitArgs = inWiki ? { verb, args: actionArgs } : actionArgs;
  const requestId = await taskContentId({ subject, command: submitName, args: submitArgs, nonce: "" });
  // The ACK budget scales with the gesture: a directory-batch LOAD chews one
  // island frame per carrier, so a flat budget times out the ACK while the verb
  // itself succeeds.
  const timeoutMs = Math.max(10_000, 10_000 + carrierCount * 400);
  let result;
  try {
    result = await runVerb(submitName, submitArgs, did, { requestId, timeoutMs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, {
      ok: false, error: { code: "daemon-unreachable", message: msg, hint: "Start the daemon with `lares serve` and try again." },
      human: () => {
        console.error(`lares act: ${msg}`);
        console.error("  Start the daemon with `lares serve` and try again.");
      },
    });
    return exitFor("daemon-unreachable");
  }
  if (result.status === "error") {
    const msg = result.errorMessage ?? "unknown";
    // The island names a cap/ward denial as `cap-denied: …`; give it its own
    // class (exit 5) so an agent can tell "I lack authority" from a plain
    // verb failure. Everything else stays a verb-error (exit 4).
    const code = /^cap-denied/.test(msg) ? "cap-denied" : /conflict/i.test(msg) ? "conflict" : "verb-error";
    emit(args, {
      ok: false, requestId: result.requestId, error: { code, message: msg },
      human: () => console.error(`${verb} failed: ${msg}`),
    });
    return exitFor(code);
  }

  const summary = summaryOutput(result) ?? {};
  const auditUri = `${OUTCOME_URI_PREFIX}${result.requestId}`;
  emit(args, {
    ok: true,
    requestId: result.requestId,
    data: { verb, ...summary, audit: auditUri },
    human: () => {
      if (summary["dryRun"]) {
        const wl = Array.isArray(summary["wouldLand"]) ? summary["wouldLand"].length : 0;
        const wt = Array.isArray(summary["wouldTombstone"]) ? summary["wouldTombstone"].length : 0;
        console.log(`${verb} --dry-run: would land ${wl}, tombstone ${wt} — NOTHING committed (req ${result.requestId.slice(0, 8)})`);
      } else {
        console.log(`${verb} ✓ applied locally (req ${result.requestId.slice(0, 8)})`);
      }
      for (const [k, v] of Object.entries(summary)) {
        console.log(`  ${k.padEnd(12)} ${typeof v === "string" ? v : JSON.stringify(v)}`);
      }
      console.log(`  audit:       ${auditUri}`);
    },
  });
  return 0;
}
