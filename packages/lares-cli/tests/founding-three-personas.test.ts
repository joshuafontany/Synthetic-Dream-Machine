/**
 * founding-three-personas — the THREE SYMMETRIC founding commands, driven end-to-end through the REAL
 * `lares persona new` door + the bags/@nexus charter seat, over a genuine vault + petname store on disk.
 *
 * Operator intent: h0/h1/h2 stand as THREE SYMMETRIC EXPLICIT commands, not h0 auto-bound behind the seat.
 * `wake --install` STANDS h0's operator-root (it signs the founding bind), and `persona new 0 --name` LOADS
 * that same pre-standing founder idempotently + sets its private pet-name — byte-symmetric with `new 1`/`new 2`.
 *
 * Proven:
 *   · `persona new 0/1/2 --name '<kahu>'` each returns 0; the roster then reads [0,1,2] with all three pet-names,
 *   · `persona new 0` on a PRE-STANDING founder root LOADS it (created:false) and STILL sets the pet-name
 *     (idempotent — the founder is named, never re-minted, its verifying key unchanged),
 *   · `nexus seal seat` joins persona→kahu BY pet-name and seats ALL THREE (the founder among them) —
 *     the full 3-of-3 stands, never a 2-of-3 that strands the founder unnamed.
 */
import { afterEach, beforeEach, describe, test, expect, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdPersona } from "../src/commands/persona.js";
import { cmdNexus } from "../src/commands/nexus.js";
import type { ParsedArgs } from "../src/parse-args.js";
import { larBagsDir, larDataDir } from "../src/env.js";
import {
  generateOrLoadPersonaGroupRoot, makeNodePersonaPetnameStore, listPersonaRoots, readNexusCharterDoc,
} from "@lararium/node";
import { ownPersonaPetname, foundingQuorumSeated } from "@lararium/mesh";

const KAHU = ["Guru Joshua Fontany", "Telarus, KSC", "The Lindwyrm"];
const saved: Record<string, string | undefined> = {};
const setEnv = (k: string, v: string | undefined): void => {
  saved[k] = process.env[k];
  if (v === undefined) delete process.env[k]; else process.env[k] = v;
};
const personaArgs = (positional: string[], options: Record<string, string> = {}): ParsedArgs =>
  ({ command: "persona", positional, options, flags: { json: true } });
const nexusArgs = (positional: string[], options: Record<string, string> = {}): ParsedArgs =>
  ({ command: "nexus", positional, options, flags: { json: true } });

describe("the three symmetric founding commands (CLI, real vault + disk)", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "lares-founding3-"));
    setEnv("LAR_ROOT", root);                       // isolates bags + vault-state + petname store under one tree
    setEnv("LARES_ARCHIVE_PASSPHRASE", undefined);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(root, { recursive: true, force: true });
  });

  test("persona new 0/1/2 --name → roster [0,1,2], every kahu named; the door is symmetric", async () => {
    for (let i = 0; i < KAHU.length; i++) {
      expect(await cmdPersona(personaArgs(["new", String(i)], { name: KAHU[i]! }))).toBe(0);
    }
    expect(await listPersonaRoots(larDataDir())).toEqual([0, 1, 2]);

    const petnames = await makeNodePersonaPetnameStore();
    for (let i = 0; i < KAHU.length; i++) {
      expect(await ownPersonaPetname(petnames, i)).toBe(KAHU[i]);
    }
  });

  test("persona new 0 on a PRE-STANDING founder LOADS + names it (idempotent — same key, never re-minted)", async () => {
    // The founding STANDS h0's operator-root before the operator ever runs `persona new`.
    const founder = await generateOrLoadPersonaGroupRoot(larDataDir(), 0);
    expect(founder.created).toBe(true);

    // `persona new 0 --name` LOADS that same root (never re-mints) AND lands its pet-name.
    expect(await cmdPersona(personaArgs(["new", "0"], { name: KAHU[0]! }))).toBe(0);
    const reloaded = await generateOrLoadPersonaGroupRoot(larDataDir(), 0);
    expect(reloaded.created).toBe(false);
    expect(reloaded.verifyingKey).toBe(founder.verifyingKey);   // the founder key is unchanged — loaded, not re-minted

    const petnames = await makeNodePersonaPetnameStore();
    expect(await ownPersonaPetname(petnames, 0)).toBe(KAHU[0]);
  });

  test("seat joins by pet-name and seats ALL THREE — the full quorum stands, the founder among the seated", async () => {
    for (let i = 0; i < KAHU.length; i++) {
      await cmdPersona(personaArgs(["new", String(i)], { name: KAHU[i]! }));
    }
    expect(await cmdNexus(nexusArgs(["seal", "seat"]))).toBe(0);

    const doc = readNexusCharterDoc(larBagsDir());
    expect(doc?.kahu.length).toBe(3);
    for (const k of doc!.kahu) {
      expect(k.verifyingKey, `${k.displayName} seated by pet-name join`).toBeTruthy();
    }
    // The founder (h0 / "Guru Joshua Fontany") is seated too — never a 2-of-3 that strands it unnamed.
    const founder = doc!.kahu.find((k) => k.displayName === KAHU[0]);
    expect(founder?.verifyingKey).toBeTruthy();
    expect(foundingQuorumSeated(doc)).toBe(true);
  });
});
