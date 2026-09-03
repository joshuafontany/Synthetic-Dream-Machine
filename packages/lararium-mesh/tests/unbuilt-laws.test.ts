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
import { resolveDiskMirrors } from "../src/vessel-island-pool-core.js";
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

  test.skip("A NEXUS OUTLIVES ITS FOUNDING CABAL'S PHASE — DEFERRED: nexusPhase reads seed/multisig/quorum off the NEXUS SEAL's seated chairs, which are the kahu cabal's. That coincides with the Nexus at the seed, because the kahu cabal is its group-seed, and DIVERGES the moment the Nexus succeeds: a Nexus carrying a dormant kahu cabal and twenty thriving ones sits in a state this reading cannot express. The name is honest today and becomes a fusion on success — wants a Nexus-plane reading that counts hardware in the federation rather than chairs in one cabal", () => {
    // Today this reads `quorum` off twenty relations with NO chair seated, which is the cabal's
    // ladder answering a question about hardware. A Nexus-plane reading would answer separately.
    expect(nexusPhase({ seatedKeys: 0, contractedOperators: 20 }).phase).toBe("quorum");
    expect(Object.keys(mesh)).toContain("nexusFederationStanding");
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

  test.skip("A REALM RESOLVES ITS OWN SUBSTRATE FROM ITS ID, PER FACE — DEFERRED: substrateUrl lives only in the in-memory CabalRealm a founding ceremony returns, and that ceremony has no production caller, so the daemon's realm verbs take an id and can find no board. The index is RESOLUTION-ONLY and never discovery: it opens a doc the holder already keys, and names no realm they hold no key to, so it is not the roster 'a roster IS a global now' forbids. It scopes to the FACE, never the vessel — one Persona at a time takes the blame, so a compromise yields one face's realms and not a multitude's, the same blast radius the persona planes already buy (a vessel-global index correlates, exactly as a vessel-global @circles does)", () => {
    expect(Object.keys(mesh)).toContain("faceScopedRealmIndex");
  });

  test.skip("A PEER'S OFFERING ARRIVES — DEFERRED: measured red in docker (mesh-scenarios.sh realm-crossing). Two contracted operators fed one realm through a live relay and A counted her own two faces, never B's third, because the feed is read off the DAEMON board each vessel reads from its own bootstrap. The address space is now separate so the move carries no revocation fence with it; the move itself wants the registry above", () => {
    expect(Object.keys(mesh)).toContain("faceScopedRealmIndex");
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
// ⑧ ONE CROSSROADS SERVES ONE NEXUS — and a joined node reads the wrong one
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `crossroads#open` settles the model: "One crossroads serves ONE Nexus… the reach is the Nexus,
// never the DreamNet: no confederation-wide floor exists, by design, because a bulletin belongs to
// the body that keeps it." So a board per Nexus is CORRECT, and a founder deriving its own board
// from its own key is correct with it.
//
// THE CONSEQUENCE IS UNBUILT. A vessel that JOINS Nexus A must read A's board — and a node has no
// path to any key but its own (`nexusPubkey: vesselIdentity.verifyingKey`, seven sites). The BROWSER
// leaf already does the other thing: `const nexusPubkey = relayGatePubKey`, gated on
// `admittedToNexus`. And the key is already handed over out of band — `lares herm` prints the dial
// URL(s) AND the gate pubkey "to hand a hearth". The node never stores or reads it.
//
// So this is not a design question. It is a settled design with one leg unwalked, and the shape of
// the fix is visible in the sibling vessel that walks it.
describe("⑧ a joined vessel reads its Nexus's board", () => {
  test("the board is derived from a key, so adopting a Nexus is adopting its key", () => {
    // Not a gap — the derivation is total and pure, which is what makes the adoption a one-value
    // change rather than a new mechanism.
    const a = mesh.crossroadsDocUrl("0x" + "aa".repeat(32));
    const b = mesh.crossroadsDocUrl("0x" + "bb".repeat(32));
    expect(a).not.toBe(b);
    expect(mesh.crossroadsDocUrl("0x" + "aa".repeat(32))).toBe(a);
  });

  test.skip("A NODE ADOPTS ITS NEXUS'S KEY WHEN IT JOINS ONE — DEFERRED: `open-node-vessel` binds nexusPubkey to vesselIdentity.verifyingKey at seven sites with no alternative path, so a node admitted to a foreign Nexus still materializes a board derived from ITSELF. The browser leaf takes relayGatePubKey gated on admittedToNexus; the node has no equivalent, and `device-admit` carries a hearthDaemonUrl and no nexus key because it admits a DEVICE to a fleet rather than a vessel to a Nexus", () => {
    expect(Object.keys(mesh)).toContain("adoptedNexusPubkey");
  });

  test.skip("THE HERM'S GATE PUBKEY REACHES THE HEARTH THAT DIALS IT — DEFERRED: `lares herm` prints the dial URL and the gate pubkey for an operator to hand over, and nothing on the receiving side stores it. The out-of-band hand-off is designed and instructed; the leg that keeps what was handed over does not exist, so a hearth re-learns its Nexus by hand every boot or not at all", () => {
    expect(Object.keys(mesh)).toContain("adoptedNexusPubkey");
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ⑦ @daemon IS AN ORDINARY WIKI — the one the ontology was written after
// ════════════════════════════════════════════════════════════════════════════════════════════════
// The daemon wiki was devised BEFORE the recipe/layer ontology grew around it, so it stands as the
// one wiki exempt from the laws every other wiki obeys. Operator ruling: it should behave like any
// other — it takes foreground sometimes, it will likely seed a canon-bag layer, and it serves as the
// WORKING-MEMORY STAGE: a shared surface for the operator and the AI that belongs to no other
// composed knowledge domain. That last role is why the exemption costs something rather than merely
// looking untidy — the one place two minds are meant to leave things for each other is the one place
// nothing lands on disk.
//
// WHAT STANDS TODAY, measured: `open-node-vessel` grants the daemon VM `{islandUrl, wikiUrl,
// catalogUrl}` and no `workingUrl`/`personalUrl`/`draftUrl`, so `expandRecipe`'s three instance slots
// prune for want of a handle; `island-recipe` falls the write layer back to the daemon's own bag; and
// `disk-projector` excludes `daemon` from every mirror. Three layers, no working↔canon shore, no disk.
//
// WHAT NO LONGER BLOCKS IT. The instance slots once bound only where a FACE stood, so the daemon
// could not be a client of the resolver it supplies and a faceless floor got no layers at all. That
// gate was what remained of Herm and Lararium having been separate CLASSES; operator ruling made the
// VESSEL KEY the binder, and the mint already confers it — `registerBag` generates the document and
// its generator is admin by construction, so a faceless binding is a doc the VESSEL holds, with a
// face composing on top where one stands. A Herm now resolves its own bindings and can stand a
// `@daemon` wiki for a lamplighter to reach.
//
// WHAT REMAINS IS WIRING, not authority: the daemon VM's grants are built before the VM that hosts
// the resolver exists, so its own working layer arrives by a LATE ATTACH rather than at open.
// `CompositeStore.addLayer(layer, at)` already splices into a live cascade and fans projections to
// the arriving layer — the act is missing, never the machinery, and it needs no face to run.
describe("⑦ the daemon wiki, held to the laws every other wiki obeys", () => {
  test("the recipe already NAMES the slots the daemon is not granted", () => {
    // Not a gap in the model — `expandRecipe` mints the same five slots for every slug, daemon
    // included. The absence is entirely in the grants, which is what makes this a small change.
    const slots = mesh.expandRecipe({ wikiSlug: "daemon" });
    for (const kind of ["temp", "draft", "personal", "working"] as const) {
      expect(slots).toContain(mesh.wikiSlotUri("daemon", kind));
    }
    expect(slots).toContain(mesh.wikiBagUri("daemon"));
  });

  test.skip("THE DAEMON WIKI HOLDS A WRITE LAYER ABOVE ITS OWN BAG — DEFERRED: the vessel grants no workingUrl, so `island-recipe` falls the write layer back to the daemon bag and an operator edit lands in the control plane rather than in a saved working layer. Every other wiki keeps write layer and canon as distinct coordinates (wiki-layer-ontology#quine); the daemon is the sole exemption, and it is the surface the operator and the AI share", () => {
    expect(Object.keys(mesh)).toContain("daemonWorkingGrant");
  });

  test.skip("A DAEMON EDIT REACHES DISK — DEFERRED: `disk-projector` excludes daemon from every mirror, so nothing written through the daemon surface appears in wikis/ or bags/. The working-memory stage is the one surface where an operator and an agent leave work for each other, and it is the one with no on-disk form to read, diff or commit", () => {
    expect(Object.keys(mesh)).toContain("daemonWorkingGrant");
  });

  test.skip("THE DAEMON'S WORKING LAYER ATTACHES AFTER ITS OWN BOOT — DEFERRED: the daemon VM's grants are built before the VM that hosts the binding resolver exists, so its working layer can only arrive by a late attach. `addLayer(layer, at)` splices live and fans projections already, and since the binder is the VESSEL key this needs no face to run — a Herm gains the layer too. Nothing calls it for the daemon, and no vector proves a booted vessel gains the layer rather than needing a reboot", () => {
    expect(Object.keys(mesh)).toContain("attachWorkingLayerLive");
  });

  // THE MIRROR CAN ALREADY TELL THEM APART, which a first reading of this section denied.
  // `resolveDiskMirrors` resolves a `wikiSlot` grant (working → bag `wikis/{slug}/working`, disk
  // `wikis/{slug}`) separately from a `selfCanon` grant (`bags/{slug}` → disk `bags/{slug}`), so a
  // recipe may designate the daemon's working layer for disk WITHOUT designating the bag beneath it.
  // The control plane — verb tiddlers, outcomes, flows, binding records — stays off the operator's
  // tracked tree by designating one and not the other, and no new mechanism is owed.
  test("the mirror resolver already separates a wiki's working slot from its canon bag", () => {
    const grant = [
      { bagId: "", mirrorRoot: "wikis", wikiSlot: "working" as const },
      { bagId: "", mirrorRoot: "bags",  selfCanon: true },
    ];
    const workingOnly = resolveDiskMirrors(grant, [mesh.wikiSlotUri("daemon", "working")], "daemon");
    expect(workingOnly.map((g) => g.bagId)).toEqual([mesh.wikiSlotUri("daemon", "working")]);
    expect(workingOnly[0]?.mirrorRoot).toBe("wikis/daemon");
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
