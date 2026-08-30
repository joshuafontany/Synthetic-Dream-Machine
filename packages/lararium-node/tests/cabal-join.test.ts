/**
 * cabal-join — the applicant crosses, or learns which gate refused. End-to-end through the node.
 *
 * THE LAST TEST CARRIES THE WEIGHT. `admitToRealm` takes a vouch DAG already folded, so the
 * per-voucher cap — the choke on how much mass one hand injects into a lineage — falls to whoever
 * assembled the edges. `admitOnLineage` folds inside the gate, where it cannot be left out. A door
 * onto the wrong one of those two passes every test here except that one.
 *
 * A refused applicant ANERGIZES: it stays at the floor, and nothing is written on either outcome.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as ed from "@noble/ed25519";
import { hex, hexToBytes, signCabalInvite, DEFAULT_JOIN_POLICY } from "@lararium/mesh";
import {
  generateOrLoadVesselIdentity, generateOrLoadPersonaGroupRoot, loadPersonaGroupRootVerifyingKey,
} from "../src/node-vessel-identity.js";
import { larDataDir } from "../src/vessel-paths.js";
import { runCabalVouch } from "../src/commands/cabal-vouch.js";
import { runCabalJoin, CabalJoinError } from "../src/commands/cabal-join.js";

let root: string;
let priorLarRoot: string | undefined;

const REALM = "a".repeat(64);
const OTHER_REALM = "d".repeat(64);
const NOW = Date.parse("2026-07-14T00:00:00Z");
const LATER = "2026-08-01T00:00:00Z";

const verify = (bytes: Uint8Array, sigHex: string, did: string) =>
  ed.verifyAsync(hexToBytes(sigHex), bytes, hexToBytes(did)).catch(() => false);

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), "lares-join-"));
  priorLarRoot = process.env["LAR_ROOT"];
  process.env["LAR_ROOT"] = root;
  await generateOrLoadVesselIdentity(larDataDir());
  await generateOrLoadPersonaGroupRoot(larDataDir());
});
afterEach(async () => {
  if (priorLarRoot === undefined) delete process.env["LAR_ROOT"];
  else process.env["LAR_ROOT"] = priorLarRoot;
  await new Promise((r) => setTimeout(r, 200));
  rmSync(root, { recursive: true, force: true });
});

/** A joiner nym this vessel does not hold — the crossing must never assume the applicant is local. */
async function foreignNym(seedByte: number): Promise<string> {
  const seed = new Uint8Array(32).fill(seedByte);
  return hex(await ed.getPublicKeyAsync(seed));
}

describe("cabal join — the crossing, and what it refuses", () => {
  it("admits a joiner the realm vouched for, and names the voucher the co-pay charges", async () => {
    const joiner = await foreignNym(7);
    await runCabalVouch({ joiner, realm: REALM, expiresAt: LATER }, NOW);

    const v = await runCabalJoin({ realm: REALM, applicant: joiner });

    expect(v.admitted).toBe(true);
    // The co-pay charges the hand that staked; an admission that forgot who vouched charges nobody.
    expect(v.voucherDid).toBe((await loadPersonaGroupRootVerifyingKey(larDataDir(), 0))?.toLowerCase());
  });

  it("refuses a joiner nobody vouched for — invite-only is the fail-closed default", async () => {
    const stranger = await foreignNym(8);
    const v = await runCabalJoin({ realm: REALM, applicant: stranger });

    expect(DEFAULT_JOIN_POLICY.kind).toBe("invite-only");
    expect(v.admitted).toBe(false);
    expect(v.refusal).toBe("no-invite");
  });

  it("★ a refusal ANERGIZES — the applicant stays at the floor and is never banned ★", async () => {
    const stranger = await foreignNym(9);
    await runCabalJoin({ realm: REALM, applicant: stranger });

    // Kapae takes a quorum. A ban on failed presentation would let any hand block a face by
    // presenting a bad invite in its name.
    const v = await runCabalJoin({ realm: REALM, applicant: stranger });
    expect(v.refusal).toBe("no-invite");
    expect(v.banned).toBeUndefined();
  });

  it("refuses an invite that names a different realm", async () => {
    const joiner = await foreignNym(10);
    await runCabalVouch({ joiner, realm: OTHER_REALM, expiresAt: LATER }, NOW);

    const v = await runCabalJoin({ realm: REALM, applicant: joiner });
    expect(v.admitted).toBe(false);
    expect(v.refusal).toBe("no-invite");   // none for THIS realm — the board is read per-realm
  });

  it("★ an invite is never BEARER — it names its joiner ★", async () => {
    const named = await foreignNym(11);
    const thief = await foreignNym(12);
    await runCabalVouch({ joiner: named, realm: REALM, expiresAt: LATER }, NOW);

    // The thief presents against a board that carries a valid invite — for somebody else.
    const v = await runCabalJoin({ realm: REALM, applicant: thief });
    expect(v.admitted).toBe(false);
    expect(v.refusal).toBe("no-invite");
  });

  it("refuses an invite whose vouch has lapsed — the realm rolled its fence past it", async () => {
    const joiner = await foreignNym(13);
    // Minted bound at the realm's genesis epoch, which is where a fresh realm stands.
    await runCabalVouch({ joiner, realm: REALM, expiresAt: LATER, boundEpoch: 0 }, NOW);

    // THE ROLL IS THE LAPSE, and it takes no clock. A reading that lapsed by timestamp could be
    // un-lapsed by the applicant's own machine, which is the one hand that must not hold the dial.
    const v = await runCabalJoin({ realm: REALM, applicant: joiner, epoch: 1 });
    expect(v.admitted).toBe(false);
    expect(v.refusal).toBe("expired");
  });

  it("refuses an invite signed by nobody the realm licenses", async () => {
    const joiner = await foreignNym(14);
    const impostorSeed = new Uint8Array(32).fill(99);
    const forged = await signCabalInvite(
      { realmDocIdHex: REALM, joinerIdentityHex: joiner, voucherDid: await foreignNym(15), expiresAt: LATER, boundEpoch: "0" },
      async (b: Uint8Array) => hex(await ed.signAsync(b, impostorSeed)),
    );
    expect(await verify(new Uint8Array(), forged.sig, forged.voucherDid)).toBe(false);

    const v = await runCabalJoin({ realm: REALM, applicant: joiner, invite: forged });
    expect(v.admitted).toBe(false);
    expect(v.refusal).toBe("bad-signature");
  });

  it("refuses before reading a board when the realm is not 64 hex", async () => {
    await expect(runCabalJoin({ realm: "not-a-realm", applicant: await foreignNym(16) }))
      .rejects.toBeInstanceOf(CabalJoinError);
  });

  it("★ the crossing folds the DAG ITSELF, so the per-voucher cap cannot be skipped ★", async () => {
    // `capped` exists only on the lineage shore — `admitToRealm` returns no such field.
    const joiner = await foreignNym(17);
    await runCabalVouch({ joiner, realm: REALM, expiresAt: LATER }, NOW);

    const v = await runCabalJoin({ realm: REALM, applicant: joiner, now: NOW, maxVouchesPerVoucher: 1 });

    // What the fold turned away rides back rather than vanishing, so a caller reads the budget spent
    // instead of trusting a graph that came back quietly shorter than the invites handed in.
    expect(v.capped).toBeDefined();
    expect(Array.isArray(v.capped)).toBe(true);
  });
});
