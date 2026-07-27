/**
 * browser-circle-panel.test.ts — the @daemon follow surface's data flow, over REAL IndexedDB.
 *
 * The panel is projection-rendered (a worker+camera boot vitest-browser can't easily drive), so these tests
 * stand the SHORES the panel rides: the vessel-side follow→list→unfollow round-trip against the IDB
 * circle-graph + handle-book (exactly what the circle-refresh / circle-remove main-verbs orchestrate), the
 * never-federates proof (the graph stays in the vessel's OWN IDB), and the pure panel-state shaping
 * (circlePanelStateArgs) the `circle-state` worker verb writes.
 */
import { describe, test, expect, afterEach } from "vitest";
import { signHandleCard, ed25519SignerFromSeed, derivePersonaKeypair, signingSeedFromHex, type FollowView } from "@lararium/mesh";
import {
  browserComposeFollow, browserComposeUnfollow, browserListFollows, makeBrowserCircleStore,
} from "../src/browser-circle-store.js";
import { circlePanelStateArgs } from "../src/circle-panel-state.js";

let created = 0;
const opened = new Set<string>();
function idb(): string { const n = `lares:test-circle-panel:${Date.now()}:${created++}`; opened.add(n); return n; }
function deleteIdb(name: string): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}
afterEach(async () => { for (const n of opened) await deleteIdb(n); opened.clear(); });

async function card(seedByte: number, glamour: string) {
  const { signingKey, verifyingKey: nym } = await derivePersonaKeypair(new Uint8Array(32).fill(seedByte), [0]);
  const c = await signHandleCard(
    { nym, glamour, version: 1, prev: null, expiry: Date.now() + 86_400_000, standing: null },
    ed25519SignerFromSeed(signingSeedFromHex(signingKey)),
  );
  return { nym, card: c };
}

describe("browser follow — the IoC graph, local + traceless (real IDB)", () => {
  test("follow lands in the vessel's OWN IDB graph, under the OWN names; federated:false", async () => {
    const name = idb();
    const { nym, card: c } = await card(3, "Discordia");
    const result = await browserComposeFollow({ idbName: name, nym, circleId: "following", petname: "my-eris", card: c });
    expect(result.federated).toBe(false);

    // The graph holds the edge in THIS vessel's IDB; the follow-view reads it back under the OWN names.
    expect(await makeBrowserCircleStore(name).members("following")).toEqual([nym]);
    const view = await browserListFollows("following", name);
    expect(view).toEqual([{ nym, petname: "my-eris", glamour: "Discordia" }]);
  });

  test("unfollow drops the edge (the book memory stays)", async () => {
    const name = idb();
    const { nym, card: c } = await card(7, "TheGuru");
    await browserComposeFollow({ idbName: name, nym, circleId: "following", petname: "guru", card: c });
    const un = await browserComposeUnfollow({ idbName: name, nym, circleId: "following" });
    expect(un.federated).toBe(false);
    expect(await makeBrowserCircleStore(name).members("following")).toEqual([]);
  });

  test("circlePanelStateArgs shapes the follow-view into the flat, positional, string-only field bag", () => {
    const follows: FollowView[] = [
      { nym: "aa".repeat(32), petname: "eris", glamour: "Discordia" },
      { nym: "bb".repeat(32), petname: null,   glamour: null },
    ];
    const args = circlePanelStateArgs("following", follows);
    expect(args.circle).toBe("following");
    expect(args.count).toBe("2");
    expect(args.list).toBe("0 1");
    expect(args["nym-0"]).toBe("aa".repeat(32));
    expect(args["petname-0"]).toBe("eris");
    expect(args["glamour-0"]).toBe("Discordia");
    expect(args["petname-1"]).toBe("");   // unnamed → blank, never a nym as a field name
    expect(args["glamour-1"]).toBe("");
  });
});
