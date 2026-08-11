/**
 * `lares sense refresh` — re-pave the in-tree mempalace projection over the sovereign content plane,
 * THROUGH the @daemon seat, ON the serialized Python capture holder's own pipe.
 *
 * The recall surface (lexical + entity) is a DERIVED, rebuildable view over content (the one source).
 * A refresh re-derives it. Because it rides the SAME serialized holder that owns the content store, a
 * refresh queues BETWEEN capture passes and never races the live writer — so you may ask for it anytime,
 * even while open sessions keep landing. It re-paves the content as of now; a live session's later turns
 * land on the next capture, and a later refresh re-derives the view (forward capture keeps it current).
 *
 * The pave reads by VOLUME — the authored voice, skipping the low-volume harness/thinking murmur —
 * unless `--all-strata` indexes every stratum.
 *
 *   lares sense refresh                      re-pave the projection
 *   lares sense refresh <query...>           re-pave, then witness a recall
 *   lares sense refresh <query> --k <n>      cap the witness hits (default 5)
 *   lares sense refresh --all-strata         index every stratum (incl. the low-volume murmur)
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/lararium-memory#refresh
 */

import { TIMEOUT_CEIL_MS } from "@lararium/mempalace";
import { vesselDid } from "../env.js";
import { summaryOutput } from "../verb-result.js";
import { runVerb } from "../verb-call.js";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

/** One-line preview of a witness hit's verbatim (resolved from content): collapse whitespace, clip. */
function preview(text: unknown, n = 160): string {
  if (typeof text !== "string") return "";
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > n ? flat.slice(0, n) + "…" : flat;
}

export async function cmdRefresh(args: ParsedArgs): Promise<number> {
  const query = args.positional.join(" ").trim() || undefined;
  const k = args.options["k"] !== undefined ? Number(args.options["k"]) : undefined;
  const allStrata = args.flags["all-strata"] === true;

  let did: string;
  try {
    did = await vesselDid();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "not-found", message: msg }, human: () => console.error(`lares sense refresh: ${msg}`) });
    return exitFor("not-found");
  }

  const sensoriumRoot = typeof args.options["sensorium-root"] === "string" ? args.options["sensorium-root"] : undefined;
  const verbArgs: Record<string, unknown> = {};
  if (query) verbArgs["query"] = query;
  if (k !== undefined) verbArgs["k"] = k;
  if (allStrata) verbArgs["allStrata"] = true;
  if (sensoriumRoot) verbArgs["sensoriumRoot"] = sensoriumRoot;  // address a specific sensorium (else memory)

  // The caller's patience = the servo CEIL, so the CLI never cliffs before the daemon's adaptive
  // (gradient) budget — a refresh queued behind a big in-flight capture pass still resolves; a real
  // hang dies within CEIL. The daemon's per-verb servo is the real fail-on-a-gradient bound.
  let result;
  try {
    result = await runVerb("refresh", verbArgs, did, { timeoutMs: TIMEOUT_CEIL_MS });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, {
      ok: false,
      error: { code: "daemon-unreachable", message: msg, hint: "Start the daemon with `lares vessel stand --foreground` and try again." },
      human: () => {
        console.error(`lares sense refresh: ${msg}`);
        console.error("  Start the daemon with `lares vessel stand --foreground` and try again.");
      },
    });
    return exitFor("daemon-unreachable");
  }

  if (result.status === "error") {
    const msg = result.errorMessage ?? "unknown";
    const code = /^cap-denied/.test(msg) ? "cap-denied" : "verb-error";
    emit(args, {
      ok: false, requestId: result.requestId, error: { code, message: msg },
      human: () => console.error(`lares sense refresh failed: ${msg}`),
    });
    return exitFor(code);
  }

  const out = summaryOutput(result) ?? {};
  emit(args, {
    ok: true,
    requestId: result.requestId,
    data: out,
    human: () => {
      const paved = out["paved"];
      const strata = out["strata"];
      console.log(`lares sense refresh — paved ${typeof paved === "number" ? paved : "?"} atom(s)${strata ? ` (${strata} voice)` : ""}`);
      if (typeof out["mempalace"] === "string") console.log(`  projection: ${out["mempalace"]}`);
      const hits = Array.isArray(out["hits"]) ? (out["hits"] as Array<Record<string, unknown>>) : [];
      if (query) console.log(`  witness "${query}" — ${hits.length} hit${hits.length === 1 ? "" : "s"}`);
      for (const h of hits) console.log(`    ${String(h["cid"] ?? "?")}  ${preview(h["preview"])}`);
    },
  });
  return 0;
}
