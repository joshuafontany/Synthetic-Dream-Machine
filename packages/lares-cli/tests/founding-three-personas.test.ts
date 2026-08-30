/**
 * founding-three-personas — the THREE SYMMETRIC founding commands, driven end-to-end through the REAL
 * `lares persona new` door + the bags/nexus charter seat, over a genuine vault + petname/declaration stores.
 *
 * Operator intent: h0/h1/h2 stand as THREE SYMMETRIC EXPLICIT commands, not h0 auto-bound behind the seat.
 * `lares vessel stand --install` STANDS h0's operator-root (it signs the founding bind), and `persona new 0` LOADS that same
 * pre-standing founder idempotently + sets its private label — byte-symmetric with `new 1`/`new 2`.
 *
 * THE JOIN READS THE DECLARED HANDLE, NEVER THE PRIVATE LABEL. A chair belongs to whoever declared the Handle
 * it names AND stood for a seat; the pet-name labels a compartment and reaches no roster. That keeps the two
 * registers independent — the private label here reads NOTHING like the public Handle, and the seat still
 * lands, which a label-matching join could never do.
 *
 * Proven:
 *   · `persona new 0/1/2 --name '<label>' --handle '<kahu>' --seat` each returns 0; the roster reads [0,1,2]
 *     with all three private labels, and all three declared Handles beside them,
 *   · `persona new 0` on a PRE-STANDING founder root LOADS it (created:false) and STILL lands label+declaration
 *     (idempotent — the founder is named, never re-minted, its verifying key unchanged),
 *   · `nexus seal seat` joins persona→kahu BY DECLARED HANDLE and seats ALL THREE (the founder among them) —
 *     the full 3-of-3 stands, never a 2-of-3 that strands the founder unnamed,
 *   · a persona that declares a Handle but does NOT stand for a seat stays UNSEATED — standing is its own act.
 */
import { afterEach, beforeEach, describe, test, expect, vi } from "vitest";
import { mkdtempSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdPersona } from "../src/commands/persona.js";
import { cmdVessel } from "../src/commands/vessel.js";
import { cmdNexus } from "../src/commands/nexus.js";
import type { ParsedArgs } from "../src/parse-args.js";
import { larSealHome, larDataDir } from "../src/env.js";
import {
  generateOrLoadPersonaGroupRoot, makeNodePersonaPetnameStore, makeNodePersonaDeclarationStore,
  listPersonaRoots, readNexusDoc,
} from "@lararium/node";
import { ownPersonaPetname, declaredHandle, foundingQuorumSeated } from "@lararium/mesh";

/** The three chair names the seal seeds — the PUBLIC Handles each founding persona answers to. */
const KAHU = ["Kahu Alpha", "Kahu Beta", "Kahu Gamma"];
/** A FOURTH chair, for the readings that need one persona to stand OUTSIDE the seated roster. A Nexus
 *  founds on three at least (the seed floor), so a test proving what does NOT sit needs a fourth to
 *  hold back — otherwise it proves the floor rather than the property it came for. */
const KAHU_SPARE = "Kahu Delta";
const LABEL_SPARE = "veil-four";
/** The human's PRIVATE labels for the same three compartments — deliberately unlike the Handles above. */
const LABELS = ["veil-one", "veil-two", "veil-three"];
const saved: Record<string, string | undefined> = {};
const setEnv = (k: string, v: string | undefined): void => {
  saved[k] = process.env[k];
  if (v === undefined) delete process.env[k]; else process.env[k] = v;
};
const personaArgs = (
  positional: string[], options: Record<string, string> = {}, flags: Record<string, boolean> = {},
): ParsedArgs => ({ command: "persona", positional, options, flags: { json: true, ...flags } });
const nexusArgs = (positional: string[], options: Record<string, string> = {}): ParsedArgs =>
  ({ command: "nexus", positional, options, flags: { json: true } });

describe("the three symmetric founding commands (CLI, real vault + disk)", () => {
  let root: string;
  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), "lares-founding3-"));
    setEnv("LAR_ROOT", root);                       // isolates bags + vault-state + petname store under one tree
    setEnv("LARES_ARCHIVE_PASSPHRASE", undefined);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    // An isolated root carries no hearth true-name until the tracked genesis seed rides into it — the engine
    // CID a founding binds the place TO lives there, and `vessel found` refuses without one.
    cpSync(join(import.meta.dirname, "..", "..", "..", "genesis"), join(root, "genesis"), { recursive: true });
    // THE PLACE STANDS FIRST. A founding splits in two: `vessel found` stands the PLACE (a faceless hearth
    // that carries and serves), and `persona new 0` lights the FIRST FACE on it. A face has nowhere to stand
    // without a place, and says so, so every one of these commands begins from a founded hearth.
    expect(await cmdVessel({ command: "vessel", positional: ["found"], options: {}, flags: { json: true } })).toBe(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(root, { recursive: true, force: true });
  });

  test("persona new 0/1/2 → roster [0,1,2]; the private label and the declared Handle land SEPARATELY", async () => {
    for (let i = 0; i < KAHU.length; i++) {
      expect(await cmdPersona(personaArgs(["new", String(i)], { name: LABELS[i]!, handle: KAHU[i]! }, { seat: true }))).toBe(0);
    }
    expect(await listPersonaRoots(larDataDir())).toEqual([0, 1, 2]);

    const petnames = await makeNodePersonaPetnameStore();
    const declarations = await makeNodePersonaDeclarationStore();
    for (let i = 0; i < KAHU.length; i++) {
      expect(await ownPersonaPetname(petnames, i)).toBe(LABELS[i]);      // the compartment's own label
      expect(await declaredHandle(declarations, i)).toBe(KAHU[i]);        // what it answers to outward
      expect(LABELS[i]).not.toBe(KAHU[i]);                                // the two registers stay independent
    }
  });

  test("persona new 0 on a PRE-STANDING founder LOADS + names it (idempotent — same key, never re-minted)", async () => {
    // The founding STANDS h0's operator-root before the operator ever runs `persona new`.
    const founder = await generateOrLoadPersonaGroupRoot(larDataDir(), 0);
    expect(founder.created).toBe(true);

    // `persona new 0` LOADS that same root (never re-mints) AND lands both the label and the declaration.
    expect(await cmdPersona(personaArgs(["new", "0"], { name: LABELS[0]!, handle: KAHU[0]! }, { seat: true }))).toBe(0);
    const reloaded = await generateOrLoadPersonaGroupRoot(larDataDir(), 0);
    expect(reloaded.created).toBe(false);
    expect(reloaded.verifyingKey).toBe(founder.verifyingKey);   // the founder key is unchanged — loaded, not re-minted

    expect(await ownPersonaPetname(await makeNodePersonaPetnameStore(), 0)).toBe(LABELS[0]);
    expect(await declaredHandle(await makeNodePersonaDeclarationStore(), 0)).toBe(KAHU[0]);
  });

  test("seat joins by DECLARED HANDLE and seats ALL THREE — the full quorum stands, the founder among the seated", async () => {
    for (let i = 0; i < KAHU.length; i++) {
      await cmdPersona(personaArgs(["new", String(i)], { name: LABELS[i]!, handle: KAHU[i]! }, { seat: true }));
    }
    expect(await cmdNexus(nexusArgs(["seal", "seat"]))).toBe(0);

    const doc = readNexusDoc(larSealHome());
    expect(doc?.kahu.length).toBe(3);
    for (const k of doc!.kahu) {
      expect(k.verifyingKey, `${k.displayName} seated by declared-Handle join`).toBeTruthy();
    }
    // The founder (h0 / "Kahu Alpha") is seated too — never a 2-of-3 that strands it unnamed.
    const founder = doc!.kahu.find((k) => k.displayName === KAHU[0]);
    expect(founder?.verifyingKey).toBeTruthy();
    expect(foundingQuorumSeated(doc)).toBe(true);
  });

  test("★ a declared Handle WITHOUT --seat takes NO CHAIR — the roster holds only what stood ★", async () => {
    // h0 and h1 stand; h2 declares a Handle and never offers itself. Because the roster FORMS from what
    // stood — no list ships in the build — h2 gets no chair at all, rather than an empty one somebody
    // else wrote down for it. A declaration never reads as consent to sit.
    for (let i = 0; i < KAHU.length; i++) {
      await cmdPersona(personaArgs(["new", String(i)], { name: LABELS[i]!, handle: KAHU[i]! }, { seat: true }));
    }
    // The fourth DECLARES and never offers itself.
    await cmdPersona(personaArgs(["new", "3"], { name: LABEL_SPARE, handle: KAHU_SPARE }));

    expect(await cmdNexus(nexusArgs(["seal", "seat"]))).toBe(0);
    const doc = readNexusDoc(larSealHome());
    expect(doc!.kahu.map((k) => k.displayName)).toEqual(KAHU);
    expect(doc!.kahu.find((k) => k.displayName === KAHU_SPARE)).toBeUndefined();
    // Majority over the three that stood reads 2 — the fourth's declaration moved nothing.
    expect(doc!.threshold).toBe(2);
    expect(foundingQuorumSeated(doc)).toBe(true);
  });

  test("★ NO name ships in the build — the roster carries exactly the Handles the operator declared ★", async () => {
    // The load-bearing property of the inversion: a founding whose roster arrived in a release is a founding
    // the operator merely confirms. These strings exist nowhere but in the commands above.
    const mine = ["Kahu One", "Kahu Two", "Kahu Three"];
    for (let i = 0; i < mine.length; i++) {
      await cmdPersona(personaArgs(["new", String(i)], { name: `label-${i}`, handle: mine[i]! }, { seat: true }));
    }
    await cmdNexus(nexusArgs(["seal", "seat"]));
    const doc = readNexusDoc(larSealHome());
    expect(doc!.kahu.map((k) => k.displayName).sort()).toEqual([...mine].sort());
    for (const k of doc!.kahu) expect(k.verifyingKey).toBeTruthy();
  });

  test("the threshold derives MAJORITY over what stood, and --threshold takes the operator's own call", async () => {
    for (let i = 0; i < KAHU.length; i++) {
      await cmdPersona(personaArgs(["new", String(i)], { name: LABELS[i]!, handle: KAHU[i]! }, { seat: true }));
    }
    await cmdNexus(nexusArgs(["seal", "seat"]));
    expect(readNexusDoc(larSealHome())!.threshold).toBe(2);          // majority of 3
  });

  test("★ --threshold past the roster REFUSES — it would seat a rule no quorum could ever reach ★", async () => {
    await cmdPersona(personaArgs(["new", "0"], { name: LABELS[0]!, handle: KAHU[0]! }, { seat: true }));
    expect(await cmdNexus(nexusArgs(["seal", "seat"], { threshold: "4" }))).not.toBe(0);
  });

  test("★ a seat with NOBODY standing refuses, and writes no doc ★", async () => {
    await cmdPersona(personaArgs(["new", "0"], { name: LABELS[0]!, handle: KAHU[0]! }));   // declares, never stands
    expect(await cmdNexus(nexusArgs(["seal", "seat"]))).not.toBe(0);
    expect(readNexusDoc(larSealHome())).toBeNull();
  });

  test("★ the PRIVATE label never reaches the seal — the doc carries chair names and keys, no compartment labels ★", async () => {
    for (let i = 0; i < KAHU.length; i++) {
      await cmdPersona(personaArgs(["new", String(i)], { name: LABELS[i]!, handle: KAHU[i]! }, { seat: true }));
    }
    await cmdNexus(nexusArgs(["seal", "seat"]));

    const wire = JSON.stringify(readNexusDoc(larSealHome()));
    for (const label of LABELS) expect(wire).not.toContain(label);
  });

  test("★ a MIRROR never fails the act it mirrors — no fleet answers, and the founding still lands ★", async () => {
    // These tests run with no daemon at all, which IS the founding case: `persona new` runs before any hearth
    // breathes, and a vessel whose oracle registry names no persona plane never REGISTERS the fleet verbs at all. Both read
    // NODE-LOCAL to the caller. A mirror that threw here would fail the founding on exactly the vessels that
    // reach no fleet.
    expect(await cmdPersona(personaArgs(["new", "0"], { name: LABELS[0]!, handle: KAHU[0]! }, { seat: true }))).toBe(0);
    // Two more stand so the seat meets the seed floor — the reading here is about the MIRROR, not the
    // roster size, and a founding that refused for want of chairs would measure the wrong thing.
    for (let i = 1; i < KAHU.length; i++) {
      await cmdPersona(personaArgs(["new", String(i)], { name: LABELS[i]!, handle: KAHU[i]! }, { seat: true }));
    }

    // The names stand LOCALLY regardless, so the seat still joins them.
    expect(await ownPersonaPetname(await makeNodePersonaPetnameStore(), 0)).toBe(LABELS[0]);
    expect(await declaredHandle(await makeNodePersonaDeclarationStore(), 0)).toBe(KAHU[0]);
    expect(await cmdNexus(nexusArgs(["seal", "seat"]))).toBe(0);
    expect(readNexusDoc(larSealHome())!.kahu.find((k) => k.displayName === KAHU[0])?.verifyingKey).toBeTruthy();
  });
});
