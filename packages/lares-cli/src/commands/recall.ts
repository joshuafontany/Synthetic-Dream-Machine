/**
 * `lares sense recall` — read the verbatim PLACE memory (mempalace) THROUGH the @daemon
 * seat (Option D, the read membrane).
 *
 * The CLI never touches mempalace directly: it submits a `recall` verb-summons to
 * the running daemon, whose main-thread handler reaches the read-only sidecar and
 * returns hits. The membrane crosses the causal-island shore AT the seat — the
 * same web3-only path every other `lares` verb rides (capability-bearing summons,
 * never a session).
 *
 *   lares sense recall <keywords...>          semantic search (default)
 *   lares sense recall <kw> --wing <w>        filter to one project wing
 *   lares sense recall <kw> --k <n>           cap results (default 5); --limit stays as an alias
 *   lares sense recall --imago <id>           fetch one imago verbatim
 *   lares sense recall --list [--wing <w>]    list imagines (no query)
 *
 * The `--k` name mirrors the isomorphic MCP tool arg (`recall(query, k)`); `--limit`
 * keeps working for muscle-memory (`--k` wins when the operator passes both).
 *
 * STAMP FILTERS — compose with the search or the list (honest counts, never a
 * silent drop): --voice <name> · --band <canon|synthesis|provisional|raw> ·
 * --agent <id|handle-prefix|pet-name> · --surface <claude|codex|copilot-cli|copilot-vscode> ·
 * --drift (drift-flagged turns only). List mode reads the stamped lar_* drawer
 * metadata exactly; search mode reads surface/agent exactly off the source name
 * and re-runs the capture's own gradient reader for voice/band/drift (the search
 * wire returns no drawer metadata — see mesh/stamp-filter.ts).
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/lararium-memory#shared-mesh
 */

import { loadVesselVerifyingKey } from "@lararium/node";
import { TIMEOUT_CEIL_MS } from "@lararium/mempalace";
import { larDataDir } from "../env.js";
import { summaryOutput } from "../verb-result.js";
import { runVerb } from "../verb-call.js";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

async function operatorDid(): Promise<string> {
  return "0x" + (await loadVesselVerifyingKey(larDataDir()));
}

/** One-line preview of a verbatim hit/drawer body: collapse whitespace, clip. */
function preview(text: unknown, n = 180): string {
  if (typeof text !== "string") return "";
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > n ? flat.slice(0, n) + "…" : flat;
}

export async function cmdRecall(args: ParsedArgs): Promise<number> {
  const query   = args.positional.join(" ").trim();
  const imago   = args.options["imago"];
  const wing    = args.options["wing"];
  // `--k` mirrors the MCP tool arg; `--limit` stays as an alias (--k wins).
  const limit   = args.options["k"] ?? args.options["limit"];
  const wantList = args.flags["list"];
  // The provenance filters (agent · surface) + the block-taxonomy filters (speaker · channel · function)
  // — a filter alone implies --list. speaker="operator" surfaces the operator's steering as its own
  // stratum; channel="speech" the loud voices; function names one role. The CLI stays isomorphic with the
  // /mcp recall tool, both carrying the same filter set. (Enrichment filters voice/band/drift not here.)
  const filterKeys = ["agent", "surface", "speaker", "channel", "function"] as const;
  const hasFilters = filterKeys.some((k) => args.options[k] !== undefined);

  if (!query && !imago && !wantList && !hasFilters) {
    console.error("usage: lares sense recall <keywords...> | --imago <id> | --list [--wing <w>] [--k <n>]");
    console.error("  filters: --agent <id> --surface <claude|codex|copilot-cli|copilot-vscode>");
    console.error("           --speaker <operator|agent|harness> --channel <speech|thought|tool> --function <steering|surface|scaffold|thinking|action|result>");
    return 2;
  }

  // The recall verb args (the daemon's handler dispatches by which are present).
  const verbArgs: Record<string, unknown> = {};
  if (imago)             verbArgs["imago"] = imago;
  else if (query)        verbArgs["query"]  = query;
  if (wing  !== undefined) verbArgs["wing"]  = wing;
  if (limit !== undefined) verbArgs["limit"] = Number(limit);
  // The addressed sensorium (from `lares sense <sensorium> recall`) — recall that sensorium up the ladder.
  if (typeof args.options["sensorium-root"] === "string") verbArgs["sensoriumRoot"] = args.options["sensorium-root"];
  for (const k of filterKeys) if (args.options[k] !== undefined) verbArgs[k] = args.options[k];
  // --pair returns the exchange-VIEW: each matched block paired with its turn's siblings (steering
  // beside surface), the merge done as a read-time view rather than baked into content.
  if (args.flags["pair"]) verbArgs["pair"] = true;


  let did: string;
  try {
    did = await operatorDid();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "not-found", message: msg }, human: () => console.error(`lares sense recall: ${msg}`) });
    return exitFor("not-found");
  }

  // Co-located UDS fast path, WS fallback (the lares↔lararium binding). The sidecar
  // cold-starts chromadb + embeds the query — give it room beyond the 10s default;
  // recall is read-only, so a generous budget costs nothing.
  let result;
  try {
    // The caller's patience = the servo CEIL: the first recall cold-loads the Python coordinator holder
    // (embedder + #has surfaces); the daemon's gradient servo is the real bound.
    result = await runVerb("recall", verbArgs, did, { timeoutMs: TIMEOUT_CEIL_MS });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, {
      ok: false, error: { code: "daemon-unreachable", message: msg, hint: "Start the daemon with `lares serve` and try again." },
      human: () => {
        console.error(`lares sense recall: ${msg}`);
        console.error("  Start the daemon with `lares serve` and try again.");
      },
    });
    return exitFor("daemon-unreachable");
  }

  if (result.status === "error") {
    const msg = result.errorMessage ?? "unknown";
    const code = /^cap-denied/.test(msg) ? "cap-denied" : "verb-error";
    emit(args, {
      ok: false, requestId: result.requestId, error: { code, message: msg },
      human: () => console.error(`lares sense recall failed: ${msg}`),
    });
    return exitFor(code);
  }

  const out = summaryOutput(result) ?? {};
  const mode = out["mode"];
  // STALE-DAEMON GUARD — a daemon predating the stamp filters ignores unknown verb args and
  // returns the UNFILTERED result (the silent drop the filters ban). A filtered response always
  // carries `scanned`; its absence under requested filters refuses loud, never lies quietly.
  if (hasFilters && mode !== "imago" && typeof out["scanned"] !== "number") {
    const msg = "the running daemon predates recall stamp filters (it returned an unfiltered result)";
    emit(args, {
      ok: false, requestId: result.requestId,
      error: { code: "verb-error", message: msg, hint: "Restart the daemon on fresh dist (`lares serve` / `lares wake`) and retry." },
      human: () => { console.error(`lares sense recall: ${msg}`); console.error("  Restart the daemon on fresh dist (`lares serve` / `lares wake`) and retry."); },
    });
    return exitFor("verb-error");
  }
  emit(args, {
    ok: true,
    requestId: result.requestId,
    data: out,
    human: () => {
      if (mode === "imago") {
        const d = (out["imago"] ?? {}) as Record<string, unknown>;
        console.log(`imago ${String(d["imago_id"] ?? "?")}`);
        console.log(typeof d["content"] === "string" ? d["content"] : JSON.stringify(d, null, 2));
      } else if (mode === "search") {
        const hits = Array.isArray(out["results"]) ? (out["results"] as Array<Record<string, unknown>>) : [];
        const fnote = typeof out["scanned"] === "number"
          ? ` (filtered: ${String(out["matched"] ?? hits.length)} of ${String(out["scanned"])} scanned)` : "";
        console.log(`recall "${query}" — ${hits.length} hit${hits.length === 1 ? "" : "s"}${fnote}`);
        for (const h of hits) {
          const sim  = typeof h["similarity"] === "number" ? `${(h["similarity"] * 100).toFixed(0)}%` : "  ?";
          const loc  = [h["wing"], h["room"]].filter(Boolean).join("/") || "—";
          console.log(`  ${sim.padStart(4)}  ${loc}`);
          console.log(`        ${preview(h["text"])}`);
        }
      } else {
        // list
        const imagines = Array.isArray(out["imagines"]) ? (out["imagines"] as Array<Record<string, unknown>>) : [];
        const total = out["total"];
        const fnote = typeof out["scanned"] === "number" ? ` (filtered from ${String(out["scanned"])} scanned)` : "";
        console.log(`imagines ${imagines.length}${typeof total === "number" ? ` of ${total}` : ""}${fnote}`);
        for (const d of imagines) {
          const loc = [d["wing"], d["room"]].filter(Boolean).join("/") || "—";
          console.log(`  ${String(d["imago_id"] ?? d["id"] ?? "?")}  ${loc}`);
          console.log(`        ${preview(d["content"] ?? d["preview"] ?? d["text"])}`);
        }
      }
    },
  });
  return 0;
}
