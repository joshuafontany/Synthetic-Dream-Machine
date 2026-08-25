/**
 * bag-manifest — a bag's own `meta` declaration: what it carries, who may read it, and where it belongs.
 *
 * THE GAP THIS CLOSES. Three self-describing axes stood defined and none stood SPOKEN: `CapTier` shipped a
 * `DeclaredTierSource` interface that only tests ever implemented, so every bag in production declared no
 * tier and the whole layer read inert; `BagHome` landed with no way for a bag to name its own; and residency
 * lived purely at runtime. A bag knew nothing about itself, and every answer came from whichever call site
 * asked — which is how a Nexus seal ended up in a repository nobody chose.
 *
 * ONE MANIFEST, THREE ANSWERS, and the bag holds them. It rides the same `toml meta` block every meme already
 * carries, at the bag's own root, so a human reads it with the grammar they already read — the manifest is a
 * meme about the bag, which is what a bag's self-description should be.
 *
 * ── NO PATHS, EVER (operator ruling, 2026-08-08) ─────────────────────────────────────────────────
 * `repository` names an ID the operator registered, never a directory. A declaration carrying a path would
 * carry one operator's disk layout into an artifact meant to travel: a second operator receiving that bag
 * would inherit a directory naming nothing on their machine. The bag names WHAT; each vessel resolves WHERE.
 * Same split the `lar:` URI law already runs — a name that does not fetch.
 *
 * ── WHAT A DECLARATION CANNOT DO ─────────────────────────────────────────────────────────────────
 * It only ever TIGHTENS the cap-tier: `resolveTier` meets the declared value against the structural floor and
 * never returns anything more open, so a manifest that LIES open changes nothing. The home carries no such
 * keystone and cannot — a home names a substrate rather than a permission, and nothing beneath it can check a
 * claim about where bytes ought to rest. So a wrong home is a wrong home, caught by a reader and not by a
 * gate, which is why the parse fail-closes to the one home whose failure recovers.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/cap-tier
 */

import { parseCapTier, DEFAULT_CAP_TIER, type CapTier } from "./cap-tier.js";
import { CARRIER_TYPE, DECLARATION } from "./carrier-type.js";
import { parseBagHome, DEFAULT_BAG_HOME, resolveBagHomeDir, type BagHome, type BagHomeRoots, type BagHomeResolution } from "./bag-home.js";

/** The file a bag's self-declaration rides, at the bag's own root. A meme about the bag. */
export const BAG_MANIFEST_FILE = "meta.mem" as const;

/** What a bag declares about itself. Every field carries a fail-closed default, so a torn read stays usable. */
export interface BagManifest {
  /** The bag's own name as its directory spells it — `lares`, `nexus`, `circles`. The line below mints
   *  `lar:///ha.ka.ba/bags/${bag}` from it, so a marker here would ride straight into the address. */
  readonly bag:  string;
  /** WHO may read it. Only ever tightens against the structural floor; a lie toward openness changes nothing. */
  readonly tier: CapTier;
  /** WHERE its bytes rest. */
  readonly home: BagHome;
  /** WHICH registered repo, when `home` reads "repository". An ID the operator registered — never a path. */
  readonly repository?: string;
  /** A one-line human note. Carries no authority and gates nothing; a reader's courtesy. */
  readonly role?: string;
}

/** A bag that declares nothing reads as the tightest tier and the recoverable home. */
export function defaultBagManifest(bag: string): BagManifest {
  return { bag, tier: DEFAULT_CAP_TIER, home: DEFAULT_BAG_HOME };
}

/**
 * Fold a parsed `meta` table into a manifest, fail-closing every field independently.
 *
 * FIELD-WISE rather than all-or-nothing: a manifest with one torn value still answers the other questions
 * correctly, and an all-or-nothing parse would throw away a good tier because somebody mistyped a home. Each
 * axis owns its own default, and each already fail-closes in its own safe direction.
 */
export function bagManifestFromMeta(bag: string, meta: Record<string, unknown> | null | undefined): BagManifest {
  const table = meta ?? {};
  const home  = parseBagHome(table["home"]);
  const repo  = typeof table["repository"] === "string" ? table["repository"].trim() : "";
  const role  = typeof table["role"] === "string" ? table["role"].trim() : "";
  return {
    bag,
    tier: parseCapTier(table["cap-tier"] ?? table["tier"]),
    home,
    // A repo id only rides where a repository home does. Carrying one on a hearth bag would leave a stale
    // pointer that reads as intent the next time somebody moves it.
    ...(home === "repository" && repo ? { repository: repo } : {}),
    ...(role ? { role } : {}),
  };
}

/** Render a manifest back to the `toml meta` body a bag's `meta.mem` carries. Stable key order — a diff reads. */
export function renderBagManifest(m: BagManifest): string {
  const lines = [
    DECLARATION,
    "",
    `<<^ code:"&#x0001;" namespace:"⊙" ? -> lar:///ha.ka.ba/bags/${m.bag} >>`,
    "```toml meta",
    `bag       = "${m.bag}"`,
    `cap-tier  = "${m.tier}"`,
    `home      = "${m.home}"`,
    ...(m.repository ? [`repository = "${m.repository}"`] : []),
    ...(m.role ? [`role      = "${m.role.replace(/"/g, "'")}"`] : []),
    `type      = "${CARRIER_TYPE}"`,
    "```",
    "",
    `! ${m.bag}`,
    "",
    `This bag declares its own caps and its own home. ''cap-tier'' names WHO may read it — and only ever`,
    `TIGHTENS against the structural floor, so a declaration cannot open what the crypto keeps shut.`,
    `''home'' names WHERE its bytes rest: \`repository\` (a clone carries it) · \`hearth\` (per-operator, no`,
    `clone carries it) · \`ley\` (nowhere durable — it lives while the mesh carries it).`,
    "",
    `A repository home names a REGISTERED id, never a path: the bag names WHAT, each vessel resolves WHERE.`,
    "",
    '<<^ code:"&#x0004;" -> ? >>',
    "",
  ];
  return lines.join("\n");
}

/** A manifest read against a vessel's actual roots — the declaration plus where it lands here. */
export interface BagPlacement {
  readonly manifest:   BagManifest;
  readonly resolution: BagHomeResolution;
}

/**
 * Place a bag: read its declaration against THIS vessel's registered roots.
 *
 * The two halves stay separate on purpose. The manifest travels with the bag and says what it wants; the
 * resolution is local and says whether this vessel can give it. A bag whose repo id nobody registered here
 * reads as PLACEABLE-ELSEWHERE rather than as broken — the declaration is fine, this vessel simply is not
 * where it lives.
 */
export function placeBag(manifest: BagManifest, roots: BagHomeRoots): BagPlacement {
  return { manifest, resolution: resolveBagHomeDir(manifest.home, roots, manifest.repository) };
}

/** What a proposed move would change. Pure — it computes the intent; a caller performs it. */
export interface BagMove {
  readonly bag:  string;
  readonly from: BagPlacement;
  readonly to:   BagPlacement;
  /** True when the two placements land the same bytes in the same directory — nothing to do. */
  readonly noop: boolean;
}

/**
 * Compute a move from a bag's current declaration to a proposed one.
 *
 * PURE, AND THAT MATTERS. A move relocates an operator's bytes, so the decision of WHETHER it can happen must
 * be readable before anything is written: both ends resolve here, both refusals surface here, and a caller
 * that cannot resolve the target never reaches the filesystem. The act stays outside; only the judgement
 * lives in this module.
 */
export function planBagMove(
  current: BagManifest,
  next: { home: BagHome; repository?: string | undefined },
  roots: BagHomeRoots,
): BagMove {
  const target: BagManifest = {
    ...current,
    home: next.home,
    ...(next.home === "repository" && next.repository ? { repository: next.repository } : {}),
  };
  // A hearth/ley target drops any repo id the bag carried — see bagManifestFromMeta on stale pointers.
  const cleaned: BagManifest = next.home === "repository" ? target : stripRepository(target);
  const from = placeBag(current, roots);
  const to   = placeBag(cleaned, roots);
  const noop = from.resolution.ok && to.resolution.ok && from.resolution.dir === to.resolution.dir;
  return { bag: current.bag, from, to, noop };
}

function stripRepository(m: BagManifest): BagManifest {
  const { repository: _dropped, ...rest } = m;
  return rest;
}
