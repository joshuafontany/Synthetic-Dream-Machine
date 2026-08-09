/**
 * nexus-doc.test — the DISK adapter for the bags/@nexus doc + the persona pet-name the
 * `lares persona`/`lares nexus seal seat` doors drive (#66).
 *
 * Proven:
 *   · a seated doc WRITES in house form and READS back byte-faithful (the roster round-trips through disk),
 *   · an absent doc reads null → FAIL CLOSED (the roster folds empty, the antigen inert),
 *   · a torn / missing roster block reads null → FAIL CLOSED,
 *   · the unseated scaffold NAMES NOBODY and round-trips to an inert roster,
 *   · the private pet-name the persona door sets round-trips through the node fs store,
 *   · the seat gesture (the roster FORMS from what declared + stood → seated keys → genesis epoch) raises a
 *     live roster, and the chair names come from the operator's declarations rather than from this build.
 */
import { afterEach, beforeEach, describe, test, expect } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  emptyFoundingCharterDoc, genesisSealEpochCid, rosterFromNexusDoc, foundingQuorumSeated,
  genesisCharterEpoch, sealKeySetHash, sealLineageHead,
  renameOwnPersona, ownPersonaPetname, declarePersonaHandle, standForKahuSeat,
  personasStandingForSeat, majorityThreshold, type NexusDoc, type NexusCharterKahu,
} from "@lararium/mesh";
import {
  readNexusDoc, writeNexusDoc, nexusCharterDocPath,
} from "../src/nexus-doc.js";
import {
  generateOrLoadPersonaGroupRoot, listPersonaRoots, makeNodePersonaPetnameStore,
  makeNodePersonaDeclarationStore,
} from "../src/node-vessel-identity.js";

const saved: Record<string, string | undefined> = {};
const setEnv = (k: string, v: string | undefined): void => {
  saved[k] = process.env[k];
  if (v === undefined) delete process.env[k]; else process.env[k] = v;
};

describe("nexus-doc — disk round-trip, fail-closed", () => {
  let bags: string;
  beforeEach(() => { bags = mkdtempSync(join(tmpdir(), "lares-nexusdoc-")); });
  afterEach(() => { rmSync(bags, { recursive: true, force: true }); });

  test("an absent doc reads null (fail closed → empty roster)", () => {
    expect(readNexusDoc(bags)).toBeNull();
    expect(rosterFromNexusDoc(readNexusDoc(bags)).keys).toEqual([]);
  });

  test("a seated doc writes in house form and reads back faithfully", () => {
    const keys = ["a".repeat(64), "b".repeat(64)];
    const doc: NexusDoc = {
      kind: "lar-nexus-doc/v1", threshold: 2,
      sealEpochCid: genesisSealEpochCid(keys, 2),
      kahu: [
        { displayName: "Kahu Alpha", verifyingKey: keys[0]! },
        { displayName: "Kahu Beta",        verifyingKey: keys[1]! },
        { displayName: "Kahu Gamma",        verifyingKey: null },
      ],
    };
    const path = writeNexusDoc(bags, doc);
    expect(path).toBe(nexusCharterDocPath(bags));
    const back = readNexusDoc(bags);
    expect(back).toEqual(doc);
    // fail-closed math: 2 seated + epoch → quorum stands
    expect(foundingQuorumSeated(back)).toBe(true);
    expect(rosterFromNexusDoc(back).keys.sort()).toEqual([...keys].sort());
  });

  test("★ the unseated scaffold NAMES NOBODY, and reads back exactly as an ABSENT doc does ★", () => {
    // A scaffold carrying names would make this BUILD decide who the founding kahu are; the roster forms at
    // the seat instead, from the personas that declared a Handle and stood for a chair.
    const scaffold = emptyFoundingCharterDoc();
    expect(scaffold.kahu).toEqual([]);
    expect(scaffold.threshold).toBe(0);

    // And `threshold: 0` reads as UNSET rather than as a satisfiable rule. The reader refuses it — a doc
    // claiming a zero threshold would be satisfied by NO signatures at all, which is the most dangerous rule
    // a roster could carry — so an unseated scaffold on disk generates identically to no doc at all. Both
    // fold to an inert roster, and neither can be mistaken for a seated one.
    writeNexusDoc(bags, scaffold);
    expect(readNexusDoc(bags)).toBeNull();
    expect(rosterFromNexusDoc(readNexusDoc(bags)).keys).toEqual([]);
    expect(foundingQuorumSeated(readNexusDoc(bags))).toBe(false);
  });

  test("a torn roster block reads null (never a partial guess into authority)", () => {
    const path = nexusCharterDocPath(bags);
    writeNexusDoc(bags, emptyFoundingCharterDoc());          // establish the dir + a valid file
    writeFileSync(path, "```json nexus-charter\n{ not: valid json ]\n```\n", "utf8");
    expect(readNexusDoc(bags)).toBeNull();
  });

  test("a wrong-kind block reads null", () => {
    const path = nexusCharterDocPath(bags);
    writeNexusDoc(bags, emptyFoundingCharterDoc());
    writeFileSync(path, "```json nexus-charter\n{ \"kind\": \"something-else\", \"threshold\": 2, \"kahu\": [] }\n```\n", "utf8");
    expect(readNexusDoc(bags)).toBeNull();
  });

  test("a pre-rotated CHAIN doc round-trips through disk + roots the roster on the head epoch (#68)", () => {
    const keys = ["a".repeat(64), "b".repeat(64)];
    const genesis = genesisCharterEpoch(keys, 2, sealKeySetHash(["c".repeat(64), "d".repeat(64)], 2));
    const doc: NexusDoc = {
      kind: "lar-nexus-doc/v1", threshold: 2,
      sealEpochCid: genesis.epochCid,
      sealLineage: [genesis],
      kahu: [
        { displayName: "Kahu Alpha", verifyingKey: keys[0]! },
        { displayName: "Kahu Beta",        verifyingKey: keys[1]! },
        { displayName: "Kahu Gamma",        verifyingKey: null },
      ],
    };
    writeNexusDoc(bags, doc);
    const back = readNexusDoc(bags);
    expect(back).toEqual(doc);                                          // the chain survives disk byte-faithful
    expect(sealLineageHead(back)!.epoch).toBe(0);
    expect(rosterFromNexusDoc(back).sealEpochCid).toBe(genesis.epochCid);   // antigen roots on the head
    expect(foundingQuorumSeated(back)).toBe(true);
  });

  test("a TORN chain block reads null (never a partial pre-rotation lineage into authority)", () => {
    const path = nexusCharterDocPath(bags);
    writeNexusDoc(bags, emptyFoundingCharterDoc());
    writeFileSync(path,
      "```json nexus-charter\n" +
      JSON.stringify({ kind: "lar-nexus-doc/v1", threshold: 2, kahu: [], sealLineage: [{ epoch: 0, epochCid: "e0" }] }) +
      "\n```\n", "utf8");
    expect(readNexusDoc(bags)).toBeNull();                        // an epoch missing keySetHash/nextKeyCommit → torn → closed
  });
});

describe("persona pet-name + seat gesture (the door's core)", () => {
  let root: string;
  let bags: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "lares-personaseat-"));
    bags = mkdtempSync(join(tmpdir(), "lares-personaseat-bags-"));
    setEnv("LAR_ROOT", undefined);
    setEnv("XDG_STATE_HOME", join(root, "state"));
    setEnv("XDG_DATA_HOME", join(root, "state"));   // identity/seal/library answer HERE
    setEnv("LARES_ARCHIVE_PASSPHRASE", undefined);
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(root, { recursive: true, force: true });
    rmSync(bags, { recursive: true, force: true });
  });

  test("the private pet-name set by `persona new` round-trips through the node store", async () => {
    const petnames = await makeNodePersonaPetnameStore();
    await generateOrLoadPersonaGroupRoot(root, 1);
    await renameOwnPersona(petnames, 1, "Kahu Beta");
    expect(await ownPersonaPetname(petnames, 1)).toBe("Kahu Beta");
  });

  test("seat gesture: the roster FORMS from what declared + stood → seated keys → genesis epoch → live roster", async () => {
    // The chair names below exist nowhere but in these declarations — no list ships in the build. The private
    // labels read deliberately unlike them, because the seat joins on the DECLARED HANDLE and a label-matching
    // join would weld a compartment's private name to a public commitment.
    const petnames     = await makeNodePersonaPetnameStore();
    const declarations = await makeNodePersonaDeclarationStore();
    const handles = ["Kahu Alpha", "Kahu Beta", "Kahu Gamma"];
    const labels  = ["work", "the-quiet-one", "burner"];
    for (let i = 0; i < handles.length; i++) {
      await generateOrLoadPersonaGroupRoot(root, i);
      await renameOwnPersona(petnames, i, labels[i]!);
      await declarePersonaHandle(declarations, i, handles[i]!);
      await standForKahuSeat(declarations, i, true);
    }

    // Replicate the seat gesture the CLI runs: every persona that declared AND stood takes a chair under the
    // name it declared, keyed by the root it holds.
    const held = new Set(await listPersonaRoots(root));
    const kahu: NexusCharterKahu[] = [];
    for (const [index, handle] of await personasStandingForSeat(declarations)) {
      if (!held.has(index)) continue;
      const rt = await generateOrLoadPersonaGroupRoot(root, index);
      kahu.push({ displayName: handle, verifyingKey: rt.verifyingKey });
    }
    const seated    = kahu.map((k) => k.verifyingKey).filter((v): v is string => Boolean(v));
    const threshold = majorityThreshold(kahu.length);          // 3 chairs → 2, derived, never a constant
    const doc: NexusDoc = {
      kind: emptyFoundingCharterDoc().kind, threshold,
      sealEpochCid: seated.length >= threshold ? genesisSealEpochCid(seated, threshold) : null,
      kahu,
    };
    writeNexusDoc(bags, doc);

    const back = readNexusDoc(bags);
    expect(existsSync(nexusCharterDocPath(bags))).toBe(true);
    expect(back?.kahu.map((k) => k.displayName)).toEqual(handles);   // the operator's names, not the build's
    expect(back?.threshold).toBe(2);
    expect(rosterFromNexusDoc(back).keys.length).toBe(3);
    expect(foundingQuorumSeated(back)).toBe(true);
  });
});
