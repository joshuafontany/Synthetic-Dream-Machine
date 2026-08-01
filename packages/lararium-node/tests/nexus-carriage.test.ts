/**
 * nexus-membership.test.ts — the @nexus MEMBER-vs-STRANGER consult (the carry-split's member gate).
 *
 * Proven:
 *   · the PROVABLE-MEMBER FLOOR — a cross-operator whose resolved nym seats in the charter roster reads MEMBER,
 *     every other cross-operator reads STRANGER (the conservative kahu-as-member-floor; see the surfaced fork),
 *   · nym resolution reuses the antigen's proven bridge (`identifier.slice(-64)`, lowercased); an
 *     unauthenticated / malformed peer resolves to no nym → NOT a member,
 *   · FAIL CLOSED: no charter on disk → empty member set → NOBODY reads member (every cross-operator STRANGER),
 *   · refresh swaps the whole set when the charter seats.
 */
import { afterEach, beforeEach, describe, test, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as ed from "@noble/ed25519";
import { hex, genesisSealEpochCid, type NexusDoc } from "@lararium/mesh";
import { makeNexusMembership } from "../src/nexus-carriage.js";
import { writeNexusCharterDoc } from "../src/nexus-doc.js";

// Three founding kahu — fixed seeds → deterministic keys. The seated keys ARE the member floor.
const SEEDS = [new Uint8Array(32).fill(1), new Uint8Array(32).fill(2), new Uint8Array(32).fill(3)];
const pubOf = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);
// A non-kahu operator — a valid identity carrying no charter seat → a STRANGER under the kahu floor.
const STRANGER_SEED = new Uint8Array(32).fill(7);

async function seatedCharter(keys: string[]): Promise<NexusDoc> {
  return {
    kind: "lar-nexus-charter/v1", threshold: 2,
    sealEpochCid: genesisSealEpochCid(keys, 2),
    kahu: [
      { displayName: "Guru Joshua Fontany", verifyingKey: keys[0]! },
      { displayName: "Telarus, KSC",        verifyingKey: keys[1]! },
      { displayName: "The Lindwyrm",        verifyingKey: keys[2]! },
    ],
  };
}

describe("the provable-member floor — a seated-kahu peer reads MEMBER, all else STRANGER", () => {
  let bags: string;
  beforeEach(() => { bags = mkdtempSync(join(tmpdir(), "lares-nexus-membership-")); });
  afterEach(() => { rmSync(bags, { recursive: true, force: true }); });

  test("a cross-operator whose nym seats in the charter reads MEMBER; a non-kahu reads STRANGER", async () => {
    const keys     = await Promise.all(SEEDS.map(pubOf));
    const stranger = await pubOf(STRANGER_SEED);
    writeNexusCharterDoc(bags, await seatedCharter(keys));

    const peerMap = new Map<string, string>([
      ["peer-kahu",      `keyhive-prefix:${keys[0]!}`],           // Identifier suffix = a seated kahu key → MEMBER
      ["peer-kahu-upper", `X:${keys[1]!.toUpperCase()}`],          // case-folded on resolve → still MEMBER
      ["peer-stranger",  `prefix:${stranger}`],                   // valid identity, no seat → STRANGER
      ["peer-malformed", "short-not-64-hex"],                     // no nym → STRANGER
    ]);
    const { membership } = makeNexusMembership({ bagsDir: bags, peerIdentifierMap: peerMap });

    expect(membership.holdsCarriagePeer("peer-kahu")).toBe(true);
    expect(membership.holdsCarriagePeer("peer-kahu-upper")).toBe(true);
    expect(membership.holdsCarriagePeer("peer-stranger")).toBe(false);
    expect(membership.holdsCarriagePeer("peer-malformed")).toBe(false);
    expect(membership.holdsCarriagePeer("peer-absent")).toBe(false);   // unauthenticated → not named → STRANGER
  });

  test("FAIL CLOSED — no charter on disk → empty member set → every cross-operator STRANGER", async () => {
    const keys    = await Promise.all(SEEDS.map(pubOf));
    const peerMap = new Map<string, string>([["peer-kahu", `prefix:${keys[0]!}`]]);
    const { membership } = makeNexusMembership({ bagsDir: bags, peerIdentifierMap: peerMap });   // bags empty
    expect(membership.holdsCarriagePeer("peer-kahu")).toBe(false);
  });

  test("refresh swaps the member set when the charter seats", async () => {
    const keys    = await Promise.all(SEEDS.map(pubOf));
    const peerMap = new Map<string, string>([["peer-kahu", `prefix:${keys[0]!}`]]);
    const holder  = makeNexusMembership({ bagsDir: bags, peerIdentifierMap: peerMap });
    expect(holder.membership.holdsCarriagePeer("peer-kahu")).toBe(false);   // unseated → STRANGER

    writeNexusCharterDoc(bags, await seatedCharter(keys));
    holder.refresh();
    expect(holder.membership.holdsCarriagePeer("peer-kahu")).toBe(true);    // seated → MEMBER
  });
});
