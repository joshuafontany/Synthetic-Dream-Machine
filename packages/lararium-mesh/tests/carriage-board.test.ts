/**
 * members-board.test.ts — the DOC face of the members-registry: write → read roundtrip, torn/foreign skip,
 * absent → empty, and the FLOOR-ONLY coercion (a forged tiddler's extra fields are dropped, never carried).
 *
 * Proven:
 *   · a well-formed admit/revoke tiddler roundtrips through write → read,
 *   · a foreign / torn / non-JSON tiddler is SKIPPED (never guessed into an entry),
 *   · an absent / empty board surfaces NO entries (fail-closed → no members),
 *   · extra smuggled fields (a fake "email") are DROPPED on read — only the operator-contract floor survives.
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import { hex } from "../src/crypto.js";
import { carriageEntriesFromBoard, writeCarriageEntry, carriageEntryKey } from "../src/carriage-board.js";
import { signCarriageQuorum, signCarriageContract, CARRIAGE_ENTRY_DOMAIN } from "../src/carriage-registry.js";
import { mutableLarRecord, type LarDoc } from "../src/base-doc.js";

const EPOCH = "epoch-cid-genesis";
const KAHU  = [new Uint8Array(32).fill(1), new Uint8Array(32).fill(2)];
const JOIN  = new Uint8Array(32).fill(5);
const signerOf = (seed: Uint8Array) => (bytes: Uint8Array) => ed.signAsync(bytes, seed).then(hex);
const pubOf    = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);
const emptyBoard = (): LarDoc => ({ tiddlers: {} }) as LarDoc;

async function admitEntry(version = 1) {
  const nym     = await pubOf(JOIN);
  const signers = await Promise.all(KAHU.map(async (s) => ({ signer: await pubOf(s), sign: signerOf(s) })));
  const cs      = await signCarriageContract(nym, EPOCH, signerOf(JOIN));
  return signCarriageQuorum({ nym, action: "admit", version, sealEpochCid: EPOCH }, signers, cs);
}

describe("members-board — write/read roundtrip + fail-closed extraction", () => {
  test("a well-formed admit tiddler roundtrips (signatures + contract-in survive the write)", async () => {
    const entry = await admitEntry();
    const board = emptyBoard();
    writeCarriageEntry(board, entry);
    const read = carriageEntriesFromBoard(board);
    expect(read).toHaveLength(1);
    expect(read[0]).toMatchObject({ nym: entry.nym, action: "admit", version: 1, sealEpochCid: EPOCH });
    expect(read[0]!.signatures).toHaveLength(2);
    expect(read[0]!.contractSig?.signer).toBe(entry.nym);
  });

  test("a foreign / non-JSON / torn tiddler is SKIPPED", async () => {
    const board = emptyBoard();
    writeCarriageEntry(board, await admitEntry());
    board.tiddlers["lar:///some/foreign/tiddler"] = mutableLarRecord("lar:///some/foreign/tiddler", { text: "not json {" }, EPOCH);
    board.tiddlers["lar:///another"] = mutableLarRecord("lar:///another", { text: JSON.stringify({ kind: "something-else" }) }, EPOCH);
    expect(carriageEntriesFromBoard(board)).toHaveLength(1);   // only the real one
  });

  test("an absent / empty board surfaces NO entries (fail-closed)", () => {
    expect(carriageEntriesFromBoard(null)).toHaveLength(0);
    expect(carriageEntriesFromBoard(undefined)).toHaveLength(0);
    expect(carriageEntriesFromBoard(emptyBoard())).toHaveLength(0);
  });

  test("FLOOR-ONLY — a smuggled identity field is DROPPED on read (track contracts, never identities)", async () => {
    const entry = await admitEntry();
    const board = emptyBoard();
    // A forged tiddler carrying a valid-shaped entry PLUS an extra "email" — the coercer copies the floor alone.
    const smuggled = { ...entry, email: "who@example.com", displayName: "Real Name" };
    const key = carriageEntryKey(entry.nym, entry.action, entry.version);
    board.tiddlers[key] = mutableLarRecord(key, { text: JSON.stringify(smuggled) }, EPOCH);
    const read = carriageEntriesFromBoard(board);
    expect(read).toHaveLength(1);
    expect(Object.keys(read[0]!).sort()).toEqual(["action", "contractSig", "kind", "nym", "sealEpochCid", "signatures", "version"]);
    expect(read[0]).not.toHaveProperty("email");
    expect(read[0]).not.toHaveProperty("displayName");
    expect(read[0]!.kind).toBe(CARRIAGE_ENTRY_DOMAIN);
  });
});
