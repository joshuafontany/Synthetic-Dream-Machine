/**
 * stamp-filter — the recall STAMP-FILTER predicate (pure, isomorphic).
 *
 * `lares recall` learns the stamps the palace already stores: `--voice` / `--band` /
 * `--agent` / `--surface` / `--drift` compose with the semantic query. Two clause
 * families, matched by what each read path actually carries:
 *
 *  - SOURCE-DERIVED clauses (surface · agent) read EXACTLY off the staged
 *    `source_file` name — the same derivations buildPatch stamps `lar_surface` /
 *    `lar_agent` / `lar_agent_handle` from, so filter and stamp never drift.
 *  - INSTRUMENT clauses (voice · band · drift) read off `lar_voices` / `lar_band` /
 *    `lar_drift` where drawer METADATA is in hand (`drawerPassesStampFilters`, the
 *    list path). The SEARCH wire returns no metadata and no turn key (`lar_turn_key`
 *    never lands on a content drawer — node-capture-engine strips it to .structurepalace
 *    provenance), so NO palace-side join key exists on a search hit; the honest cure
 *    (`hitPassesStampFilters`) re-runs the SAME sovereign reader that stamped the
 *    drawer at capture — `harvestTurnGradient` — over the hit's returned verbatim
 *    text. A neighbor-hydrated hit reads over its hydrated window; the caller
 *    surfaces that scope rather than hiding it.
 *
 * Honest empties: the caller reports scanned vs matched — a filter that matches
 * nothing returns an empty result WITH its counts, never a silent drop.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/lar-telemetry
 */

import { harvestTurnGradient, type HarvestBand } from "./turn-harvest.js";
import { deriveSurface, deriveAgent, deriveHandle, deriveRootHandle } from "./build-patch.js";

/** The five stamp filters. All optional; an empty set reads as "no filtering". */
export interface StampFilters {
  /** Voice name (case-insensitive; matches a harvested Voice name or its `Name (Role)` stamp). */
  readonly voice?: string;
  /** Confidence band — canon | synthesis | provisional | raw (the house register ladder). */
  readonly band?: HarvestBand;
  /** Agent id / worldline-handle prefix, or the exact spirit pet-name. */
  readonly agent?: string;
  /** Originating harness — claude | codex | copilot-vscode | copilot-cli (deriveSurface values). */
  readonly surface?: string;
  /** Keep only drift-flagged turns. */
  readonly drift?: boolean;
}

export const STAMP_BANDS: readonly HarvestBand[] = ["canon", "synthesis", "provisional", "raw"];

/**
 * Read the stamp filters off a verb/CLI arg map. Returns null when none present.
 * Throws on an unknown `band` — an invalid filter fails loud, never filters silently wrong.
 */
export function readStampFilters(args: Record<string, unknown>): StampFilters | null {
  const str = (k: string): string | undefined => {
    const v = args[k];
    return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  };
  const band = str("band");
  if (band !== undefined && !STAMP_BANDS.includes(band as HarvestBand)) {
    throw new Error(`recall: --band must be one of ${STAMP_BANDS.join("|")} (got "${band}")`);
  }
  const drift = args["drift"] === true || args["drift"] === "true";
  const voice = str("voice");
  const agent = str("agent");
  const surface = str("surface");
  const f: StampFilters = {
    ...(voice !== undefined ? { voice } : {}),
    ...(band !== undefined ? { band: band as HarvestBand } : {}),
    ...(agent !== undefined ? { agent } : {}),
    ...(surface !== undefined ? { surface } : {}),
    ...(drift ? { drift: true } : {}),
  };
  return Object.keys(f).length > 0 ? f : null;
}

/** SOURCE-DERIVED clauses — exact, off the staged source_file name (buildPatch's own laws). */
function sourceClausesPass(f: StampFilters, sourceFile: string | undefined): boolean {
  if (f.surface !== undefined && deriveSurface(sourceFile) !== f.surface.toLowerCase()) return false;
  if (f.agent !== undefined) {
    const want = f.agent.toLowerCase();
    const pet = (deriveAgent(sourceFile) ?? "").toLowerCase();
    const handle = (deriveHandle(sourceFile) ?? deriveRootHandle(sourceFile) ?? "").toLowerCase();
    const agentId = handle.includes(".") ? (handle.split(".")[1] ?? "") : "";
    if (!(pet === want || (handle !== "" && handle.startsWith(want)) || (agentId !== "" && agentId.startsWith(want)))) {
      return false;
    }
  }
  return true;
}

/** INSTRUMENT clauses over already-read values (shared by both read paths). */
function instrumentClausesPass(
  f: StampFilters,
  read: { readonly voices: string; readonly band: string | undefined; readonly drift: boolean },
): boolean {
  if (f.voice !== undefined && !read.voices.toLowerCase().includes(f.voice.toLowerCase())) return false;
  if (f.band !== undefined && read.band !== f.band) return false;
  if (f.drift === true && !read.drift) return false;
  return true;
}

/** The subset of a search hit the filter reads (searcher.py's public hit fields). */
export interface FilterableHit {
  readonly text?: unknown;
  readonly source_path?: unknown;
  readonly source_file?: unknown;
  readonly [key: string]: unknown;
}

/**
 * SEARCH-path predicate. Surface/agent clauses read the hit's `source_path` exactly;
 * voice/band/drift clauses re-run `harvestTurnGradient` over the hit's verbatim text
 * (the same instrument that stamped `lar_voices`/`lar_band`/`lar_drift` at capture) —
 * the search wire carries no drawer metadata and no turn key to join on.
 */
export function hitPassesStampFilters(f: StampFilters, hit: FilterableHit): boolean {
  const src =
    typeof hit.source_path === "string" && hit.source_path !== ""
      ? hit.source_path
      : typeof hit.source_file === "string"
        ? hit.source_file
        : undefined;
  if (!sourceClausesPass(f, src)) return false;
  if (f.voice === undefined && f.band === undefined && f.drift !== true) return true;
  const h = harvestTurnGradient(typeof hit.text === "string" ? hit.text : "");
  return instrumentClausesPass(f, {
    voices: h.voices.map((v) => (v.role ? `${v.name} (${v.role})` : v.name)).join("|"),
    band: h.band,
    drift: h.driftFlags.length > 0,
  });
}

/**
 * LIST-path predicate — exact, over the drawer's stamped `lar_*` metadata
 * (buildPatch at capture / writeback). A drawer that predates the stamps (no
 * `lar_band`) fails an instrument clause honestly — un-stamped is not a match.
 */
export function drawerPassesStampFilters(f: StampFilters, meta: Record<string, unknown>): boolean {
  const src = typeof meta["source_file"] === "string" ? (meta["source_file"] as string) : undefined;
  if (f.surface !== undefined) {
    const stamped = typeof meta["lar_surface"] === "string" ? (meta["lar_surface"] as string) : deriveSurface(src);
    if (stamped !== f.surface.toLowerCase()) return false;
  }
  if (f.agent !== undefined) {
    const want = f.agent.toLowerCase();
    const pet = typeof meta["lar_agent"] === "string" ? (meta["lar_agent"] as string).toLowerCase() : "";
    const handle = typeof meta["lar_agent_handle"] === "string" ? (meta["lar_agent_handle"] as string).toLowerCase() : "";
    const agentId = handle.includes(".") ? (handle.split(".")[1] ?? "") : "";
    if (!(pet === want || (handle !== "" && handle.startsWith(want)) || (agentId !== "" && agentId.startsWith(want)))) {
      if (!sourceClausesPass({ agent: f.agent }, src)) return false; // un-stamped drawer → the source-name law decides
    }
  }
  return instrumentClausesPass(f, {
    voices: typeof meta["lar_voices"] === "string" ? (meta["lar_voices"] as string) : "",
    band: typeof meta["lar_band"] === "string" ? (meta["lar_band"] as string) : undefined,
    drift: typeof meta["lar_drift"] === "string" && meta["lar_drift"] !== "",
  });
}
