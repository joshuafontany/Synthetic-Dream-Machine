import { describe, test, expect, afterEach } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import { BrowserVesselIslandPool } from "../src/browser-vessel-island-pool.js";
import type { IslandMsg_Event } from "@lararium/mesh";

const FIXTURE_URL = new URL("./fixtures/browser-repo-in-island-echo.mjs", import.meta.url);

function eventCollector(filter?: string): {
  events: IslandMsg_Event[];
  callback: (wikiId: string, msg: IslandMsg_Event) => void;
} {
  const events: IslandMsg_Event[] = [];
  return {
    events,
    callback: (_wikiId, msg) => {
      if (!filter || msg.listenable === filter) events.push(msg);
    },
  };
}

function waitForEvent(
  collector: { events: IslandMsg_Event[] },
  predicate: (msg: IslandMsg_Event) => boolean,
  timeoutMs = 5000,
): Promise<IslandMsg_Event> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      const hit = collector.events.find(predicate);
      if (hit) {
        clearInterval(timer);
        resolve(hit);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error("timeout waiting for expected worker event"));
      }
    }, 20);
  });
}

describe("BrowserVesselIslandPool Repo-in-island gate", () => {
  let manager: BrowserVesselIslandPool | null = null;
  let repo: Repo | null = null;

  afterEach(async () => {
    await manager?.disposeAll();
    manager = null;
    await repo?.shutdown();
    repo = null;
  });

  test("cold-boot path acquires without docUrl and emits no fault", async () => {
    const all = eventCollector();

    repo = new Repo({ sharePolicy: async () => true });
    repo.create<{ tiddlers: Record<string, unknown> }>({ tiddlers: {} });
    const authorityId = "lar:///ha.ka.ba/@test/browser-cold";

    manager = new BrowserVesselIslandPool({
      workerScriptUrl: FIXTURE_URL,
      mainRepo: repo,
      onWorkerEvent: (id, msg) => {
        all.callback(id, msg);
      },
    });

    const acquired = await manager.acquire(authorityId, {
      authorityId,
      coreBlob: new Uint8Array([1]),
      pluginBlob: new Uint8Array(),
      bagStack: ["@test"],
      recipeUri: "lar:///ha.ka.ba/@test/recipe",
      docUrl: null,
    });
    expect(acquired.receipt.ok).toBe(true);

    await new Promise<void>((resolve) => setTimeout(resolve, 150));
    expect(all.events.every((e) => e.type !== "fault")).toBe(true);
    acquired.lease.release();
  });

  test("docUrl non-null path resolves via repo.find(docUrl)", async () => {
    const all = eventCollector();
    const changes = eventCollector("repo:change");

    repo = new Repo({ sharePolicy: async () => true });
    const docHandle = repo.create<{ tiddlers: Record<string, unknown> }>({ tiddlers: {} });
    const authorityId = "lar:///ha.ka.ba/@test/browser-docurl";

    manager = new BrowserVesselIslandPool({
      workerScriptUrl: FIXTURE_URL,
      mainRepo: repo,
      onWorkerEvent: (id, msg) => {
        all.callback(id, msg);
        changes.callback(id, msg);
      },
    });

    const acquired = await manager.acquire(authorityId, {
      authorityId,
      coreBlob: new Uint8Array([2]),
      pluginBlob: new Uint8Array(),
      bagStack: ["@test"],
      recipeUri: "lar:///ha.ka.ba/@test/recipe",
      docUrl: docHandle.url,
    });
    expect(acquired.receipt.ok).toBe(true);

    const synced = await waitForEvent(all, (e) => e.listenable === "repo:synced");
    expect(synced.payload.usingDocUrl).toBe(true);

    docHandle.change((d) => {
      d.tiddlers["lar:///ha.ka.ba/@test/browser-docurl/page"] = {
        title: "lar:///ha.ka.ba/@test/browser-docurl/page",
        text: "docurl",
      };
    });

    const change = await waitForEvent(changes, (e) => Number(e.payload.tiddlerCount) >= 1);
    expect(change.payload.usingDocUrl).toBe(true);
    acquired.lease.release();
  });
});