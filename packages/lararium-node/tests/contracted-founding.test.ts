/**
 * contracted-founding — a vessel that founds under a root it does not hold.
 *
 * A Herm holds no human key, so it cannot sign its own binding. A trusted operator signs the edge on THEIR
 * vessel and the Herm carries it — bind-by-edge in its purest case, since such a vessel cannot cheat by
 * holding a seed. What matters here: the carried bundle FOUNDS, the founded vessel holds NO persona root of
 * its own, and every way the bundle could belong to somebody else REFUSES before anything stands.
 *
 * The refusals carry the weight. A contracted founding trusts a hand that is not present, so it verifies what
 * it carries rather than the hand that carried it.
 */
import { describe, expect, it } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import * as ed from "@noble/ed25519";
import {
  buildDeviceDelegation, mintPersonaInception, hex, type PersonaKelEvent,
} from "@lararium/mesh";
import { runFoundingCeremony } from "@lararium/keyhive";

const OPERATOR_SEED = new Uint8Array(32).fill(11);   // the CONTRACTING operator's persona root
const HERM_SEED     = new Uint8Array(32).fill(22);   // the faceless vessel's own device key
const HEARTH        = "bafyHermHearth";

const pubOf = (s: Uint8Array) => ed.getPublicKeyAsync(s).then(hex);

/** What the contracting operator hands over: the signed edge, the pinned prefix, and their KEL. */
async function bundleFor(deviceVerifyingKey: string, hearthTrueName = HEARTH) {
  const edge = await buildDeviceDelegation({
    personaRootSeed:       OPERATOR_SEED,          // the OPERATOR signs, elsewhere
    deviceVerifyingKey,
    hearthTrueName,
    issuedAt:  new Date("2026-07-20T00:00:00Z").toISOString(),
    expiresAt: new Date("2027-07-20T00:00:00Z").toISOString(),
    boundEpoch: 0,
  });
  const inception: PersonaKelEvent = mintPersonaInception(edge.personaRootDid, "");
  return { edge, personaKelPrefix: inception.prefix, personaKelChain: [inception] as const };
}

async function found(binding: Parameters<typeof runFoundingCeremony>[0]["binding"], deviceKey: string) {
  return runFoundingCeremony({
    repo: new Repo({ sharePolicy: async () => true }),
    vesselSeed: HERM_SEED,
    vesselVerifyingKey: deviceKey,
    vesselDisplayName: "herm",
    binding,
    hearthTrueName: HEARTH,
    nexusPubkey: deviceKey,
  });
}

describe("a contracted founding carries its binding instead of signing it", () => {
  it("FOUNDS under the operator's root, pinning THEIR prefix — this vessel signs nothing", async () => {
    const deviceKey = await pubOf(HERM_SEED);
    const b = await bundleFor(deviceKey);

    const f = await found({ mode: "contracted", ...b }, deviceKey);

    // the pin names the CONTRACTING operator, never this faceless vessel
    expect(f.personaKelPrefix).toBe(b.personaKelPrefix);
    expect(f.signerDid).toBe(b.edge.personaRootDid);
    expect(f.signerDid).not.toBe(`0x${deviceKey}`);
  });

  // The identifier derives DETERMINISTICALLY from the founding op-key, so one root yields one prefix in
  // either mode — that is the continuity anchor working, not a collision. The modes differ in what they can
  // SEAT: a self-stood founding mints exactly one inception, while a contracted one carries whatever chain
  // its operator has already walked, rotations and all. A vessel founding under a ROTATED operator is
  // precisely the case a fresh inception could never express.
  it("the prefix derives from the root either way; only CONTRACTED can seat a chain past inception", async () => {
    const deviceKey = await pubOf(HERM_SEED);
    const carried   = await bundleFor(deviceKey);

    const self = await found({ mode: "self-stood", signerSeed: OPERATOR_SEED }, deviceKey);
    expect(self.signerDid).toBe(carried.edge.personaRootDid);
    expect(self.personaKelPrefix).toBe(carried.personaKelPrefix);   // one root, one identifier

    // a carried chain of TWO events founds and keeps the same pinned prefix
    const rotated: PersonaKelEvent[] = [
      carried.personaKelChain[0]!,
      { ...carried.personaKelChain[0]!, seq: 1, eventCid: `${carried.personaKelChain[0]!.eventCid}-rot` },
    ];
    const contracted = await found({ mode: "contracted", ...carried, personaKelChain: rotated }, deviceKey);
    expect(contracted.personaKelPrefix).toBe(carried.personaKelPrefix);
  });

  // ── The refusals: a carried bundle must not found somebody else's vessel, or somebody else's hearth ──
  it("REFUSES an edge that delegates to a DIFFERENT device", async () => {
    const otherKey = await pubOf(new Uint8Array(32).fill(33));
    const b = await bundleFor(otherKey);                       // signed for a vessel that is not this one
    await expect(found({ mode: "contracted", ...b }, await pubOf(HERM_SEED)))
      .rejects.toThrow(/names a different device/);
  });

  it("REFUSES an edge that binds a DIFFERENT hearth true-name", async () => {
    const deviceKey = await pubOf(HERM_SEED);
    const b = await bundleFor(deviceKey, "bafySomeOtherHearth");
    await expect(found({ mode: "contracted", ...b }, deviceKey))
      .rejects.toThrow(/different hearth true-name/);
  });

  it("REFUSES an EMPTY chain, and one whose prefix disagrees with the pin", async () => {
    const deviceKey = await pubOf(HERM_SEED);
    const b = await bundleFor(deviceKey);

    await expect(found({ mode: "contracted", ...b, personaKelChain: [] }, deviceKey))
      .rejects.toThrow(/Binding Gate could not walk/);

    // a chain that walks to a DIFFERENT identifier than the one pinned would leave the gate reaching
    // for a head it can never find — refuse at founding, where it still costs nothing.
    await expect(found({ mode: "contracted", ...b, personaKelPrefix: "prefix-nobody-carries" }, deviceKey))
      .rejects.toThrow(/other than the pinned one/);
  });
});
