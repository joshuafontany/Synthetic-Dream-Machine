/**
 * `lares sense analyze` — DETECT-ONLY change-point analysis over the sensorium's poured content stream.
 * The isomorphic `sense_analyze` instrument (Foote novelty · sequitur depth+shore · sequitur-MDL · branching
 * entropy) reads the reconstructed stream word-grained and reports WHERE the content changes hands — every
 * boundary a word index. Blind to any ground-truth (the answer-key wall stays uncrossed): it LOCATES, never
 * scores. A read-only compute, no cache — it runs on demand and returns.
 *
 *   lares sense analyze                     the boundary map across the default Foote scales
 *   lares sense analyze --halves 4,8,16     name the Foote kernel half-widths (words)
 *   lares sense analyze --span 8            context words each side of a reported boundary (human render)
 *   lares sense analyze --spectral          the embedding-geometry surface instead of boundaries
 *
 * The compute rides THROUGH the @daemon `analyze` verb so it reuses the ONE content handle the holder owns
 * (never a second store client). The daemon-side verb registration rides the wiki-VM TS build target (the
 * node + python halves — the capture_session `analyze` serve-op + the capture-source `analyze` op — stand
 * ready); until it lands, `lares_mcp --standalone --sensorium <root>` runs the same instrument directly.
 *
 * Meme: lar:///ha.ka.ba/lararium/sensorium/sense-analyze
 */

import { TIMEOUT_CEIL_MS } from "@lararium/mempalace";
import { vesselDid } from "../env.js";
import { summaryOutput } from "../verb-result.js";
import { runVerb } from "../verb-call.js";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

export async function cmdAnalyze(args: ParsedArgs): Promise<number> {
  const spectral = args.flags["spectral"] === true;
  const halves = typeof args.options["halves"] === "string" ? (args.options["halves"] as string) : undefined;
  const span = args.options["span"] !== undefined ? Number(args.options["span"]) : 6;
  const sensoriumRoot = typeof args.options["sensorium-root"] === "string" ? (args.options["sensorium-root"] as string) : undefined;

  let did: string;
  try {
    did = await vesselDid();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "not-found", message: msg }, human: () => console.error(`lares sense analyze: ${msg}`) });
    return exitFor("not-found");
  }

  const verbArgs: Record<string, unknown> = { span };
  if (spectral) verbArgs["spectral"] = true;
  if (halves) verbArgs["halves"] = halves;
  if (sensoriumRoot) verbArgs["sensoriumRoot"] = sensoriumRoot;

  let result;
  try {
    result = await runVerb("analyze", verbArgs, did, { timeoutMs: TIMEOUT_CEIL_MS });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, {
      ok: false,
      error: { code: "daemon-unreachable", message: msg, hint: "Start the daemon with `lares vessel stand --foreground`, or run `lares_mcp --standalone --sensorium <root>`." },
      human: () => {
        console.error(`lares sense analyze: ${msg}`);
        console.error("  Start the daemon with `lares vessel stand --foreground` and try again.");
        console.error("  (Standalone today: lares_mcp --standalone --sensorium <root>, tool `analyze`.)");
      },
    });
    return exitFor("daemon-unreachable");
  }

  if (result.status === "error") {
    const msg = result.errorMessage ?? "unknown";
    const code = /^cap-denied/.test(msg) ? "cap-denied" : "verb-error";
    const owed = /unknown verb|no .*verb|analyze/i.test(msg);
    emit(args, {
      ok: false, requestId: result.requestId, error: { code, message: msg,
        ...(owed ? { hint: "the @daemon `analyze` verb registration is owed on the wiki-VM TS build; run `lares_mcp --standalone --sensorium <root>` (tool `analyze`) meanwhile" } : {}) },
      human: () => {
        console.error(`lares sense analyze failed: ${msg}`);
        if (owed) console.error("  → standalone today: lares_mcp --standalone --sensorium <root> (tool `analyze`)");
      },
    });
    return exitFor(code);
  }

  const out = summaryOutput(result) ?? {};
  emit(args, {
    ok: true,
    requestId: result.requestId,
    data: out,
    human: () => {
      if (spectral) {
        console.log(`lares sense analyze --spectral · ${out["sensorium"] ?? "?"}`);
        console.log(JSON.stringify(out, null, 1));
        return;
      }
      const boundaries = (out["boundaries"] ?? {}) as Record<string, unknown>;
      console.log(`lares sense analyze — ${out["n_words"] ?? "?"} words · ${out["n_chars"] ?? "?"} chars · mdl cuts ${out["mdl_inferred_cuts"] ?? "?"}`);
      for (const [arm, cuts] of Object.entries(boundaries)) {
        const list = Array.isArray(cuts) ? cuts : [];
        console.log(`  ${arm.padStart(14)} · ${list.length} boundaries (word-index): ${JSON.stringify(list.slice(0, 24))}${list.length > 24 ? " …" : ""}`);
      }
    },
  });
  return 0;
}
