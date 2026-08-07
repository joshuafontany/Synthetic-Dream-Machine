/**
 * browser-persona-petname.test.ts — the browser IDB adapters for the two-layer pet-names (#64 stage 4).
 *
 * The PRIVATE own-persona label map + the PUBLIC own-published-face record, over the origin's REAL
 * IndexedDB — no mock, no fake-indexeddb. The isomorphic logic (rename/multitude-view/glamour-mint) is
 * proven platform-blind in @lararium/mesh; THIS stands the browser shores round-trip + the never-federates
 * wall over the SAME mesh core the node fs stores ride.
 */
import { describe, test, expect, afterEach } from "vitest";
import {
  renameOwnPersona, clearOwnPersonaPetname, ownPersonaPetname, personaMultitudeView,
  publishPersonaGlamour, publicHandleViewOf, type LarDoc,
} from "@lararium/mesh";
import {
  generateOrLoadBrowserPersonaRoot, makeBrowserIdbPersonaVault,
  makeBrowserPersonaPetnameStore, makeBrowserPublicHandleStore,
} from "../src/browser-vessel-identity.js";

let created = 0;
const opened = new Set<string>();
function idb(): string { const n = `lares:test-petname:${Date.now()}:${created++}`; opened.add(n); return n; }
function deleteIdb(name: string): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}
afterEach(async () => { for (const n of opened) await deleteIdb(n); opened.clear(); });

function makeFakeBoard(): { doc(): LarDoc; change(fn: (d: LarDoc) => void): void } {
  const d: LarDoc = { tiddlers: {} } as LarDoc;
  return { doc: () => d, change: (fn) => fn(d) };
}
const SEED = Uint8Array.from(Array.from({ length: 32 }, (_, i) => (i * 9 + 2) & 0xff));

describe("the browser pet-name stores over IndexedDB (#64 stage 4)", () => {
  test("the PRIVATE label map round-trips over IDB: rename, entries, clear", async () => {
    const name = idb();
    const store = await makeBrowserPersonaPetnameStore(name);
    await renameOwnPersona(store, 0, "work");
    await renameOwnPersona(store, 2, "the-guru");
    expect(await ownPersonaPetname(store, 0)).toBe("work");
    // Persists across store handles (a fresh handle over the same DB reads the same labels).
    expect(await (await makeBrowserPersonaPetnameStore(name)).entries()).toEqual([[0, "work"], [2, "the-guru"]]);
    await clearOwnPersonaPetname(store, 0);
    expect(await ownPersonaPetname(store, 0)).toBeUndefined();
    expect(await store.entries()).toEqual([[2, "the-guru"]]);
  });

  test("the MULTITUDE-VIEW over the real IDB vault: held roots + private labels + the one federated glamour", async () => {
    const name = idb();
    await generateOrLoadBrowserPersonaRoot(name, 0);
    await generateOrLoadBrowserPersonaRoot(name, 1);
    const petnames = await makeBrowserPersonaPetnameStore(name);
    const publicStore = await makeBrowserPublicHandleStore(name);
    await renameOwnPersona(petnames, 0, "work");
    await publishPersonaGlamour({ board: makeFakeBoard(), seed: SEED, handleIndex: 0, glamour: "Guru-Josh", now: 1000, store: publicStore });

    const vault = await makeBrowserIdbPersonaVault(name);
    const view = await personaMultitudeView(vault, petnames, publicHandleViewOf(publicStore));
    const byIndex = Object.fromEntries(view.map((e) => [e.handleIndex, e]));
    expect(view.map((e) => e.handleIndex)).toEqual([0, 1]);
    expect(byIndex[0]).toMatchObject({ petname: "work", heldHere: true, hasPublicHandle: true, glamour: "Guru-Josh" });
    expect(byIndex[1]).toMatchObject({ petname: null, heldHere: true, hasPublicHandle: false, glamour: null });
  });

  test("the private label never PUBLICLY federates — publishing a glamour leaves the label off the board", async () => {
    const name = idb();
    const petnames = await makeBrowserPersonaPetnameStore(name);
    const publicStore = await makeBrowserPublicHandleStore(name);
    const board = makeFakeBoard();
    await renameOwnPersona(petnames, 0, "my-burner");
    await publishPersonaGlamour({ board, seed: SEED, handleIndex: 0, glamour: "Anon-Wanderer", now: 5, store: publicStore });
    expect(JSON.stringify(board.doc())).not.toContain("my-burner");
    expect(await ownPersonaPetname(petnames, 0)).toBe("my-burner");
  });

  test("the PUBLIC record round-trips + advances the lineage over IDB (re-publish bumps version)", async () => {
    const name = idb();
    const board = makeFakeBoard();
    const first = await publishPersonaGlamour({ board, seed: SEED, handleIndex: 3, glamour: "v1", now: 10, store: await makeBrowserPublicHandleStore(name) });
    const second = await publishPersonaGlamour({ board, seed: SEED, handleIndex: 3, glamour: "v2", now: 20, store: await makeBrowserPublicHandleStore(name) });
    expect(first.version).toBe(1);
    expect(second.version).toBe(2);
    expect(second.prev).not.toBeNull();
    expect(await (await makeBrowserPublicHandleStore(name)).list()).toEqual([3]);
  });
});
