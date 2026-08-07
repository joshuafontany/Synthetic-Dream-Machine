/**
 * bag-home — WHERE a bag's bytes rest, as SELF-DESCRIBING DATA (operator-ruled 2026-08-07).
 *
 * A bag already declares two things about itself, and neither answers this one:
 *   · `CapTier`               — WHO may read it (veil ⊂ personagroup ⊂ contract ⊂ public).
 *   · `ResidencyTemperature`  — WHETHER it stands loaded (wela / anu).
 * Both leave the home open, and a single pair proves the axis stands apart: the canon memes and the Nexus
 * seal read as equally public, and they want OPPOSITE homes — one belongs in a tracked tree a clone carries,
 * the other must never enter one. No tier tells them apart, and no temperature does.
 *
 * ── THE THREE HOMES ──────────────────────────────────────────────────────────────────────────────
 *   · "repository" — rests in a CONFIGURED source-control repo. A clone carries it, its history is the
 *                    point, and a reviewer reads its diffs. Canon, memes, seeds.
 *   · "hearth"     — rests in PER-OPERATOR state. No clone carries it; the operator backs it up and hands
 *                    it on by their own act. Identity, the Nexus seal, the follow-graph, the persona names.
 *   · "ley"        — rests NOWHERE durable. It exists while the mesh carries it, and a vessel holds a
 *                    replica rather than an original. The DreamNet-synced planes.
 *
 * A Lar binds to a PLACE, never to a family: when the family moves, the Lar stays. `hearth` names that, and
 * the corpus reads as the family's luggage.
 *
 * ── FAIL-CLOSED TO HEARTH, AND THE ASYMMETRY IS THE POINT ────────────────────────────────────────
 * A bag declaring nothing — or declaring something torn — reads `hearth`. Of the three, only `hearth` can be
 * wrong quietly: a bag that should have ridden the repository merely fails to be shared, and an operator
 * notices. The other two fail LOUDLY in the directions that hurt — a mis-defaulted `repository` writes a
 * private thing into a tracked history that may already be pushed, and a mis-defaulted `ley` gives a durable
 * thing no durable home at all. So the default takes the recoverable failure.
 *
 * ── WHAT ENFORCES IT, AND WHAT DOES NOT ──────────────────────────────────────────────────────────
 * `resolveBagHomeDir` IS the enforcement: it holds the only mapping from a declared home to a directory, so a
 * caller that asks it where a bag lives cannot land the bag anywhere else. The bound, stated plainly: a
 * caller that JOINS ITS OWN PATH bypasses this module entirely and nothing here can stop it. That is exactly
 * how the Nexus seal came to sit inside a repository — a call site read `LAR_BAGS ?? join(root, "bags")` and
 * never asked. So this reads as a mechanism with a NAMED bypass rather than a guarantee, and the standing
 * discipline runs: a new bag asks this module for its directory, and a review of a hand-rolled `join(…bags…)`
 * asks why.
 *
 * `repository` additionally names a substrate this module cannot supply — a configured repo root. Absent one
 * the resolver REFUSES rather than guessing a tree, because guessing is the failure it exists to prevent.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/persona-policy
 */

/**
 * BagHome — the three resting places, as a closed union. No order rides here: unlike `CapTier`, these name
 * three DIFFERENT substrates rather than three points on one scale, and inventing a rank would invite a
 * `meet` that means nothing (what would "the more restrictive of repository and ley" name?).
 */
export type BagHome = "repository" | "hearth" | "ley";

/** Every home, for a surface that enumerates them. Alphabetical — the absence of an order, made visible. */
export const BAG_HOMES: readonly BagHome[] = ["hearth", "ley", "repository"] as const;

/**
 * The fail-closed DEFAULT. A bag that declares nothing rests per-operator, because that failure recovers and
 * the other two do not (see the module header). Isomorphic to `DEFAULT_CAP_TIER = "veil"`.
 */
export const DEFAULT_BAG_HOME: BagHome = "hearth";

/** Does a value read as a home? A narrowing guard, so a parse never widens a stray string into an axis. */
export function isBagHome(value: unknown): value is BagHome {
  return typeof value === "string" && (BAG_HOMES as readonly string[]).includes(value);
}

/**
 * Read a declared home, fail-closing any absent or torn value to `hearth`. Trims and case-folds, because a
 * human writes this into a manifest by hand and " Repository " names the same intent as "repository".
 */
export function parseBagHome(value: unknown): BagHome {
  if (typeof value !== "string") return DEFAULT_BAG_HOME;
  const folded = value.trim().toLowerCase();
  return isBagHome(folded) ? folded : DEFAULT_BAG_HOME;
}

/** Where each home resolves to on this vessel. A caller supplies the roots it actually stands. */
export interface BagHomeRoots {
  /** The CONFIGURED source-control repo root. Absent → `repository` refuses rather than guessing a tree. */
  readonly repository?: string | undefined;
  /** The per-operator state home — always present on a vessel that stands at all. */
  readonly hearth: string;
}

/** What a resolve came back with: a directory, or the reason no directory stands. */
export type BagHomeResolution =
  | { readonly ok: true;  readonly home: BagHome; readonly dir: string }
  | { readonly ok: false; readonly home: BagHome; readonly why: string };

/**
 * Resolve a bag's declared home to a directory — the ONE mapping, and the module's whole enforcement.
 *
 * `repository` REFUSES when no repo root stands configured. A default would have to invent a tree, and
 * inventing a tree is precisely the failure this axis exists to prevent: a private thing landing in a
 * history somebody may already have pushed. An honest refusal costs a caller one branch and costs nobody a
 * leaked artifact.
 *
 * `ley` resolves to NO directory by construction rather than by omission. A plane that exists while the mesh
 * carries it has no durable local original, and handing back a path would invite a caller to write one — so
 * the refusal here reads as the model speaking, never as a gap.
 */
export function resolveBagHomeDir(home: BagHome, roots: BagHomeRoots): BagHomeResolution {
  switch (home) {
    case "hearth":
      return { ok: true, home, dir: roots.hearth };
    case "repository":
      return roots.repository
        ? { ok: true, home, dir: roots.repository }
        : { ok: false, home, why: "no source-control repo stands configured — declare one, or home this bag at the hearth" };
    case "ley":
      return { ok: false, home, why: "a ley bag rests nowhere durable — it lives while the mesh carries it, so it has no local directory" };
  }
}

/**
 * Does this home rest on disk at all? `ley` alone does not, and a caller that persists bytes asks this
 * before reaching for a path.
 */
export function bagHomeRestsOnDisk(home: BagHome): boolean {
  return home !== "ley";
}

/**
 * Would a CLONE of the source-control repo carry this bag? Only `repository` — and the question earns its own
 * function because it names the operator-facing meaning of the whole axis. A Nexus belongs to the operators
 * who founded it, never to whoever copied the code; asking this is how a caller checks it holds that line.
 */
export function bagHomeTravelsWithAClone(home: BagHome): boolean {
  return home === "repository";
}
