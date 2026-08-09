/**
 * persona-petname-store.test — the node fs adapters for the two-layer pet-names (#64 stage 4).
 *
 * The PRIVATE own-persona label map + the PUBLIC own-published-face record, each a 0o600 JSON file in the
 * identity home outside every substrate wipe. The isomorphic logic (rename/multitude-view/glamour-mint) is
 * proven platform-blind in @lararium/mesh; THIS exercises the node shores round-trip + the never-federates
 * wall (nothing in the private store reaches a board) over the real fs vault.
 */
import { afterEach, beforeEach, describe, test, expect } from "vitest";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  renameOwnPersona, clearOwnPersonaPetname, ownPersonaPetname, personaMultitudeView,
  publishPersonaGlamour, publicHandleViewOf, type LarDoc,
} from "@lararium/mesh";
import {
  makeNodePersonaPetnameStore, makeNodePublicHandleStore, makeNodeFsPersonaVault,
  generateOrLoadPersonaGroupRoot,
} from "../src/node-vessel-identity.js";
import { larIdentityDir } from "../src/vessel-paths.js";

const saved: Record<string, string | undefined> = {};
const setEnv = (k: string, v: string | undefined): void => {
  saved[k] = process.env[k];
  if (v === undefined) delete process.env[k]; else process.env[k] = v;
};

/** A fake WHO board — just enough for announceToWhoFace (change() over an in-memory LarDoc). */
function makeFakeBoard(): { doc(): LarDoc; change(fn: (d: LarDoc) => void): void } {
  const d: LarDoc = { tiddlers: {} } as LarDoc;
  return { doc: () => d, change: (fn) => fn(d) };
}

const SEED = Uint8Array.from(Array.from({ length: 32 }, (_, i) => (i * 3 + 7) & 0xff));

describe("node persona pet-name stores (#64 stage 4)", () => {
  let root: string;
  const dataDir = () => root;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "lares-petname-"));
    setEnv("LAR_ROOT", undefined);
    setEnv("XDG_STATE_HOME", join(root, "state"));
    setEnv("XDG_DATA_HOME", join(root, "state"));   // identity/seal/library answer HERE
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(root, { recursive: true, force: true });
  });

  test("the PRIVATE label map round-trips: rename, entries, clear — a 0o600 file, no -h suffix needed", async () => {
    const store = await makeNodePersonaPetnameStore();
    await renameOwnPersona(store, 0, "work");
    await renameOwnPersona(store, 2, "the-guru");
    expect(await ownPersonaPetname(store, 0)).toBe("work");
    expect(await (await makeNodePersonaPetnameStore()).entries()).toEqual([[0, "work"], [2, "the-guru"]]);   // persists across store handles

    // The label lives in a dedicated identity-home file, never a persona-root nor a board.
    expect(readdirSync(larIdentityDir()).some((f) => f.startsWith(".persona-petnames"))).toBe(true);

    await clearOwnPersonaPetname(store, 0);
    expect(await ownPersonaPetname(store, 0)).toBeUndefined();
    expect(await store.entries()).toEqual([[2, "the-guru"]]);
  });

  test("the MULTITUDE-VIEW over the real fs vault: held roots + private labels + the one federated glamour", async () => {
    await generateOrLoadPersonaGroupRoot(dataDir(), 0);
    await generateOrLoadPersonaGroupRoot(dataDir(), 1);
    const petnames = await makeNodePersonaPetnameStore();
    const publicStore = await makeNodePublicHandleStore();
    await renameOwnPersona(petnames, 0, "work");
    await publishPersonaGlamour({ board: makeFakeBoard(), seed: SEED, handleIndex: 0, glamour: "Guru-Josh", now: 1000, store: publicStore });

    const vault = await makeNodeFsPersonaVault();
    const view = await personaMultitudeView(vault, petnames, publicHandleViewOf(publicStore));
    const byIndex = Object.fromEntries(view.map((e) => [e.handleIndex, e]));
    expect(view.map((e) => e.handleIndex)).toEqual([0, 1]);
    expect(byIndex[0]).toMatchObject({ petname: "work", heldHere: true, hasPublicHandle: true, glamour: "Guru-Josh" });
    expect(byIndex[1]).toMatchObject({ petname: null, heldHere: true, hasPublicHandle: false, glamour: null });
  });

  test("the private label never PUBLICLY federates — publishing a glamour leaves the private file off the board", async () => {
    const petnames = await makeNodePersonaPetnameStore();
    const publicStore = await makeNodePublicHandleStore();
    const board = makeFakeBoard();
    await renameOwnPersona(petnames, 0, "my-burner");
    await publishPersonaGlamour({ board, seed: SEED, handleIndex: 0, glamour: "Anon-Wanderer", now: 5, store: publicStore });

    expect(JSON.stringify(board.doc())).not.toContain("my-burner");
    expect(await ownPersonaPetname(petnames, 0)).toBe("my-burner");   // untouched by the publish
  });

  test("the PUBLIC record round-trips + advances the lineage across store handles (re-publish bumps version)", async () => {
    const board = makeFakeBoard();
    const first = await publishPersonaGlamour({ board, seed: SEED, handleIndex: 3, glamour: "v1", now: 10, store: await makeNodePublicHandleStore() });
    const second = await publishPersonaGlamour({ board, seed: SEED, handleIndex: 3, glamour: "v2", now: 20, store: await makeNodePublicHandleStore() });
    expect(first.version).toBe(1);
    expect(second.version).toBe(2);
    expect(second.prev).not.toBeNull();
    expect(await (await makeNodePublicHandleStore()).list()).toEqual([3]);
  });
});
