/**
 * unbuilt-laws — the register of laws these models hold and NOTHING YET ENFORCES.
 *
 * ── WHY A REGISTER, AND WHY IT IS SKIPPED ───────────────────────────────────────────────────────
 * This tree's own record names one failure six times: a hand-written enumeration cannot notice what it
 * missed. The cure it reaches for is derivation — the coverage witness reads the code's unions rather
 * than a list. But a law nobody has built declares itself in no union, so derivation cannot find it
 * either. It has to be written down, and the honest place is a test that fails.
 *
 * Every test here is SKIPPED and every one is meant to be UNSKIPPED, never deleted. A green suite that
 * silently omits its own gaps is the shape this house keeps finding; a skipped test with the claim in
 * its title is the shape it keeps choosing (`meta-sidecar-roundtrip`, the deferred front-matter family).
 *
 * ── HOW TO READ ONE ─────────────────────────────────────────────────────────────────────────────
 * The title carries the LAW and what must land first. Where the surface exists, the body asserts the
 * behaviour we want from it and fails on today's behaviour. Where the surface does NOT exist, the body
 * asserts the export, and those NAMES ARE INDICATIVE — an implementer who picks a better one should
 * change the assertion with it. The law is the title; the name is a placeholder.
 *
 * ── THE THREE PLANES THESE SORT BY ──────────────────────────────────────────────────────────────
 * A CABAL is the shared relation over its realm's resources — any community, read as the humans behind
 * its shared Handle cloud. A REALM is that cabal's shared CRDT and other resources. A NEXUS is the
 * federated mesh of hardware many cabals live on. An act belongs to exactly one, and canon #112 rules
 * that fusing two "mis-sites every seat it names".
 */
import { describe, test, expect } from "vitest";
import * as mesh from "../src/index.js";
import { realmFeedSlotUri, realmFeedPrefix } from "../src/cabal-realm.js";
import { cabalRealmMaintenanceProvenance, realmFeedSlotValue } from "../src/cabal-realm-clock.js";
import { crossingDirection } from "../src/crossing-direction.js";
import { nexusPhase } from "../src/nexus-phase.js";

const REALM_A = "0x" + "aa".repeat(32);
const REALM_B = "0x" + "bb".repeat(32);
const FACE_1  = "0x" + "11".repeat(32);
const FACE_2  = "0x" + "22".repeat(32);

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ① A NEXUS HOLDS MANY CABALS — the property that makes a Nexus a Nexus
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe("① many cabals on one Nexus", () => {
  // This one PASSES at the model layer already — prefix isolation carries it — and stands here
  // because the TOPOLOGY is what is untested: no harness ever runs two cabals on one fleet.
  test("two cabals' feeds do not see each other on ONE board", () => {
    const board = new Map([
      [realmFeedSlotUri(REALM_A, FACE_1), realmFeedSlotValue({ epoch: 3 })],
      [realmFeedSlotUri(REALM_B, FACE_2), realmFeedSlotValue({ epoch: 9 })],
    ]);
    expect(cabalRealmMaintenanceProvenance(REALM_A, board).maintainers.map((m) => m.writerId)).toEqual([FACE_1]);
    expect(cabalRealmMaintenanceProvenance(REALM_B, board).maintainers.map((m) => m.writerId)).toEqual([FACE_2]);
  });

  test.skip("ONE FACE FEEDING TWO CABALS earns standing in each SEPARATELY — DEFERRED: standing is read per-realm today and nothing asserts non-transfer, so a face deep in cabal A could be read as carrying that depth into B. Wants a reading keyed by (face, realm) that refuses to aggregate across realms, and a docker fleet standing two cabals to walk it", () => {
    const board = new Map([
      [realmFeedSlotUri(REALM_A, FACE_1), realmFeedSlotValue({ epoch: 900 })],
      [realmFeedSlotUri(REALM_B, FACE_1), realmFeedSlotValue({ epoch: 1 })],
    ]);
    expect(cabalRealmMaintenanceProvenance(REALM_A, board).effectiveEpoch).toBe(900);
    expect(cabalRealmMaintenanceProvenance(REALM_B, board).effectiveEpoch).toBe(1);
    expect(Object.keys(mesh)).toContain("standingIsPerRealm");
  });

  test.skip("TWO CABALS SHARE HARDWARE WITHOUT SHARING RESOURCES — DEFERRED: the Nexus is the hardware mesh and the realm is the resources, so two cabals on one relay must reach each other's vessels and NOT each other's docs. Wants a docker scenario standing two realms across one herm fleet; the harness carries a single REALM= and no cell varies cabal count", () => {
    expect(Object.keys(mesh)).toContain("nexusCarriesCabal");
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ② THE REALM'S FEED MUST CROSS — a realm-plane fact on a Nexus-plane board
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe("② the feed crosses its members", () => {
  test("the feed's address carries NO board — it can follow a realm anywhere", () => {
    expect(realmFeedPrefix(REALM_A)).not.toContain("lar:///");
    expect(realmFeedPrefix(REALM_A)).not.toContain("bags/daemon");
  });

  test.skip("A REALM RESOLVES ITS OWN SUBSTRATE FROM ITS ID — DEFERRED: substrateUrl lives only in the in-memory CabalRealm a founding ceremony returns, and that ceremony has no production caller, so the daemon's realm verbs take an id and can find no board. Wants a realm-id -> substrateUrl registry; WHERE that registry lives is a correlation surface (a list of every realm you belong to is the shape 'a roster IS a global now' forbids) and wants an operator ruling before it is built", () => {
    expect(Object.keys(mesh)).toContain("realmSubstrateFor");
  });

  test.skip("A PEER'S OFFERING ARRIVES — DEFERRED: measured red in docker (mesh-scenarios.sh realm-crossing). Two contracted operators fed one realm through a live relay and A counted her own two faces, never B's third, because the feed is read off the DAEMON board each vessel reads from its own bootstrap. The address space is now separate so the move carries no revocation fence with it; the move itself wants the registry above", () => {
    expect(Object.keys(mesh)).toContain("realmSubstrateFor");
  });

  test.skip("A SHARED BOARD IGNORES AN UNVERIFIABLE SLOT — DEFERRED: verifyRealmFeedSlot is deliberately unwired because under a vessel's own bag the only hand that can write a slot owns it. The moment the board takes a peer's write, an unsealed or forged slot must be IGNORED rather than folded — and the fold is sync today while verification is async, so this wants a verifying fold beside the plain one", () => {
    expect(Object.keys(mesh)).toContain("verifiedMaintenanceFromBoard");
  });

  test.skip("A FORGED SLOT CANNOT LIFT A REALM'S EPOCH — DEFERRED: both folds take a MAX and neither checks a seal, so one slot carrying a large number is enough. Harmless while the board is private; the load-bearing refusal the moment it is not", () => {
    expect(Object.keys(mesh)).toContain("verifiedMaintenanceFromBoard");
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ③ A SEAT IS A FACE — the key layer offers nothing else
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe("③ only a face can sit", () => {
  test("the quorum floor reads four faces across two operators", () => {
    expect(nexusPhase({ seatedKeys: 3, contractedOperators: 1 }).phase).toBe("quorum");
    expect(nexusPhase({ seatedKeys: 3, contractedOperators: 0, contractedInto: true }).phase).toBe("quorum");
  });

  test.skip("A VEIL KEY CANNOT TAKE A SEAT — DEFERRED: a human's base veil key and the vessel-veil-dyad root sign nothing above the PersonaGroup layer, so a face is the only principal a seat can hold. nexusPhase counts INTEGERS and can express no principal class, so nothing refuses a seat filled by the wrong kind of key — the law lives in the key layer and in no gate", () => {
    expect(Object.keys(mesh)).toContain("seatPrincipalClass");
  });

  test.skip("A THIRD VESSEL ADDS OPERATORS AND SEATS NONE — DEFERRED: the distinction between counting vessels and counting faces is stated in nexus-phase and walked nowhere; the fleet stands two vessels, so no run has ever added a third to prove the count does not move with it", () => {
    expect(Object.keys(mesh)).toContain("seatPrincipalClass");
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ④ THE PRIESTHOOD PROMOTES, AND IS RECORDED — the kahu act on the canon bags
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe("④ promotion into canon", () => {
  test("the ladder ranks canon below what shadows it", () => {
    expect(crossingDirection({ from: "public", to: "veil" }).direction).toBe("inward");
    expect(crossingDirection({ from: "veil", to: "public" }).direction).toBe("outward");
  });

  test.skip("A PROMOTION EMITS A PROPOSAL AND A RECEIPT — DEFERRED: tiddler-store states 'canon promotion is disabled until a Keyhive-backed proposal/receipt graph exists'. The cap gate PERMITS the act (every verb demands admin on the destination bag) and nothing RECORDS it, so a promotion into canon leaves no artifact a later reader can audit or revoke against. Keyhive alpha.8 supplies the delegation surface this was waiting on", () => {
    expect(Object.keys(mesh)).toContain("promotionReceipt");
  });

  test.skip("A PROMOTION WITHOUT A RECEIPT IS NOT DURABLE — DEFERRED: the other half of the graph above. A write that lands in canon carrying no receipt must be refusable after the fact, or the receipt is decoration rather than the record", () => {
    expect(Object.keys(mesh)).toContain("promotionReceipt");
  });

  test.skip("A NON-KAHU MOVE INTO A CANON BAG REFUSES — DEFERRED: expressible only against a live cap provider, so it belongs in an e2e rather than here. cap('admin', destBag) already holds this line; nothing walks it against a principal who genuinely lacks the grant", () => {
    expect(Object.keys(mesh)).toContain("promotionReceipt");
  });

  test.skip("A NON-KAHU COPY OUT OF CANON SUCCEEDS — DEFERRED: the shadow copy must stay cheap (operator ruling), and canon's read-only mount carries it by copy-up on the overlay path. The RESIDENCY path reaches a bag's own doc and mounts nothing, so no test proves the cheap direction stays cheap there", () => {
    expect(Object.keys(mesh)).toContain("promotionReceipt");
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ⑤ THE OUTWARD CROSSING WANTS A TIER — the rule exists and the gate cannot reach it
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe("⑤ the outward gate", () => {
  test("the rule already knows outward wants a cabal", () => {
    expect(crossingDirection({ from: "veil", to: "public" }).needsCabal).toBe(true);
    expect(crossingDirection({ from: "public", to: "veil" }).needsCabal).toBe(false);
  });

  test.skip("A GATE CAN READ A BAG'S TIER — DEFERRED: VerbContext carries daemon, invocation and cap, and nothing that answers a bag's publicity tier, so action-handler cannot tell an outward crossing from an inward one and an OUTWARD copy passes on a read cap alone. The reader EXISTS one package over (bagManifest parses cap-tier; bag-declare reads it) — what is missing is the injection", () => {
    expect(Object.keys(mesh)).toContain("bagTierReader");
  });

  test.skip("AN OUTWARD COPY WITHOUT A CABAL SIGNATURE REFUSES — DEFERRED: the consequence of the injection above, and the one act the kahu cabal exists to gate. Zero e2e walks it: grep for outward/declassify across crossing-witness and civic-witness returns nothing", () => {
    expect(Object.keys(mesh)).toContain("bagTierReader");
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ⑥ THE INDEPENDENT OPERATOR — a principal class the fleet has never stood
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe("⑥ the node runner without grammar caps", () => {
  test.skip("A VESSEL BOOTS AND RELAYS WITHOUT CAPS ON THE BASE GRAMMAR — DEFERRED: every docker vessel is a full-caps founder or joiner. An independent operator runs metal for the Nexus and holds no cabal-cap on the lares/lararium bags; nothing proves such a vessel boots, syncs and relays rather than failing closed on a grammar read it cannot make", () => {
    expect(Object.keys(mesh)).toContain("independentOperatorBoot");
  });

  test.skip("AN INDEPENDENT OPERATOR CANNOT WRITE CANON AND CAN HOLD ITS OWN CABAL — DEFERRED: the two halves that make the class worth having. Running infrastructure must not confer authorship of the grammar, and lacking that authorship must not deny a vessel its own cabal and realm", () => {
    expect(Object.keys(mesh)).toContain("independentOperatorBoot");
  });
});
