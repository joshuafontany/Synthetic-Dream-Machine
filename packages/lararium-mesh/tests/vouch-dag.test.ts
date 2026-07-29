/**
 * vouch-dag.test.ts — the feeder canonicalises every endpoint, connects a lineage across the DID/raw split,
 * caps the attack edge, and never severs a principal into two vertices.
 *
 * The load-bearing claim is the canonicalisation one: a joiner admitted under a raw-hex identity, who later
 * vouches under the SAME key wearing a `0x` DID form, must read as ONE vertex — otherwise the lineage
 * detaches from the seed and the score collapses. The rest guards the out-degree cap and the resolver.
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import {
  canonicalIdentity, inviteToVouchEdge, vouchDagFromInvites,
  signCabalInvite, rankLineage, type CabalInvite,
} from "../src/index.js";
import { hex } from "../src/crypto.js";

const seedOf   = (n: number) => new Uint8Array(32).fill(n);
const signer   = (seed: Uint8Array) => (b: Uint8Array) => ed.signAsync(b, seed).then(hex);
const pubOf    = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);
const LATER    = "2030-01-01T00:00:00Z";

async function invite(voucherDid: string, joinerIdentityHex: string, signSeed: Uint8Array): Promise<CabalInvite> {
  return signCabalInvite(
    { realmDocIdHex: "p".repeat(64), joinerIdentityHex, voucherDid, expiresAt: LATER },
    signer(signSeed),
  );
}

describe("canonicalIdentity folds the DID/raw split into one vertex", () => {
  test("a 0x-DID and the bare hex of the same key canonicalise equal", () => {
    const key = "ab".repeat(32);
    expect(canonicalIdentity(`0x${key}`)).toBe(key);
    expect(canonicalIdentity(key)).toBe(key);
    expect(canonicalIdentity(`0x${key}`)).toBe(canonicalIdentity(key));
  });

  test("case folds, and a non-key string fails LOUD rather than minting a ghost vertex", () => {
    expect(canonicalIdentity(`0X${"CD".repeat(32)}`)).toBe("cd".repeat(32));
    expect(() => canonicalIdentity("not-a-key")).toThrow(/not a canonicalisable/);
    expect(() => canonicalIdentity("did:key:z6MkExample")).toThrow(/did:key/);
  });
});

describe("a lineage connects ACROSS the identifier-form split — the whole point", () => {
  test("a joiner admitted as raw hex, later vouching as a 0x-DID, is ONE seed-rooted vertex", async () => {
    // seed → alice (alice admitted; her identity given raw). Then alice vouches bob — but her voucher DID
    // wears the 0x form. Canonicalisation must make alice-the-joiner and alice-the-voucher the same vertex.
    const seedKey  = await pubOf(seedOf(1));
    const aliceKey = await pubOf(seedOf(2));
    const bobKey   = await pubOf(seedOf(3));

    const admitAlice = await invite(`0x${seedKey}`, aliceKey, seedOf(1));      // seed vouches alice (raw target)
    const aliceVouchBob = await invite(`0x${aliceKey}`, bobKey, seedOf(2));    // alice vouches bob (0x source)

    const { edges } = vouchDagFromInvites([admitAlice, aliceVouchBob]);
    const rank = rankLineage(seedKey, edges, { epsilon: 0.15 });

    expect(rank.acyclic).toBe(true);
    // bob only carries score if the fold reached him THROUGH alice — i.e. alice's two forms unified.
    expect(rank.score.get(bobKey) ?? 0).toBeGreaterThan(0);
    expect(rank.score.get(aliceKey) ?? 0).toBeGreaterThan(0);
  });

  test("WITHOUT canonicalisation the same lineage would sever — proof the fix is load-bearing", async () => {
    // Build the edges by hand with the raw DID forms UN-canonicalised: alice-joiner = "<hex>",
    // alice-voucher = "0x<hex>". rankLineage sees two vertices; bob detaches from the seed.
    const seedKey  = await pubOf(seedOf(1));
    const aliceKey = await pubOf(seedOf(2));
    const bobKey   = await pubOf(seedOf(3));
    const severed = [
      { voucher: `0x${seedKey}`, joiner: aliceKey },       // seed → alice(raw)
      { voucher: `0x${aliceKey}`, joiner: bobKey },         // alice(0x) → bob  — different vertex!
    ];
    const rank = rankLineage(seedKey, severed, { epsilon: 0.15 });
    // seed is "0x…" here too, so even alice detaches; bob certainly gets nothing.
    expect(rank.score.get(bobKey) ?? 0).toBe(0);
  });
});

describe("the out-degree cap bounds the attack edge, and surfaces what it drops", () => {
  test("a voucher past the cap has its extra vouches turned away into `capped`, never dropped silently", async () => {
    const voucher = `0x${await pubOf(seedOf(7))}`;
    const invites = await Promise.all(
      [10, 11, 12, 13].map((n) => invite(voucher, `${n.toString(16).padStart(2, "0")}`.repeat(32), seedOf(7))),
    );
    const { edges, capped } = vouchDagFromInvites(invites, { maxVouchesPerVoucher: 2 });
    expect(edges).toHaveLength(2);
    expect(capped).toHaveLength(2);
    // conservation: every issued invite is either an edge or a capped record, never vanished
    expect(edges.length + capped.length).toBe(invites.length);
  });

  test("a rejecting cap value is refused rather than silently treated as unbounded", async () => {
    const inv = await invite(`0x${await pubOf(seedOf(7))}`, "aa".repeat(32), seedOf(7));
    expect(() => vouchDagFromInvites([inv], { maxVouchesPerVoucher: 0 })).toThrow(/> 0/);
  });
});

describe("the vouchKeyOf resolver enacts key-separation on the target", () => {
  test("a non-identity resolver maps a joiner into the identity it will vouch under", async () => {
    const joinKey  = "aa".repeat(32);
    const vouchKey = "bb".repeat(32);
    const inv = await invite(`0x${await pubOf(seedOf(7))}`, joinKey, seedOf(7));
    const edge = inviteToVouchEdge(inv, (j) => (j === joinKey ? vouchKey : j));
    expect(edge.joiner).toBe(vouchKey);   // the graph knows the joiner by its vouch-identity
  });
});
