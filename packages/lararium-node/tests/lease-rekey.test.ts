/**
 * lease-rekey.test.ts — the RE-KEY tooth: roll a resource's lease epoch on the live daemon board, per-writer-slot safe.
 *
 * Proofs:
 *   1. A single roll reads the effective (max) epoch and writes effective+1 into the CALLER's own slot.
 *   2. TWO CONCURRENT rolls (two forks of a common ancestor — a clean CRDT split) each land effective+1 in their OWN
 *      slot; on merge the max never decreases, even asymmetrically (the max-register property the immune keel leans on).
 *   3. REVERT-VERIFY: a bare shared scalar (the hazard the per-writer slot forbids) DROPS a higher concurrent value
 *      on merge — Automerge's LWW picks one writer, discarding the other, so the counter can walk BACKWARD.
 *
 * The concurrency model FORKS from a common ancestor (`clone`) — merging two independently-`init`'d docs is not a
 * clean CRDT merge (no shared history → whole-map conflicts), so the fork is what a real two-replica sync enacts.
 */
import { describe, test, expect, afterEach } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import { init as amInit, from as amFrom, clone as amClone, change as amChange, merge as amMerge, getConflicts, type Doc } from "@automerge/automerge";
import { emptyLarDoc, effectiveLeaseEpoch, leaseEpochPrefix, leaseEpochSlotUri, type LarDoc } from "@lararium/mesh";
import { rollLeaseEpochOnBoard } from "../src/lease-rekey.js";

const RESOURCE = "carriage-relay/crossroads-1";
const WRITER_A = "0x" + "aa".repeat(32);
const WRITER_B = "0x" + "bb".repeat(32);

/** Read the effective epoch off a board the way a reader (device-delegation) would. */
function effectiveOn(doc: LarDoc | undefined, resource: string): number {
  const prefix = leaseEpochPrefix(resource);
  const tids = doc?.tiddlers ?? {};
  const vals: (string | undefined)[] = [];
  for (const k of Object.keys(tids)) {
    if (k.startsWith(prefix)) vals.push((tids[k] as { tiddler?: { text?: string } })?.tiddler?.text);
  }
  return effectiveLeaseEpoch(vals);
}

/** A minimal DocHandle-shaped adapter over a raw Automerge doc — exercises `rollLeaseEpochOnBoard` off a fork. */
function rawHandle(initial: Doc<LarDoc>): { doc(): LarDoc; change(fn: (d: LarDoc) => void): void; readonly raw: Doc<LarDoc> } {
  let d = initial;
  return { doc: () => d, change: (fn) => { d = amChange(d, fn as (x: LarDoc) => void); }, get raw() { return d; } };
}

describe("lease-rekey — the RE-KEY tooth (per-writer-slot max-register)", () => {
  const repos: Repo[] = [];
  afterEach(async () => { for (const r of repos.splice(0)) await r.shutdown(); });
  function newRepo(): Repo { const r = new Repo({ sharePolicy: async () => true }); repos.push(r); return r; }

  test("a single roll writes effective+1 into the caller's OWN slot", () => {
    const repo = newRepo();
    const board = repo.create<LarDoc>(emptyLarDoc());
    const r = rollLeaseEpochOnBoard(board, RESOURCE, WRITER_A);
    expect(r.effective).toBe(0);
    expect(r.rolled).toBe(1);
    expect(r.slot).toBe(leaseEpochSlotUri(RESOURCE, WRITER_A));
    expect(effectiveOn(board.doc(), RESOURCE)).toBe(1);

    // A second roll by the same writer climbs to 2 (reads its own slot as the effective).
    const r2 = rollLeaseEpochOnBoard(board, RESOURCE, WRITER_A);
    expect(r2.effective).toBe(1);
    expect(r2.rolled).toBe(2);
    expect(effectiveOn(board.doc(), RESOURCE)).toBe(2);
  });

  test("two CONCURRENT rolls both land effective+1 in their own slots — the max never decreases", () => {
    // A common ancestor, forked into two replicas (the clean CRDT split a real two-hearth sync enacts).
    const base = amFrom(emptyLarDoc() as LarDoc);
    const hA = rawHandle(amClone(base));
    const hB = rawHandle(amClone(base));
    const ra = rollLeaseEpochOnBoard(hA, RESOURCE, WRITER_A);   // A's slot = 1
    const rb = rollLeaseEpochOnBoard(hB, RESOURCE, WRITER_B);   // B's slot = 1
    expect(ra.rolled).toBe(1);
    expect(rb.rolled).toBe(1);

    // Sync: merge B into A. Distinct slots → BOTH survive → effective stays 1 (never dropped to 0).
    const merged = rawHandle(amMerge(amClone(hA.raw), hB.raw));
    expect(effectiveOn(merged.doc(), RESOURCE)).toBe(1);

    // A rolls again post-merge: reads BOTH slots (1,1) → effective 1 → its own slot to 2. The max climbs.
    const ra2 = rollLeaseEpochOnBoard(merged, RESOURCE, WRITER_A);
    expect(ra2.effective).toBe(1);
    expect(ra2.rolled).toBe(2);
    expect(effectiveOn(merged.doc(), RESOURCE)).toBe(2);

    // ASYMMETRIC concurrency (the case a bare scalar DROPS): A stands at 2; a fresh fork rolls B once to 1; merging
    // it in must NOT pull the effective below 2. Distinct slots make it deterministic — a bare scalar would let LWW
    // discard A's higher 2 for B's 1 (this assertion catches exactly that revert).
    const hC = rawHandle(amClone(base));
    rollLeaseEpochOnBoard(hC, RESOURCE, WRITER_B);   // B's slot = 1, blind to A's 2
    const merged2 = rawHandle(amMerge(amClone(merged.raw), hC.raw));
    expect(effectiveOn(merged2.doc(), RESOURCE)).toBe(2);   // A's 2 survives — the max never walks backward
  });

  test("REVERT-VERIFY: a bare shared scalar DROPS a higher concurrent value (the hazard the slot-map forbids)", () => {
    // Model the reverted design: ONE shared scalar key per resource (no per-writer slot). Raw Automerge with
    // pinned actor ids so the LWW winner is deterministic. First find which actor LOSES a conflict on this key.
    const KEY = leaseEpochPrefix(RESOURCE) + "SCALAR";
    const writeScalar = (actor: string, value: number) =>
      amChange(amInit<Record<string, unknown>>(actor), (d) => { d[KEY] = String(value); });

    // Sentinel probe: distinct values reveal the LWW winner deterministically.
    let a = writeScalar("aaaaaaaa", 111);
    let b = writeScalar("bbbbbbbb", 222);
    const probe = amMerge(amMerge(amInit<Record<string, unknown>>(), a), b);
    const winnerIsB = probe[KEY] === "222";           // which actor's write survives the conflict
    const conflicts = getConflicts(probe, KEY as never);
    expect(conflicts && Object.keys(conflicts).length).toBe(2);   // a bare scalar keeps BOTH — it is NOT a max-register

    // Now assign the HIGHER epoch to the LOSING actor: the merge must discard it → the counter walks BACKWARD.
    a = writeScalar("aaaaaaaa", winnerIsB ? 9 : 1);   // loser gets 9 when B wins; else A(loser) gets 1…
    b = writeScalar("bbbbbbbb", winnerIsB ? 1 : 9);   // …winner gets the LOWER value, so max(9) is dropped
    const merged = amMerge(amMerge(amInit<Record<string, unknown>>(), a), b);
    const survivingEpoch = Number(merged[KEY]);
    expect(survivingEpoch).toBe(1);                   // the higher roll (9) was DROPPED — backward drop reproduced
    expect(survivingEpoch).toBeLessThan(9);
  });
});
