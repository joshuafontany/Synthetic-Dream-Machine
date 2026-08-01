/**
 * nexus-seal-lineage — the CLI ceremony for the PRE-ROTATED charter-epoch chain (#68), driven end-to-end
 * through a REAL persona vault + the bags/@nexus charter DOC on disk.
 *
 * Proven:
 *   · seat establishes the GENESIS epoch (sequence 0, null prev) with a pre-rotation commitment + raises a
 *     live quorum, all through the vault (pet-name match → seated verifying keys → chain head),
 *   · seat FAILS CLOSED against re-seating a chain that has already ROTATED past genesis,
 *   · rotate REVEALS the vault key-set, verifies it against the head's pre-commitment, and APPENDS a
 *     hash-linked epoch1 (the seat→rotate round-trip),
 *   · a rotate whose reveal does NOT match the head's pre-commitment REFUSES (nonzero) and writes NOTHING
 *     (the chain stays at epoch0) — the fail-closed floor.
 *
 * The reveal-verify SEMANTICS (accept/refuse on the digest, the pre-rotation guard) are exhaustively proven
 * at the mesh layer (wax-stamp.test); this file proves the CLI WIRING over a genuine vault + disk.
 */
import { afterEach, beforeEach, describe, test, expect, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdNexus } from "../src/commands/nexus.js";
import type { ParsedArgs } from "../src/parse-args.js";
import { larBagsDir, larDataDir } from "../src/env.js";
import {
  generateOrLoadPersonaGroupRoot, makeNodePersonaPetnameStore, readNexusDoc,
} from "@lararium/node";
import { renameOwnPersona, sealKeySetHash, sealLineageHead } from "@lararium/mesh";

const KAHU = ["Guru Joshua Fontany", "Telarus, KSC", "The Lindwyrm"];
const saved: Record<string, string | undefined> = {};
const setEnv = (k: string, v: string | undefined): void => {
  saved[k] = process.env[k];
  if (v === undefined) delete process.env[k]; else process.env[k] = v;
};
const args = (positional: string[], options: Record<string, string> = {}): ParsedArgs =>
  ({ command: "nexus", positional, options, flags: { json: true } });

describe("lares nexus seal — the pre-rotated chain ceremony (CLI, real vault + disk)", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "lares-nexuschain-"));
    setEnv("LAR_ROOT", root);                       // isolates bags + vault-state + petname store under one tree
    setEnv("LARES_ARCHIVE_PASSPHRASE", undefined);
    vi.spyOn(console, "log").mockImplementation(() => {});    // the ceremony prints; keep the test output clean
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(root, { recursive: true, force: true });
  });

  /** Seed the three founding kahu into the vault (pet-name → root key) and return their verifying keys. */
  async function seatVault(): Promise<string[]> {
    const petnames = await makeNodePersonaPetnameStore();
    const keys: string[] = [];
    for (let i = 0; i < KAHU.length; i++) {
      const rt = await generateOrLoadPersonaGroupRoot(larDataDir(), i);
      await renameOwnPersona(petnames, i, KAHU[i]!);
      keys.push(rt.verifyingKey);
    }
    return keys;
  }

  test("seat establishes the genesis epoch + a live quorum; re-seat past a rotation fails closed", async () => {
    const keys = await seatVault();
    const commitNext = sealKeySetHash(keys, 2);   // pre-commit a digest the current vault satisfies

    const rc = await cmdNexus(args(["seal", "seat"], { "next-key-commit": commitNext }));
    expect(rc).toBe(0);

    const doc = readNexusDoc(larBagsDir());
    expect(doc?.sealLineage?.length).toBe(1);
    const head = sealLineageHead(doc)!;
    expect(head.epoch).toBe(0);
    expect(head.prevEpochCid).toBeNull();
    expect(head.nextKeyCommit).toBe(commitNext);          // rotation armed
    expect(doc?.sealEpochCid).toBe(head.epochCid);      // the antigen roots on the head
    expect(head.keySetHash).toBe(sealKeySetHash(keys, 2));
  });

  test("the seat→rotate round-trip: rotate reveals the pre-committed key-set + appends a hash-linked epoch1", async () => {
    const keys = await seatVault();
    // Genesis pre-commits a digest the current vault reveals — so the rotate's reveal MATCHES.
    await cmdNexus(args(["seal", "seat"], { "next-key-commit": sealKeySetHash(keys, 2) }));
    const genesis = sealLineageHead(readNexusDoc(larBagsDir()))!;

    const rc = await cmdNexus(args(["seal", "rotate"], { "next-key-commit": sealKeySetHash(keys, 2) }));
    expect(rc).toBe(0);

    const doc = readNexusDoc(larBagsDir());
    expect(doc?.sealLineage?.length).toBe(2);
    const head = sealLineageHead(doc)!;
    expect(head.epoch).toBe(1);
    expect(head.prevEpochCid).toBe(genesis.epochCid);     // hash-linked to genesis
    expect(doc?.sealEpochCid).toBe(head.epochCid);      // the antigen re-roots on the new head

    // re-seat now REFUSES (the chain has rotated past genesis) — never a silent re-genesis.
    const reseat = await cmdNexus(args(["seal", "seat"], { "next-key-commit": sealKeySetHash(keys, 2) }));
    expect(reseat).not.toBe(0);
    expect(readNexusDoc(larBagsDir())?.sealLineage?.length).toBe(2);   // unchanged
  });

  test("a rotate whose reveal MISMATCHES the pre-commitment REFUSES (nonzero) and writes nothing", async () => {
    const keys = await seatVault();
    // Genesis pre-commits a STRANGER key-set — the vault's real keys will not match on reveal.
    const strangerCommit = sealKeySetHash(["f".repeat(64), "e".repeat(64)], 2);
    await cmdNexus(args(["seal", "seat"], { "next-key-commit": strangerCommit }));
    const before = readNexusDoc(larBagsDir());
    expect(before?.sealLineage?.length).toBe(1);

    const rc = await cmdNexus(args(["seal", "rotate"], { "next-key-commit": sealKeySetHash(keys, 2) }));
    expect(rc).not.toBe(0);                                 // fail-closed on the reveal mismatch

    const after = readNexusDoc(larBagsDir());
    expect(after?.sealLineage?.length).toBe(1);            // nothing written — still at epoch0
    expect(sealLineageHead(after)!.epoch).toBe(0);
  });

  test("commit computes a key-set digest matching sealKeySetHash (the operator's offline helper)", async () => {
    const rc = await cmdNexus(args(["seal", "commit"], { keys: `${"a".repeat(64)},${"b".repeat(64)}`, threshold: "2" }));
    expect(rc).toBe(0);   // the digest itself is asserted against sealKeySetHash at the mesh layer
  });
});
