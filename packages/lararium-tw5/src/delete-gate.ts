/**
 * delete-gate — the wave-level deletion decision for the watcher (build 4,
 * moʻolelo ruling 2026-06-14). PURE: it compares, it never writes. The grace
 * window (~60s), durability, and the backup-before-tombstone write live in the
 * watcher; this layer splits a settled wave of vanished carriers into:
 *
 *   - RENAMES  — a delete whose last-projected synced-hash UNIQUELY matches a
 *                fresh add's disk-hash (git/rclone exact-rename discipline);
 *                the record re-links, it does not tombstone+recreate.
 *   - TOMBSTONES — confirmed removals (no unique rename match).
 *   - SUSPEND  — if the tombstone count exceeds a FRACTION of the bag's
 *                carriers, the whole wave suspends and surfaces, applying
 *                nothing (Unison confirmbigdel / Nextcloud bulk-delete brake;
 *                a `git checkout` unlink flood trips this).
 *
 * Ambiguity never guesses: a hash shared by more than one delete OR more than
 * one add re-links none of them — those deletes fall to tombstone (rclone's
 * decline-on-ambiguity). Renames are not losses, so they never count toward
 * the mass-delete brake.
 *
 * Meme: lar:///ha.ka.ba/@lares/v0.1/docs/lares/handoff (#watcher-talk-story)
 */

export interface PendingDelete {
  /** The carrier-root lar: URI gone from disk but present in the Synced tree. */
  readonly uri: string;
  /** Its last-projected canonical hash (the Synced tree value). */
  readonly syncedHash: string;
}

export interface FreshAdd {
  /** A new/changed carrier URI in the same settled wave. */
  readonly uri: string;
  /** Its disk hash. */
  readonly diskHash: string;
}

export interface RenameLink {
  readonly fromUri: string;
  readonly toUri: string;
}

export interface DeleteWaveInput {
  readonly deletes: readonly PendingDelete[];
  readonly adds: readonly FreshAdd[];
  /** Carriers the destination bag currently holds — the brake's denominator. */
  readonly liveCarrierCount: number;
  /** Operator dial in (0,1]: tombstones strictly above this fraction suspend the wave. */
  readonly massDeleteFraction: number;
}

export type DeleteWaveDecision =
  | { readonly kind: "apply"; readonly renames: readonly RenameLink[]; readonly tombstones: readonly string[] }
  | { readonly kind: "suspend"; readonly reason: string; readonly wouldTombstone: readonly string[] };

/** Group a list by a key, preserving order within each bucket. */
function groupBy<T>(xs: readonly T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) {
    const k = key(x);
    const bucket = m.get(k);
    if (bucket) bucket.push(x);
    else m.set(k, [x]);
  }
  return m;
}

export function decideDeletions(input: DeleteWaveInput): DeleteWaveDecision {
  const { deletes, adds, liveCarrierCount, massDeleteFraction } = input;

  const deletesByHash = groupBy(deletes, (d) => d.syncedHash);
  const addsByHash = groupBy(adds, (a) => a.diskHash);

  const renames: RenameLink[] = [];
  const renamedUris = new Set<string>();

  // A rename re-link fires ONLY on a unique hash match: exactly one pending
  // delete and exactly one fresh add sharing that hash. Any collision declines.
  for (const [hash, dels] of deletesByHash) {
    const matchedAdds = addsByHash.get(hash);
    if (dels.length === 1 && matchedAdds && matchedAdds.length === 1) {
      renames.push({ fromUri: dels[0]!.uri, toUri: matchedAdds[0]!.uri });
      renamedUris.add(dels[0]!.uri);
    }
  }

  const tombstones = deletes.map((d) => d.uri).filter((uri) => !renamedUris.has(uri));

  // Mass-delete brake: renames are moves, not losses — only tombstones count.
  const threshold = liveCarrierCount * massDeleteFraction;
  if (tombstones.length > threshold) {
    return {
      kind: "suspend",
      reason:
        `mass-delete brake: ${tombstones.length} tombstones exceed the fraction ` +
        `(${massDeleteFraction} of ${liveCarrierCount} carriers = ${threshold}); ` +
        `surfaced, nothing applied`,
      wouldTombstone: tombstones,
    };
  }

  return { kind: "apply", renames, tombstones };
}
