/**
 * re-anchoring — the record that carries THAT it happened and refuses to carry what made it valid.
 *
 * These pin the properties the design turns on, and each one pins a REFUSAL as hard as an ability: no
 * threshold, no completeness, no enumeration, no clock. A later hand reading these should find the omissions
 * asserted rather than merely absent.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/re-anchoring-record
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import {
  RE_ANCHORING_DOMAIN, reAnchoringBytes, signAttestation, reAnchoringKey,
  writeReAnchoring, reAnchoringsFromBoard, verifiedAttestors, dwellingHistory,
  type ReAnchoring, type Attestation,
} from "../src/re-anchoring.js";
import { hex, hexToBytes } from "../src/crypto.js";
import { emptyLarDoc } from "../src/base-doc.js";

const seedOf  = (n: number) => new Uint8Array(32).fill(n);
const signer  = (s: Uint8Array) => (b: Uint8Array) => ed.signAsync(b, s).then(hex);
const pubOf   = (s: Uint8Array) => ed.getPublicKeyAsync(s).then(hex);
const verify  = (b: Uint8Array, sig: string, did: string) =>
  ed.verifyAsync(hexToBytes(sig), b, hexToBytes(did)).catch(() => false);

const REALM   = "realm-amorphous";
const DWELLER = "dweller-1";
/** A chain the reader can walk. `null` reads unknown — an epochCid nobody minted, or one from elsewhere. */
const chain = (m: Record<string, number>) => (e: string) => m[e] ?? null;

const subject = (epochCid: string) =>
  ({ kind: RE_ANCHORING_DOMAIN, dweller: DWELLER, realm: REALM, epochCid }) as const;

async function record(epochCid: string, attestorSeeds: number[]): Promise<ReAnchoring> {
  const s = subject(epochCid);
  const attestors: Attestation[] = [];
  for (const n of attestorSeeds) {
    attestors.push(await signAttestation(s, await pubOf(seedOf(n)), signer(seedOf(n))));
  }
  return { ...s, attestors };
}

const emptyDoc = emptyLarDoc;

describe("the attestor set carries no threshold — the reader decides", () => {
  test("★ ONE attestor is representable, and reads as the dyad it is ★", async () => {
    // Refusing a single attestor here would bake a quorum this layer must not hold. The dyad is the
    // failure mode; naming it is the reader's job, and the record's job is to make it VISIBLE.
    const solo = await record("e1", [7]);
    expect(await verifiedAttestors(solo, verify)).toHaveLength(1);
  });

  test("the count comes back, and NO verdict rides with it", async () => {
    const three = await record("e1", [7, 8, 9]);
    const held  = await verifiedAttestors(three, verify);
    expect(held).toHaveLength(3);
    // What the module does NOT return: any boolean about sufficiency. The shape itself is the assertion.
    expect(Object.keys({ held })).toEqual(["held"]);
  });

  test("each attestor signs INDEPENDENTLY — a set may grow without invalidating what already signed", async () => {
    const two   = await record("e1", [7, 8]);
    const later = await signAttestation(subject("e1"), await pubOf(seedOf(9)), signer(seedOf(9)));
    const grown: ReAnchoring = { ...two, attestors: [...two.attestors, later] };
    // The earlier two still verify — their marks never depended on who else marked.
    expect(await verifiedAttestors(grown, verify)).toHaveLength(3);
  });

  test("the set is UNORDERED — the same marks in any order fold identically", async () => {
    const r  = await record("e1", [7, 8, 9]);
    const rev: ReAnchoring = { ...r, attestors: [...r.attestors].reverse() };
    expect((await verifiedAttestors(rev, verify)).sort()).toEqual((await verifiedAttestors(r, verify)).sort());
  });

  test("an attestor's mark holds a key and a signature — and carries no weight, role or rank", async () => {
    // A mark that could carry a role would let a minter grade its own witnesses. The shape refuses it.
    const r = await record("e1", [7]);
    expect(Object.keys(r.attestors[0]!).sort()).toEqual(["attestor", "sig"]);
  });

  test("a FORGED mark drops and the record still stands — a forgery never strengthens, never breaks", async () => {
    const r = await record("e1", [7, 8]);
    const forged: ReAnchoring = {
      ...r,
      attestors: [...r.attestors, { attestor: await pubOf(seedOf(9)), sig: "00".repeat(64) }],
    };
    expect(await verifiedAttestors(forged, verify)).toHaveLength(2);
  });

  test("one attestor marking twice counts ONCE — re-marking buys no weight", async () => {
    const r = await record("e1", [7]);
    const doubled: ReAnchoring = { ...r, attestors: [...r.attestors, ...r.attestors] };
    expect(await verifiedAttestors(doubled, verify)).toHaveLength(1);
  });
});

describe("the record refuses what the ruling forbids", () => {
  test("★ the signed subject holds the dweller, the realm and the POSITION — and nothing else ★", async () => {
    // What a validating field would look like if one ever crept in, and the assertion that keeps it out.
    const parsed = JSON.parse(new TextDecoder().decode(reAnchoringBytes(subject("e1"))));
    expect(Object.keys(parsed).sort()).toEqual(["dweller", "epochCid", "kind", "realm"]);
    for (const forbidden of ["method", "rite", "quorum", "minAttestors", "waitingPeriod", "test", "franchise"]) {
      expect(parsed).not.toHaveProperty(forbidden);
    }
  });

  test("no wall clock rides anywhere — the position is a chain epochCid", async () => {
    const r = await record("e1", [7]);
    const wire = JSON.stringify(r);
    expect(wire).not.toMatch(/\b(timestamp|issuedAt|expiresAt|createdAt|notBefore|notAfter)\b/);
    expect(typeof r.epochCid).toBe("string");
  });

  test("an EXTRA field on the wire drops at the floor rather than riding through", async () => {
    const doc = emptyDoc();
    const r   = await record("e1", [7]);
    const smuggled = { ...r, method: "three-elders-and-a-fire", quorum: 2 };
    const key = reAnchoringKey(DWELLER, REALM, "e1");
    doc.tiddlers[key] = { id: key, tiddler: { title: key, text: JSON.stringify(smuggled) } } as never;
    const back = reAnchoringsFromBoard(doc)[0]!;
    // The EXACT key-set, asserted — because naming forbidden fields only guards the ones already imagined,
    // and the field that arrives is the one nobody predicted. This is the belt; the named refusals below are
    // the suspenders. (`carriage-board` holds the same pair for the same reason.)
    expect(Object.keys(back).sort()).toEqual(["attestors", "dweller", "epochCid", "kind", "realm"]);
    expect(back).not.toHaveProperty("method");
    expect(back).not.toHaveProperty("quorum");
  });
});

describe("the fold answers does-this-one-hold, never who-holds", () => {
  test("★ the history reads ONE named dweller — the caller supplies the name, the board holds no list ★", async () => {
    const doc = emptyDoc();
    const mine   = await record("e1", [7, 8]);
    const other: ReAnchoring = { ...(await record("e1", [7])), dweller: "someone-else" };
    writeReAnchoring(doc, mine);
    writeReAnchoring(doc, other);

    const h = await dwellingHistory(doc, DWELLER, REALM, verify, chain({ e1: 1 }));
    expect(h).toHaveLength(1);
    expect(h[0]!.attestors).toHaveLength(2);
    // There is no call that would return BOTH dwellers — the shape offers no such reach.
  });

  test("history rides the CHAIN, and arrival order never decides it", async () => {
    const order = chain({ e1: 1, e2: 2, e3: 3 });
    const doc = emptyDoc();
    writeReAnchoring(doc, await record("e3", [9]));
    writeReAnchoring(doc, await record("e1", [7]));
    writeReAnchoring(doc, await record("e2", [8]));
    const h = await dwellingHistory(doc, DWELLER, REALM, verify, order);
    expect(h.map((x) => x.epochCid)).toEqual(["e1", "e2", "e3"]);
  });

  test("a re-anchoring at a LATER epochCid lands BESIDE its predecessor — the board holds acts, not state", async () => {
    const doc = emptyDoc();
    writeReAnchoring(doc, await record("e1", [7]));
    writeReAnchoring(doc, await record("e2", [8]));
    // A dwelling that lapsed and re-anchored reads as TWO acts, never one edited state.
    expect(await dwellingHistory(doc, DWELLER, REALM, verify, chain({ e1: 1, e2: 2 }))).toHaveLength(2);
  });

  test("an UNATTESTED record deposits nothing — a record nobody witnessed carries no depth", async () => {
    const doc = emptyDoc();
    const unwitnessed: ReAnchoring = { ...subject("e1"), attestors: [] };
    writeReAnchoring(doc, unwitnessed);
    expect(await dwellingHistory(doc, DWELLER, REALM, verify, chain({ e1: 1 }))).toHaveLength(0);
  });

  test("an EMPTY board yields no dwellings — absence reads as absence, never as refusal", async () => {
    // Under no-global-now a withheld record and an unsynced one generate identically. Nothing here may
    // report that as a verdict about anyone.
    expect(await dwellingHistory(emptyDoc(), DWELLER, REALM, verify, chain({}))).toEqual([]);
  });
});
