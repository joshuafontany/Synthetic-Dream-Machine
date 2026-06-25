/**
 * `lares recall` — read the verbatim PLACE memory (mempalace) THROUGH the @admin
 * seat (Option D, the read membrane).
 *
 * The CLI never touches mempalace directly: it submits a `recall` verb-summons to
 * the running daemon, whose main-thread handler reaches the read-only sidecar and
 * returns hits. The membrane crosses the causal-island shore AT the seat — the
 * same web3-only path every other `lares` verb rides (capability-bearing summons,
 * never a session).
 *
 *   lares recall <keywords...>          semantic search (default)
 *   lares recall <kw> --wing <w>        filter to one project wing
 *   lares recall <kw> --limit <n>       cap results (default 5)
 *   lares recall --drawer <id>          fetch one drawer verbatim
 *   lares recall --list [--wing <w>]    list drawers (no query)
 *   lares recall ... --port <n>         admin daemon port
 *
 * Meme: lar:///ha.ka.ba/@lares/v0.1/api/pono/lararium-memory#shared-mesh
 */

import { loadVesselVerifyingKey } from "@lararium/node";
import { larDataDir } from "../env.js";
import { summaryOutput } from "../admin-connector.js";
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
  const drawer  = args.options["drawer"];
  const wing    = args.options["wing"];
  const limit   = args.options["limit"];
  const wantList = args.flags["list"];

  if (!query && !drawer && !wantList) {
    console.error("usage: lares recall <keywords...> | --drawer <id> | --list [--wing <w>] [--limit <n>]");
    return 2;
  }

  // The recall verb args (the daemon's handler dispatches by which are present).
  const verbArgs: Record<string, unknown> = {};
  if (drawer)            verbArgs["drawer"] = drawer;
  else if (query)        verbArgs["query"]  = query;
  if (wing  !== undefined) verbArgs["wing"]  = wing;
  if (limit !== undefined) verbArgs["limit"] = Number(limit);

  const portOpt = args.options["port"];

  let did: string;
  try {
    did = await operatorDid();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "not-found", message: msg }, human: () => console.error(`lares recall: ${msg}`) });
    return exitFor("not-found");
  }

  // Co-located UDS fast path, WS fallback (the lares↔lararium binding). The sidecar
  // cold-starts chromadb + embeds the query — give it room beyond the 10s default;
  // recall is read-only, so a generous budget costs nothing.
  let result;
  try {
    result = await runVerb("recall", verbArgs, did, { ...(portOpt ? { port: Number(portOpt) } : {}), timeoutMs: 30_000 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, {
      ok: false, error: { code: "daemon-unreachable", message: msg, hint: "Start the daemon with `lares serve` and try again." },
      human: () => {
        console.error(`lares recall: ${msg}`);
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
      human: () => console.error(`lares recall failed: ${msg}`),
    });
    return exitFor(code);
  }

  const out = summaryOutput(result) ?? {};
  const mode = out["mode"];
  emit(args, {
    ok: true,
    requestId: result.requestId,
    data: out,
    human: () => {
      if (mode === "drawer") {
        const d = (out["drawer"] ?? {}) as Record<string, unknown>;
        console.log(`drawer ${String(d["drawer_id"] ?? "?")}`);
        console.log(typeof d["content"] === "string" ? d["content"] : JSON.stringify(d, null, 2));
      } else if (mode === "search") {
        const hits = Array.isArray(out["results"]) ? (out["results"] as Array<Record<string, unknown>>) : [];
        console.log(`recall "${query}" — ${hits.length} hit${hits.length === 1 ? "" : "s"}`);
        for (const h of hits) {
          const sim  = typeof h["similarity"] === "number" ? `${(h["similarity"] * 100).toFixed(0)}%` : "  ?";
          const loc  = [h["wing"], h["room"]].filter(Boolean).join("/") || "—";
          console.log(`  ${sim.padStart(4)}  ${loc}`);
          console.log(`        ${preview(h["text"])}`);
        }
      } else {
        // list
        const drawers = Array.isArray(out["drawers"]) ? (out["drawers"] as Array<Record<string, unknown>>) : [];
        const total = out["total"];
        console.log(`drawers ${drawers.length}${typeof total === "number" ? ` of ${total}` : ""}`);
        for (const d of drawers) {
          const loc = [d["wing"], d["room"]].filter(Boolean).join("/") || "—";
          console.log(`  ${String(d["drawer_id"] ?? d["id"] ?? "?")}  ${loc}`);
          console.log(`        ${preview(d["content"] ?? d["preview"] ?? d["text"])}`);
        }
      }
    },
  });
  return 0;
}
