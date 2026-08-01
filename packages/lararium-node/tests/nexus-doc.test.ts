/**
 * nexus-doc.test — the DISK adapter for the bags/@nexus doc + the persona pet-name the
 * `lares persona`/`lares nexus seal seat` doors drive (#66).
 *
 * Proven:
 *   · a seated doc WRITES in house form and READS back byte-faithful (the roster round-trips through disk),
 *   · an absent doc reads null → FAIL CLOSED (the roster folds empty, the antigen inert),
 *   · a torn / missing roster block reads null → FAIL CLOSED,
 *   · the unseated scaffold round-trips to an empty (inert) roster,
 *   · the private pet-name the persona door sets round-trips through the node fs store,
 *   · the seat gesture (pet-name match → seated verifying keys → genesis epoch) raises a live roster.
 */
import { afterEach, beforeEach, describe, test, expect } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  emptyFoundingCharterDoc, genesisSealEpochCid, rosterFromNexusDoc, foundingQuorumSeated,
  genesisCharterEpoch, sealKeySetHash, sealLineageHead,
  renameOwnPersona, ownPersonaPetname, type NexusDoc, type NexusCharterKahu,
} from "@lararium/mesh";
import {
  readNexusCharterDoc, writeNexusCharterDoc, nexusCharterDocPath,
} from "../src/nexus-doc.js";
import {
  generateOrLoadPersonaGroupRoot, listPersonaRoots, makeNodePersonaPetnameStore,
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
    expect(readNexusCharterDoc(bags)).toBeNull();
    expect(rosterFromNexusDoc(readNexusCharterDoc(bags)).keys).toEqual([]);
  });

  test("a seated doc writes in house form and reads back faithfully", () => {
    const keys = ["a".repeat(64), "b".repeat(64)];
    const doc: NexusDoc = {
      kind: "lar-nexus-charter/v1", threshold: 2,
      sealEpochCid: genesisSealEpochCid(keys, 2),
      kahu: [
        { displayName: "Guru Joshua Fontany", verifyingKey: keys[0]! },
        { displayName: "Telarus, KSC",        verifyingKey: keys[1]! },
        { displayName: "The Lindwyrm",        verifyingKey: null },
      ],
    };
    const path = writeNexusCharterDoc(bags, doc);
    expect(path).toBe(nexusCharterDocPath(bags));
    const back = readNexusCharterDoc(bags);
    expect(back).toEqual(doc);
    // fail-closed math: 2 seated + epoch → quorum stands
    expect(foundingQuorumSeated(back)).toBe(true);
    expect(rosterFromNexusDoc(back).keys.sort()).toEqual([...keys].sort());
  });

  test("the unseated scaffold round-trips to an inert roster", () => {
    writeNexusCharterDoc(bags, emptyFoundingCharterDoc());
    const back = readNexusCharterDoc(bags);
    expect(back?.kahu.length).toBe(3);
    expect(rosterFromNexusDoc(back).keys).toEqual([]);
    expect(foundingQuorumSeated(back)).toBe(false);
  });

  test("a torn roster block reads null (never a partial guess into authority)", () => {
    const path = nexusCharterDocPath(bags);
    writeNexusCharterDoc(bags, emptyFoundingCharterDoc());          // establish the dir + a valid file
    writeFileSync(path, "```json nexus-charter\n{ not: valid json ]\n```\n", "utf8");
    expect(readNexusCharterDoc(bags)).toBeNull();
  });

  test("a wrong-kind block reads null", () => {
    const path = nexusCharterDocPath(bags);
    writeNexusCharterDoc(bags, emptyFoundingCharterDoc());
    writeFileSync(path, "```json nexus-charter\n{ \"kind\": \"something-else\", \"threshold\": 2, \"kahu\": [] }\n```\n", "utf8");
    expect(readNexusCharterDoc(bags)).toBeNull();
  });

  test("a pre-rotated CHAIN doc round-trips through disk + roots the roster on the head epoch (#68)", () => {
    const keys = ["a".repeat(64), "b".repeat(64)];
    const genesis = genesisCharterEpoch(keys, 2, sealKeySetHash(["c".repeat(64), "d".repeat(64)], 2));
    const doc: NexusDoc = {
      kind: "lar-nexus-charter/v1", threshold: 2,
      sealEpochCid: genesis.epochCid,
      sealLineage: [genesis],
      kahu: [
        { displayName: "Guru Joshua Fontany", verifyingKey: keys[0]! },
        { displayName: "Telarus, KSC",        verifyingKey: keys[1]! },
        { displayName: "The Lindwyrm",        verifyingKey: null },
      ],
    };
    writeNexusCharterDoc(bags, doc);
    const back = readNexusCharterDoc(bags);
    expect(back).toEqual(doc);                                          // the chain survives disk byte-faithful
    expect(sealLineageHead(back)!.epoch).toBe(0);
    expect(rosterFromNexusDoc(back).sealEpochCid).toBe(genesis.epochCid);   // antigen roots on the head
    expect(foundingQuorumSeated(back)).toBe(true);
  });

  test("a TORN chain block reads null (never a partial pre-rotation lineage into authority)", () => {
    const path = nexusCharterDocPath(bags);
    writeNexusCharterDoc(bags, emptyFoundingCharterDoc());
    writeFileSync(path,
      "```json nexus-charter\n" +
      JSON.stringify({ kind: "lar-nexus-charter/v1", threshold: 2, kahu: [], sealLineage: [{ epoch: 0, epochCid: "e0" }] }) +
      "\n```\n", "utf8");
    expect(readNexusCharterDoc(bags)).toBeNull();                        // an epoch missing keySetHash/nextKeyCommit → torn → closed
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
    await renameOwnPersona(petnames, 1, "Telarus, KSC");
    expect(await ownPersonaPetname(petnames, 1)).toBe("Telarus, KSC");
  });

  test("seat gesture: three held personas → pet-name match → seated keys → genesis epoch → live roster", async () => {
    const petnames = await makeNodePersonaPetnameStore();
    const names = ["Guru Joshua Fontany", "Telarus, KSC", "The Lindwyrm"];
    for (let i = 0; i < names.length; i++) {
      await generateOrLoadPersonaGroupRoot(root, i);
      await renameOwnPersona(petnames, i, names[i]!);
    }
    // Replicate the seat gesture the CLI runs: read held roots' verifying keys, match by pet-name.
    const byPetname = new Map<string, string>();
    for (const index of await listPersonaRoots(root)) {
      const pn = await ownPersonaPetname(petnames, index);
      const rt = await generateOrLoadPersonaGroupRoot(root, index);
      if (pn) byPetname.set(pn.toLowerCase(), rt.verifyingKey);
    }
    const doc0 = emptyFoundingCharterDoc();
    const kahu: NexusCharterKahu[] = doc0.kahu.map((k) => ({
      displayName: k.displayName,
      verifyingKey: byPetname.get(k.displayName.toLowerCase()) ?? k.verifyingKey,
    }));
    const seated = kahu.map((k) => k.verifyingKey).filter((v): v is string => Boolean(v));
    const doc: NexusDoc = {
      kind: doc0.kind, threshold: doc0.threshold,
      sealEpochCid: seated.length >= doc0.threshold ? genesisSealEpochCid(seated, doc0.threshold) : null,
      kahu,
    };
    writeNexusCharterDoc(bags, doc);

    const back = readNexusCharterDoc(bags);
    expect(existsSync(nexusCharterDocPath(bags))).toBe(true);
    expect(rosterFromNexusDoc(back).keys.length).toBe(3);
    expect(foundingQuorumSeated(back)).toBe(true);
  });
});
