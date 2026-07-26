/**
 * persona-petname.test — the two-layer pet-names over the isomorphic persona core (#64 stage 4).
 *
 * The PRIVATE own-persona label map (never federates), the multitude-view over the whole self, and the
 * PUBLIC persona-index → HandleCard.glamour → board wire. All platform-blind in @lararium/mesh; the node/
 * browser adapters supply the same shapes over their own storage.
 */
import { describe, test, expect } from "vitest";
import {
  generateOrLoadPersonaRoot,
  renameOwnPersona, clearOwnPersonaPetname, ownPersonaPetname, personaMultitudeView,
  mintPersonaGlamour, publishPersonaGlamour, publicHandleViewOf,
  verifyHandleCard, readHandleAnnounces, acceptHandleUpdate, handleCardId,
  type PersonaVault, type ActivePersonaStore, type AnchorStore, type KeypairStore,
  type KeypairCrypto, type PersistedKeypair, type IdentityAnchors,
  type OwnPersonaPetnameStore, type OwnPublicHandleStore, type PersonaPublicHandleRecord,
  type LarDoc,
} from "../src/index.js";
import * as ed25519 from "@noble/ed25519";

// An ed25519 KeypairCrypto over @noble — each generate() mints a distinct pair, hex-encoded.
const memCrypto: KeypairCrypto = {
  async generate(): Promise<PersistedKeypair> {
    const priv = crypto.getRandomValues(new Uint8Array(32));
    const pub = await ed25519.getPublicKeyAsync(priv);
    return { signingKey: Buffer.from(priv).toString("hex"), verifyingKey: Buffer.from(pub).toString("hex") };
  },
};

/** A wholly in-memory PersonaVault — enough for the multitude-view (roots + anchors + selector). */
function makeInMemoryVault(): PersonaVault {
  const roots = new Map<number, PersistedKeypair>();
  const anchorsMap = new Map<number, IdentityAnchors>();
  let worn: number | undefined;
  const selector: ActivePersonaStore = { async load() { return worn; }, async save(i) { worn = i; } };
  const anchors: AnchorStore = {
    load: (i) => anchorsMap.get(i) ?? null,
    save: (i, a) => { anchorsMap.set(i, a); },
    list: () => [...anchorsMap.keys()].sort((a, b) => a - b),
  };
  return {
    rootSlot(i): KeypairStore {
      return { async load() { return roots.get(i); }, async save(kp) { roots.set(i, kp); } };
    },
    async listRoots() { return [...roots.keys()].sort((a, b) => a - b); },
    async hasRoot(i) { return roots.has(i); },
    selector, anchors, recovery: null,
  };
}

/** A Map-backed OwnPersonaPetnameStore. */
function makeInMemoryPetnameStore(): OwnPersonaPetnameStore & { spy: Map<number, string> } {
  const m = new Map<number, string>();
  return {
    spy: m,
    async get(i) { return m.get(i); },
    async set(i, p) { m.set(i, p); },
    async clear(i) { m.delete(i); },
    async entries() { return [...m.entries()].sort((a, b) => a[0] - b[0]); },
  };
}

/** A Map-backed OwnPublicHandleStore. */
function makeInMemoryPublicStore(): OwnPublicHandleStore {
  const m = new Map<number, PersonaPublicHandleRecord>();
  return {
    async load(i) { return m.get(i) ?? null; },
    async save(r) { m.set(r.handleIndex, r); },
    async list() { return [...m.keys()].sort((a, b) => a - b); },
  };
}

/** A fake WHO board — a DocHandle just enough for announceToWhoFace (change() over an in-memory LarDoc). */
function makeFakeBoard(): { doc(): LarDoc; change(fn: (d: LarDoc) => void): void } {
  const d: LarDoc = { tiddlers: {} } as LarDoc;
  return { doc: () => d, change: (fn) => fn(d) };
}

const SEED = Uint8Array.from(Array.from({ length: 32 }, (_, i) => (i * 5 + 1) & 0xff));

describe("persona-petname — the PRIVATE own-persona label (#64 stage 4)", () => {
  test("rename sets a private label; clear drops it; a blank rename is refused", async () => {
    const store = makeInMemoryPetnameStore();
    await renameOwnPersona(store, 0, "work");
    await renameOwnPersona(store, 2, "  the-guru  ");   // trimmed
    expect(await ownPersonaPetname(store, 0)).toBe("work");
    expect(await ownPersonaPetname(store, 2)).toBe("the-guru");

    await expect(renameOwnPersona(store, 0, "   ")).rejects.toThrow(/empty pet-name/);
    expect(await ownPersonaPetname(store, 0)).toBe("work");   // the refused blank never erased the label

    await clearOwnPersonaPetname(store, 0);
    expect(await ownPersonaPetname(store, 0)).toBeUndefined();
  });

  test("an out-of-range index is refused (SLIP-0010 hardened ceiling)", async () => {
    const store = makeInMemoryPetnameStore();
    await expect(renameOwnPersona(store, 0x80000000, "x")).rejects.toThrow(/out of range/);
  });
});

describe("persona-petname — the MULTITUDE-VIEW (#64 stage 4)", () => {
  test("enumerates the whole self: held roots, anchored joinee-faces, named + federated indices", async () => {
    const vault = makeInMemoryVault();
    const petnames = makeInMemoryPetnameStore();
    const publicStore = makeInMemoryPublicStore();

    await generateOrLoadPersonaRoot(vault, memCrypto, 0);   // a held root (founder face)
    await generateOrLoadPersonaRoot(vault, memCrypto, 1);
    vault.anchors.save(3, {                                  // a joinee-face: anchored, no root
      personaGroupDocIdHex: "a3".repeat(32), meshCabalDocIdHex: "b3".repeat(32), personaGroupAgentIdHex: "c3".repeat(32),
    });
    await renameOwnPersona(petnames, 0, "work");
    await renameOwnPersona(petnames, 3, "the-joinee");
    // Persona 0 federates a public glamour.
    await publishPersonaGlamour({
      board: makeFakeBoard(), seed: SEED, handleIndex: 0, glamour: "Guru-Josh", now: 1000, store: publicStore,
    });

    const view = await personaMultitudeView(vault, petnames, publicHandleViewOf(publicStore));
    const byIndex = Object.fromEntries(view.map((e) => [e.handleIndex, e]));

    expect(view.map((e) => e.handleIndex)).toEqual([0, 1, 3]);   // union, ascending
    expect(byIndex[0]).toMatchObject({ petname: "work", heldHere: true, hasPublicHandle: true, glamour: "Guru-Josh" });
    expect(byIndex[1]).toMatchObject({ petname: null, heldHere: true, hasPublicHandle: false, glamour: null });
    expect(byIndex[3]).toMatchObject({ petname: "the-joinee", heldHere: false, hasPublicHandle: false, glamour: null });
  });

  test("PRIVATE-all / PUBLIC-one: the human's pool sees every persona; only the federated one carries a glamour", async () => {
    const vault = makeInMemoryVault();
    const petnames = makeInMemoryPetnameStore();
    const publicStore = makeInMemoryPublicStore();
    await generateOrLoadPersonaRoot(vault, memCrypto, 0);
    await generateOrLoadPersonaRoot(vault, memCrypto, 1);
    await generateOrLoadPersonaRoot(vault, memCrypto, 2);
    await publishPersonaGlamour({ board: makeFakeBoard(), seed: SEED, handleIndex: 1, glamour: "The-Face", now: 1, store: publicStore });

    const view = await personaMultitudeView(vault, petnames, publicHandleViewOf(publicStore));
    expect(view.filter((e) => e.heldHere)).toHaveLength(3);                  // the private pool sees all N
    expect(view.filter((e) => e.hasPublicHandle).map((e) => e.handleIndex)).toEqual([1]);  // ONE face out
  });

  test("no public view → every persona reads private-only (no glamour leaks)", async () => {
    const vault = makeInMemoryVault();
    const petnames = makeInMemoryPetnameStore();
    await generateOrLoadPersonaRoot(vault, memCrypto, 0);
    await renameOwnPersona(petnames, 0, "secret");
    const view = await personaMultitudeView(vault, petnames);
    expect(view).toEqual([{ handleIndex: 0, petname: "secret", heldHere: true, hasPublicHandle: false, glamour: null }]);
  });
});

describe("persona-petname — the pet-name NEVER FEDERATES (#64 stage 4)", () => {
  test("the private label never rides onto the board; the glamour is a distinct, chosen display", async () => {
    const petnames = makeInMemoryPetnameStore();
    const publicStore = makeInMemoryPublicStore();
    const board = makeFakeBoard();

    // The human names persona 0 privately, then publishes a DIFFERENT public glamour for it.
    await renameOwnPersona(petnames, 0, "my-throwaway-burner");
    await publishPersonaGlamour({ board, seed: SEED, handleIndex: 0, glamour: "Anon-Wanderer", now: 5, store: publicStore });

    // What reached the board carries ONLY the public glamour — the private label appears nowhere on the wire.
    const announced = readHandleAnnounces(board.doc());
    expect(announced).toHaveLength(1);
    expect(announced[0]!.glamour).toBe("Anon-Wanderer");
    const wire = JSON.stringify(board.doc());
    expect(wire).not.toContain("my-throwaway-burner");
    // And the private store is untouched by the publish — the two layers stay separate.
    expect(petnames.spy.get(0)).toBe("my-throwaway-burner");
  });
});

describe("persona-glamour — the persona-index → HandleCard wire (#64 stage 4)", () => {
  test("mint derives the veiled key as the card nym; the card certifies itself", async () => {
    const store = makeInMemoryPublicStore();
    const { card, record } = await mintPersonaGlamour({ seed: SEED, handleIndex: 4, glamour: "Tide-Caller", now: 100, store });
    // The nym IS the derived veiled-user verifying key; the signature checks against it (self-certifying).
    expect(card.nym).toBe(record.nym);
    expect((await verifyHandleCard(card, 100)).ok).toBe(true);
    expect(card.glamour).toBe("Tide-Caller");
    expect(card.version).toBe(1);
    expect(card.prev).toBeNull();
    // The record's cardId is the card's content id (its `prev` target on the next publish).
    expect(record.cardId).toBe(await handleCardId({
      kind: card.kind, nym: card.nym, glamour: card.glamour, version: card.version, prev: card.prev,
      expiry: card.expiry, standing: card.standing, fleetProof: card.fleetProof,
    }));
  });

  test("a DIFFERENT persona-index derives a DIFFERENT nym (unlinkable faces)", async () => {
    const store = makeInMemoryPublicStore();
    const a = await mintPersonaGlamour({ seed: SEED, handleIndex: 0, glamour: "A", now: 1, store });
    const b = await mintPersonaGlamour({ seed: SEED, handleIndex: 1, glamour: "B", now: 1, store });
    expect(a.card.nym).not.toBe(b.card.nym);
  });

  test("a re-publish advances the monotone lineage the recogniser holds to (version bump + prev link)", async () => {
    const store = makeInMemoryPublicStore();
    const board = makeFakeBoard();
    const first = await publishPersonaGlamour({ board, seed: SEED, handleIndex: 2, glamour: "v1", now: 10, store });
    const second = await publishPersonaGlamour({ board, seed: SEED, handleIndex: 2, glamour: "v2", now: 20, store });

    expect(second.version).toBe(2);
    expect(second.prev).toBe(await handleCardId({
      kind: first.kind, nym: first.nym, glamour: first.glamour, version: first.version, prev: first.prev,
      expiry: first.expiry, standing: first.standing, fleetProof: first.fleetProof,
    }));
    // A recogniser tracking the first card ACCEPTS the second as a genuine update (not a rollback/fork).
    const firstId = await handleCardId({
      kind: first.kind, nym: first.nym, glamour: first.glamour, version: first.version, prev: first.prev,
      expiry: first.expiry, standing: first.standing, fleetProof: first.fleetProof,
    });
    const verdict = await acceptHandleUpdate(second, {
      expectedNym: first.nym, highWaterVersion: first.version, lastCardId: firstId, now: 25,
    });
    expect(verdict.ok).toBe(true);
  });

  test("an empty glamour is refused — a federated face needs a display name", async () => {
    const store = makeInMemoryPublicStore();
    await expect(mintPersonaGlamour({ seed: SEED, handleIndex: 0, glamour: "   ", now: 1, store })).rejects.toThrow(/empty glamour/);
  });
});
