/**
 * cabal-realm ceremonies — the founding layer under test against REAL Keyhive.
 *
 * The probes drift a whole lifecycle and print; these pin the PROPERTIES a later hand could break silently.
 * Each one asserts a refusal as hard as an ability: no roster to read, no closing pair to call, no legitimacy
 * baked in the gate, no standing deposited by opening a door. The founding path runs unguarded otherwise — a
 * reversed argument or a re-added eviction reaches the operator's own hearth before anything catches it.
 *
 * Real Keyhive, no mocks: the sentinel stands as a real Document, each dweller as an independent provider
 * introduced by contact card, the liveness reading as a real residency tier.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/cabal-realm
 */
import { describe, test, expect } from "vitest";
import { KeyhiveProvider, InMemoryEventStore } from "../src/index.js";
import * as ceremony from "../src/cabal-realm-ceremony.js";
import {
  foundCabalRealm, foundCabalRealmWithGlamour, openDwelling, dwellersHolding, cabalRealmLiveness,
} from "../src/cabal-realm-ceremony.js";
import { forkCabalRealm } from "../src/fork-realm-ceremony.js";
import { BagStowage, cabalRealmLeaseSlot, feedCabalRealm, type CabalRealm } from "@lararium/mesh";

const URI       = "lar:///crossroads.cabal.gathers/test-realm";
const SUBSTRATE = "automerge:cabal-realm-substrate-test";
const WRITER    = "founder-vessel";
/** A fixed founding moment — the ceremony reads no clock, so a test supplies the stamp. */
const FOUNDED_AT = 1_700_000_000_000;

/** A founder vessel holding the realm's sentinel. Each test stands its own, so no state crosses. */
async function founderVessel(fill = 0x11): Promise<KeyhiveProvider> {
  const p = new KeyhiveProvider();
  await p.init({ seed: new Uint8Array(32).fill(fill), eventStore: new InMemoryEventStore() });
  return p;
}

/** An independent vessel, introduced to `host` by contact card — the precondition every ceremony assumes. */
async function knownParty(host: KeyhiveProvider, fill: number): Promise<string> {
  const party = new KeyhiveProvider();
  await party.init({ seed: new Uint8Array(32).fill(fill), eventStore: new InMemoryEventStore() });
  const { id } = await host.receiveContactCard(await party.contactCard());
  return id;
}

describe("founding mints a NAME and warms nothing", () => {
  test("★ the realm is born COLD — founding registers the substrate unfed, and the lease sits at genesis ★", async () => {
    // A realm that founded ALIVE would name a realm that exists without anyone feeding it. It begins when
    // someone feeds it (`cabal-realm#verb-not-noun`), so the founding may only deposit the floor.
    const founder    = await founderVessel();
    const residency  = new BagStowage({ idleMs: 1 });
    const leaseSlots = new Map<string, string>();

    const realm = await foundCabalRealm(founder, URI, SUBSTRATE,
      { residency, leaseWriterId: WRITER, leaseSlots });

    expect(realm.realmDocIdHex.length).toBeGreaterThan(0);
    expect(realm.genesisUri).toBe(URI);
    expect(residency.tier(SUBSTRATE)).toBe("anu");
    expect(leaseSlots.get(cabalRealmLeaseSlot(realm.realmDocIdHex, WRITER))).toBe("0");
  });

  test("a bare founding touches NOTHING outside itself — every side-effect rides an opt", async () => {
    const founder   = await founderVessel();
    const residency = new BagStowage({ idleMs: 1 });
    const realm     = await foundCabalRealm(founder, URI, SUBSTRATE);   // no opts
    expect(realm.realmDocIdHex.length).toBeGreaterThan(0);
    // The residency never heard of this substrate, because nothing asked it to.
    expect(residency.tier(SUBSTRATE)).toBeNull();
  });

  test("two foundings of the SAME uri mint DISTINCT realms — the name grants nothing", async () => {
    // Knowing a realm's uri lets anyone found a realm at that bearing and reach nothing of the first
    // (`cabal-realm` NAMED-not-ruled). A uri that resolved to one authoritative realm would seat exactly
    // the root the model refuses.
    const founder = await founderVessel();
    const a = await foundCabalRealm(founder, URI, SUBSTRATE);
    const b = await foundCabalRealm(founder, URI, SUBSTRATE);
    expect(a.realmDocIdHex).not.toBe(b.realmDocIdHex);
  });
});

describe("the glamour carries the published face and refuses the rest", () => {
  test("★ the glamour holds name · bearing · chosen meta — and NO key through which a roster could cross ★", async () => {
    const founder = await founderVessel();
    const { realm, glamour } = await foundCabalRealmWithGlamour(
      founder, URI, SUBSTRATE,
      { title: "Test Realm", description: "founded by the suite", foundedAt: FOUNDED_AT },
    );
    expect(glamour.realmDocIdHex).toBe(realm.realmDocIdHex);
    expect(glamour.genesisUri).toBe(URI);
    expect(glamour.foundedAt).toBe(FOUNDED_AT);
    // The EXACT key-set, asserted — naming forbidden fields guards only the ones already imagined, and the
    // field that arrives comes from wherever nobody thought to look.
    expect(Object.keys(glamour).sort())
      .toEqual(["description", "foundedAt", "genesisUri", "realmDocIdHex", "title"]);
  });

  test("an EMPTY meta founds a NAME-ONLY realm — advertising stays the founder's choice", async () => {
    const founder = await founderVessel();
    const { glamour } = await foundCabalRealmWithGlamour(founder, URI, SUBSTRATE);
    expect(Object.keys(glamour).sort()).toEqual(["genesisUri", "realmDocIdHex"]);
  });

  test("the substrate URL never crosses into the glamour — carry ⊥ read holds at the founding", async () => {
    const founder = await founderVessel();
    const { glamour } = await foundCabalRealmWithGlamour(founder, URI, SUBSTRATE, { title: "Test Realm" });
    expect(JSON.stringify(glamour)).not.toContain(SUBSTRATE);
  });
});

describe("opening a dwelling opens a DOOR and deposits no standing", () => {
  test("★ a party who opens a dwelling and acts not holds exactly the standing they arrived with ★", async () => {
    // `nohopapa` accrues from the acts a party takes inside. This ceremony holds none of it — no depth, no
    // rank, no roster entry — and the absence reads as the model behaving, never as a gap here.
    const founder = await founderVessel();
    const realm   = await foundCabalRealm(founder, URI, SUBSTRATE);
    const party   = await knownParty(founder, 0xa1);

    const opened = await openDwelling(founder, realm, party);
    expect(opened).toBeUndefined();      // nothing hands back — no receipt, no rank, no standing
  });

  test("★ NO closing pair exists — the module exports no eviction, and a later hand may not add one quietly ★", async () => {
    // A realm holds no container a party could be put out of, so no eviction reaches one. A hostile hand
    // shadows the RELATION (`edge-kapae`); wholesale escape runs by fork (exclude-by-omission).
    const surface = Object.keys(ceremony).sort();
    expect(surface).toEqual([
      "cabalRealmLiveness", "dwellersHolding", "foundCabalRealm", "foundCabalRealmWithGlamour", "openDwelling",
    ]);
    for (const gone of ["evictMember", "evictDweller", "closeDwelling", "removeMember", "cabalRealmRoster"]) {
      expect(surface).not.toContain(gone);
    }
  });
});

describe("the read answers does-this-one-hold, never who-holds", () => {
  test("★ the caller supplies the candidates — a holder nobody named never comes back ★", async () => {
    // INVERSION OF CONTROL, and it rides in the signature: no membership list exists to read, so a
    // dwelling reads VERIFIED-ON-ASK. No roster to seize, and no count presentable as a total.
    const founder = await founderVessel();
    const realm   = await foundCabalRealm(founder, URI, SUBSTRATE);
    const a = await knownParty(founder, 0xa1);
    const b = await knownParty(founder, 0xb2);
    await openDwelling(founder, realm, a);
    await openDwelling(founder, realm, b);

    expect((await dwellersHolding(founder, realm, [a, b])).sort()).toEqual([a, b].sort());
    // b holds a dwelling; asking about a alone reports a alone. The unnamed holder stays unnamed.
    expect(await dwellersHolding(founder, realm, [a])).toEqual([a]);
  });

  test("a candidate who holds NO dwelling drops from the answer, and the answer stays an answer", async () => {
    const founder = await founderVessel();
    const realm   = await foundCabalRealm(founder, URI, SUBSTRATE);
    const dweller  = await knownParty(founder, 0xa1);
    const stranger = await knownParty(founder, 0xc3);
    await openDwelling(founder, realm, dweller);
    expect(await dwellersHolding(founder, realm, [dweller, stranger])).toEqual([dweller]);
  });

  test("asking about NOBODY reads as absence, never as a verdict about the realm", async () => {
    const founder = await founderVessel();
    const realm   = await foundCabalRealm(founder, URI, SUBSTRATE);
    expect(await dwellersHolding(founder, realm, [])).toEqual([]);
  });
});

describe("liveness reads the feeding, never the founding", () => {
  test("★ an unfed realm reads DISSOLVED, and the first offering brings it ALIVE ★", async () => {
    const founder   = await founderVessel();
    const residency = new BagStowage({ idleMs: 1 });
    const realm     = await foundCabalRealm(founder, URI, SUBSTRATE, { residency });

    expect(cabalRealmLiveness(residency, realm)).toBe("dissolved");
    await feedCabalRealm(residency, realm);
    expect(cabalRealmLiveness(residency, realm)).toBe("alive");
  });

  test("a realm the residency never heard of reads DISSOLVED — an unknown substrate never reads alive", async () => {
    const founder = await founderVessel();
    const realm   = await foundCabalRealm(founder, URI, SUBSTRATE);   // no residency opt
    expect(cabalRealmLiveness(new BagStowage({ idleMs: 1 }), realm)).toBe("dissolved");
  });
});

describe("a fork leaves rather than evicts", () => {
  test("★ the captors are never opened — exclusion runs by OMISSION, and the fork stands fresh ★", async () => {
    const founder = await founderVessel();
    const old     = await foundCabalRealm(founder, URI, SUBSTRATE);
    const keepA   = await knownParty(founder, 0xa1);
    const keepB   = await knownParty(founder, 0xb2);
    const captor  = await knownParty(founder, 0xf0);
    for (const p of [keepA, keepB, captor]) await openDwelling(founder, old, p);

    const fork = await forkCabalRealm(founder, old, [keepA, keepB, captor], [captor]);

    expect(fork.forkedFromDocIdHex).toBe(old.realmDocIdHex);
    expect(fork.newRealm.realmDocIdHex).not.toBe(old.realmDocIdHex);
    expect(fork.survivors.sort()).toEqual([keepA, keepB].sort());
    expect(fork.excluded).toEqual([captor]);
    // The captor holds no key to the fork — never added, so no hand ever took one away.
    expect(await dwellersHolding(founder, fork.newRealm, [keepA, keepB, captor])).not.toContain(captor);
  });

  test("★ the argument ORDER pins here — dwellers then excludes, and a swap empties the fork ★", async () => {
    // A reversal reads as a fork with zero survivors, which a caller sees only as a quiet emptiness.
    const founder = await founderVessel();
    const old     = await foundCabalRealm(founder, URI, SUBSTRATE);
    const keep    = await knownParty(founder, 0xa1);
    const captor  = await knownParty(founder, 0xf0);
    await openDwelling(founder, old, keep);
    await openDwelling(founder, old, captor);

    const right = await forkCabalRealm(founder, old, [keep, captor], [captor]);
    expect(right.survivors).toEqual([keep]);
    const swapped = await forkCabalRealm(founder, old, [captor], [keep, captor]);
    expect(swapped.survivors).toEqual([]);
  });

  test("the old shell stands UNTOUCHED — a fork leaves a realm rather than editing it", async () => {
    const founder = await founderVessel();
    const old     = await foundCabalRealm(founder, URI, SUBSTRATE);
    const captor  = await knownParty(founder, 0xf0);
    const keep    = await knownParty(founder, 0xa1);
    await openDwelling(founder, old, captor);
    await openDwelling(founder, old, keep);

    await forkCabalRealm(founder, old, [keep, captor], [captor]);
    // The captor still holds the dead shell. Nobody revoked anything; the survivors simply left.
    expect(await dwellersHolding(founder, old, [captor])).toEqual([captor]);
  });

  test("the fork's bearing and substrate DERIVE from the old, and either may be named outright", async () => {
    const founder = await founderVessel();
    const old     = await foundCabalRealm(founder, URI, SUBSTRATE);
    const derived = await forkCabalRealm(founder, old, [], []);
    expect(derived.newRealm.genesisUri).toContain(URI);
    expect(derived.newRealm.substrateUrl).toBe(`${SUBSTRATE}-fork`);

    const named: CabalRealm = (await forkCabalRealm(founder, old, [], [], {
      newUri: "lar:///exodus.fresh.stands/named-fork", substrateUrl: "automerge:named-fork",
    })).newRealm;
    expect(named.genesisUri).toBe("lar:///exodus.fresh.stands/named-fork");
    expect(named.substrateUrl).toBe("automerge:named-fork");
  });
});
