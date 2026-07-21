/**
 * persona-kel-board.test — the DOC face of the persona-KEL + its federatable siting.
 *
 * Proven:
 *   · a KEL round-trips through the board: write inception + rotation → read back → chainForPrefix →
 *     headOpKey lands the CURRENT head (the pin-move reads its authority off the board, not a frozen key),
 *   · the board holds MANY personas' KELs keyed by {prefix}/{seq}; each reads back as its own chain,
 *   · a torn / foreign / non-KEL tiddler is SKIPPED (permissive extraction; trust rides the downstream verify),
 *   · an absent / empty board surfaces NO chain → fail-closed (a prefix resolves to null, the walk denies),
 *   · the board is DETERMINISTICALLY sited and FEDERATABLE — a stranger computes its url cold and the
 *     DeterministicFederationGate volunteers it (the identifier→head mapping crosses the always-carried plane).
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import { interpretAsDocumentId, type DocumentId } from "@automerge/automerge-repo";
import { hex } from "../src/crypto.js";
import { emptyLarDoc, type LarDoc } from "../src/base-doc.js";
import { headOpKey, type PersonaKelEvent } from "../src/persona-kel.js";
import {
  writePersonaKelEvent, personaKelEventsFromBoard, personaKelChainsFromBoard, personaKelChainForPrefix,
} from "../src/persona-kel-board.js";
import { provisionThresholdRecoveryAtFounding, attestAndRotate } from "../src/recovery-keel-core.js";
import { personaKelBoardDocUrl } from "../src/deterministic-doc.js";
import { DeterministicFederationGate } from "../src/federation-gate.js";

const SEEDS = {
  opA: new Uint8Array(32).fill(11), opB: new Uint8Array(32).fill(22),
  other: new Uint8Array(32).fill(55),
  g1: new Uint8Array(32).fill(1), g2: new Uint8Array(32).fill(2), g3: new Uint8Array(32).fill(3),
};
const pubOf = (s: Uint8Array) => ed.getPublicKeyAsync(s).then(hex);
const didOf = async (s: Uint8Array) => `0x${await pubOf(s)}`;
const guardianSigner = async (s: Uint8Array) => ({ signer: await pubOf(s), sign: async (b: Uint8Array) => hex(await ed.signAsync(b, s)) });

async function foundedInception(opSeed: Uint8Array, threshold = 2) {
  const foundingOpKeyDid = await didOf(opSeed);
  const guardianRecoveryKeys = await Promise.all([pubOf(SEEDS.g1), pubOf(SEEDS.g2), pubOf(SEEDS.g3)]);
  const prov = provisionThresholdRecoveryAtFounding({ foundingOpKeyDid, guardianRecoveryKeys, recoveryThreshold: threshold });
  return { guardianRecoveryKeys, ...prov };
}

/** A board is just a LarDoc the writer mutates — a test needs no Automerge handle to exercise the reader. */
function boardWith(...events: PersonaKelEvent[]): LarDoc {
  const doc = emptyLarDoc();
  for (const e of events) writePersonaKelEvent(doc, e);
  return doc;
}

describe("persona-kel-board — the board round-trips a KEL to its head", () => {
  test("write inception + rotation → read the chain → headOpKey lands the CURRENT head", async () => {
    const { inception, guardianRecoveryKeys, recoveryThreshold } = await foundedInception(SEEDS.opA);
    const freshOpKeyDid = await didOf(SEEDS.opB);
    const rot = await attestAndRotate({
      head: inception, freshOpKeyDid, guardianRecoveryKeys, recoveryThreshold,
      guardianSigners: await Promise.all([guardianSigner(SEEDS.g1), guardianSigner(SEEDS.g2)]),
    });
    expect(rot.ok).toBe(true);
    if (!rot.ok) return;

    // The board carries the events OUT OF ORDER; the reader must sort them into the lineage.
    const board = boardWith(rot.event, inception);
    const chain = personaKelChainForPrefix(board, inception.prefix);
    expect(chain).not.toBeNull();
    expect(chain!.map((e) => e.seq)).toEqual([0, 1]);            // seq-sorted lineage
    expect(chain![0]!.eventCid).toBe(inception.eventCid);
    // The head the pin-move walks to is the ROTATED op-key (structural + rotation-quorum verified).
    expect(await headOpKey(chain!, { verifyQuorums: true })).toBe(freshOpKeyDid);
  });

  test("the board holds MANY personas' KELs; each reads back as its own chain (keyed by prefix)", async () => {
    const a = await foundedInception(SEEDS.opA);
    const b = await foundedInception(SEEDS.other);
    expect(a.inception.prefix).not.toBe(b.inception.prefix);

    const board = boardWith(a.inception, b.inception);
    const chains = personaKelChainsFromBoard(board);
    expect(chains.size).toBe(2);
    expect(personaKelChainForPrefix(board, a.inception.prefix)![0]!.opKeyDid).toBe(a.inception.opKeyDid);
    expect(personaKelChainForPrefix(board, b.inception.prefix)![0]!.opKeyDid).toBe(b.inception.opKeyDid);
  });

  test("a torn / foreign / non-KEL tiddler is SKIPPED (permissive extraction)", async () => {
    const { inception } = await foundedInception(SEEDS.opA);
    const board = boardWith(inception);
    // A foreign tiddler with valid-JSON-but-not-a-KEL text, and a non-JSON tiddler.
    board.tiddlers["lar:///foreign"] = { tiddler: { title: "lar:///foreign", text: JSON.stringify({ hello: 1 }) }, meta: { authority: "x" } };
    board.tiddlers["lar:///garble"]  = { tiddler: { title: "lar:///garble",  text: "not json {{{" }, meta: { authority: "x" } };
    const events = personaKelEventsFromBoard(board);
    expect(events).toHaveLength(1);                              // only the real KEL event survived
    expect(events[0]!.eventCid).toBe(inception.eventCid);
  });

  test("an absent / empty board surfaces NO chain — fail-closed (the walk denies)", () => {
    expect(personaKelEventsFromBoard(null)).toEqual([]);
    expect(personaKelEventsFromBoard(undefined)).toEqual([]);
    expect(personaKelChainForPrefix(emptyLarDoc(), "persona-anything")).toBeNull();
  });
});

describe("persona-kel-board — deterministic siting + federatable (a stranger walks it cold)", () => {
  const NEXUS = "ab".repeat(32);

  test("the board url is a pure function of the Nexus key — stable + stranger-computable", () => {
    expect(personaKelBoardDocUrl(NEXUS)).toBe(personaKelBoardDocUrl(NEXUS));   // deterministic
    expect(personaKelBoardDocUrl(NEXUS)).not.toBe(personaKelBoardDocUrl("cd".repeat(32)));
  });

  test("the DeterministicFederationGate volunteers the KEL board (federates on the floor)", () => {
    const gate = new DeterministicFederationGate(NEXUS);
    const kelId = interpretAsDocumentId(personaKelBoardDocUrl(NEXUS)) as DocumentId;
    expect(gate.mayFederate(kelId)).toBe(true);
    // A private-plane / unrelated doc id stays deny-by-default (the KEL board is the ONLY new federatable surface).
    expect(gate.mayFederate("some-unrelated-doc-id" as unknown as DocumentId)).toBe(false);
  });
});
