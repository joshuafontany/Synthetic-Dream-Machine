/**
 * face-join — the gate that decides who reaches the group key.
 *
 * The edges here get SIGNED for real (`buildDeviceDelegation`), so a refusal proves the crypto refused and
 * never that a stub returned false. The provider stands as a recording fake: this file fences the DECISION —
 * which summons earns a seat, which gets turned away, and whether a repeat re-keys — and leaves keyhive's own
 * CGKA behaviour to keyhive's tests.
 */
import { describe, test, expect } from "vitest";
import { buildDeviceDelegation } from "@lararium/mesh";
import { runFaceJoin, gateFaceJoin, type FaceJoinProvider, type FaceJoinContext } from "../src/face-join.js";

const FOUNDER_SEED = new Uint8Array(32).fill(7);
const OTHER_SEED   = new Uint8Array(32).fill(9);
const JOINEE_KEY   = "6".repeat(64);
const HEARTH       = "bafkreift7cvcpxxqusdb4lkxsxnt3mzv5uip6tpytinrh7ibgrvu7ceqwa";
const NOW          = Date.parse("2026-08-16T12:00:00.000Z");

/** The identifier a card derives ends in the raw verifying key — the relationship the Binding Gate leans on. */
const cardIdFor = (key: string) => `0x${key}`;

async function edgeFor(opts: { seed?: Uint8Array; key?: string; hearth?: string; expiresAt?: string } = {}) {
  return buildDeviceDelegation({
    personaRootSeed:    opts.seed ?? FOUNDER_SEED,
    deviceVerifyingKey: opts.key  ?? JOINEE_KEY,
    hearthTrueName:     opts.hearth ?? HEARTH,
    issuedAt:           "2026-08-16T11:00:00.000Z",
    expiresAt:          opts.expiresAt ?? "2026-09-16T11:00:00.000Z",
    boundEpoch:         0,
  });
}

interface Calls { received: number; added: string[]; events: number; regranted: string[] }

function fakeProvider(opts: { seated?: boolean; cardId?: string } = {}): FaceJoinProvider & { calls: Calls } {
  const calls: Calls = { received: 0, added: [], events: 0, regranted: [] };
  return {
    calls,
    async receiveContactCard() { calls.received++; return { id: opts.cardId ?? cardIdFor(JOINEE_KEY) }; },
    async verifySentinelMembership() { return opts.seated ? { ok: true } : { ok: false, reason: "no access" }; },
    async addSentinelMember(member, doc) { calls.added.push(`${member}@${doc}`); },
    async delegate(a) { calls.regranted.push(a.bagUrl); return {}; },
    async eventsForPeer() { calls.events++; return [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])]; },
    async contactCard() { return new TextEncoder().encode('{"founder":"card"}'); },
  };
}

async function ctxFor(): Promise<FaceJoinContext> {
  const own = await edgeFor();
  return {
    personaRootDid:       own.personaRootDid,
    hearthTrueName:       HEARTH,
    personaGroupDocIdHex: "ab".repeat(16),
    personaGroupAgentIdHex: "cd".repeat(16),
    leaseEpoch:           0,          // an unfed resource — the epoch a founding's grants bind to
    now:                  NOW,
  };
}

const summons = (deviceEdge: Awaited<ReturnType<typeof edgeFor>>, force?: boolean) =>
  ({ kind: "face-join/v1" as const, contactCard: '{"joinee":"card"}', deviceEdge, ...(force !== undefined ? { force } : {}) });

describe("the gate — a signature, never a list", () => {
  test("an edge this root signed, for this hearth, naming this card → admitted", async () => {
    const ctx = await ctxFor();
    const out = await runFaceJoin(fakeProvider(), summons(await edgeFor()), ctx);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.grant.capEvents).toHaveLength(2);
    expect(out.grant.founderCard).toBe('{"founder":"card"}');
    expect(out.grant.reKeyed).toBe(true);
  });

  test("an edge signed by ANOTHER root → refused, and nothing enters local state", async () => {
    const ctx = await ctxFor();
    const p   = fakeProvider();
    const out = await runFaceJoin(p, summons(await edgeFor({ seed: OTHER_SEED })), ctx);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toMatch(/pinned root|edge refused/i);
    expect(p.calls.received).toBe(0);   // the card never reached the provider
    expect(p.calls.added).toEqual([]);
  });

  test("an edge bound to a DIFFERENT hearth → refused before the card is read", async () => {
    const ctx = await ctxFor();
    const p   = fakeProvider();
    const out = await runFaceJoin(p, summons(await edgeFor({ hearth: "bafkreiOTHERPLACE" })), ctx);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toMatch(/different hearth/i);
    expect(p.calls.received).toBe(0);
  });

  test("an EXPIRED edge → refused", async () => {
    const ctx = await ctxFor();
    const out = await runFaceJoin(
      fakeProvider(),
      summons(await edgeFor({ expiresAt: "2026-08-16T11:30:00.000Z" })),
      ctx,
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toMatch(/expired/i);
  });

  test("a VALID edge presented with somebody ELSE'S card → refused, and no seat is granted", async () => {
    const ctx = await ctxFor();
    // The card resolves to a different key than the edge licenses — the impersonation this binding exists for.
    const p   = fakeProvider({ cardId: cardIdFor("a".repeat(64)) });
    const out = await runFaceJoin(p, summons(await edgeFor()), ctx);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toMatch(/different key/i);
    expect(p.calls.added).toEqual([]);   // received, but never seated
  });

  test("a summons carrying no edge → refused, never thrown", async () => {
    const ctx = await ctxFor();
    const out = await runFaceJoin(fakeProvider(), { kind: "face-join/v1", contactCard: "{}", deviceEdge: undefined as never }, ctx);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toMatch(/no device-delegation/i);
  });

  test("a grant bound BELOW the resource's lease epoch reads stale — the lease decides, not the clock", async () => {
    const ctx = await ctxFor();
    // The wall clock still reads inside the window; only the max-register moved. A gate that consulted the
    // clock alone would admit this, resting the decision on each device's own narration of "now".
    const rolled = { ...ctx, leaseEpoch: 3 };
    const p   = fakeProvider();
    const out = await runFaceJoin(p, summons(await edgeFor()), rolled);   // the edge binds epoch 0
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toMatch(/lease stale|epoch rolled/i);
    expect(p.calls.received).toBe(0);
  });

  test("a lease that has NOT rolled admits the same edge — staleness, never mere age", async () => {
    const ctx = await ctxFor();
    const out = await runFaceJoin(fakeProvider(), summons(await edgeFor()), { ...ctx, leaseEpoch: 0 });
    expect(out.ok).toBe(true);
  });

  test("gateFaceJoin runs its edge checks with no card at all", async () => {
    const ctx = await ctxFor();
    await expect(gateFaceJoin({ edge: await edgeFor(), ctx })).resolves.toEqual({ ok: true });
  });
});

describe("the re-grant — a seat that reaches what the group already held", () => {
  test("a fresh seat re-points the group's existing bags, AFTER the add", async () => {
    const ctx = { ...(await ctxFor()), regrant: [
      { bagUrl: "lar:///ha.ka.ba/bags/@catalog", access: "admin" as const },
      { bagUrl: "lar:///ha.ka.ba/bags/@persona", access: "admin" as const },
    ] };
    const p   = fakeProvider();
    const out = await runFaceJoin(p, summons(await edgeFor()), ctx);
    expect(out.ok).toBe(true);
    expect(p.calls.regranted).toEqual(["lar:///ha.ka.ba/bags/@catalog", "lar:///ha.ka.ba/bags/@persona"]);
    expect(p.calls.added).toHaveLength(1);
  });

  test("an already-seated device re-grants NOTHING — no seat moved, no epoch moved", async () => {
    const ctx = { ...(await ctxFor()), regrant: [{ bagUrl: "lar:///ha.ka.ba/bags/@catalog", access: "admin" as const }] };
    const p   = fakeProvider({ seated: true });
    await runFaceJoin(p, summons(await edgeFor()), ctx);
    expect(p.calls.regranted).toEqual([]);
  });

  test("a REFUSED summons re-grants nothing", async () => {
    const ctx = { ...(await ctxFor()), regrant: [{ bagUrl: "lar:///ha.ka.ba/bags/@catalog", access: "admin" as const }] };
    const p   = fakeProvider();
    await runFaceJoin(p, summons(await edgeFor({ seed: OTHER_SEED })), ctx);
    expect(p.calls.regranted).toEqual([]);
  });
});

describe("the repeat — membership lives founder-side", () => {
  test("an already-seated device gets its events back with NO re-key", async () => {
    const ctx = await ctxFor();
    const p   = fakeProvider({ seated: true });
    const out = await runFaceJoin(p, summons(await edgeFor()), ctx);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.grant.reKeyed).toBe(false);
    expect(p.calls.added).toEqual([]);          // the group epoch never moved
    expect(out.grant.capEvents).toHaveLength(2); // and it still recovers its material
  });

  test("a device whose group was RE-FOUNDED holds no seat → the add genuinely runs", async () => {
    const ctx = await ctxFor();
    const p   = fakeProvider({ seated: false });
    const out = await runFaceJoin(p, summons(await edgeFor()), ctx);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.grant.reKeyed).toBe(true);
    expect(p.calls.added).toEqual([`${cardIdFor(JOINEE_KEY)}@${ctx.personaGroupDocIdHex}`]);
  });

  test("force re-keys a seated device — the answer to a suspected-but-unrevoked key", async () => {
    const ctx = await ctxFor();
    const p   = fakeProvider({ seated: true });
    const out = await runFaceJoin(p, summons(await edgeFor(), true), ctx);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.grant.reKeyed).toBe(true);
    expect(p.calls.added).toHaveLength(1);
  });

  test("force NEVER lifts the gate — an unlicensed edge stays refused", async () => {
    const ctx = await ctxFor();
    const p   = fakeProvider({ seated: true });
    const out = await runFaceJoin(p, summons(await edgeFor({ seed: OTHER_SEED }), true), ctx);
    expect(out.ok).toBe(false);
    expect(p.calls.added).toEqual([]);
  });
});
