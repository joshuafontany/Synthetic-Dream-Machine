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
  let pool: BrowserVesselIslandPool | null = null;
  let repo: Repo | null = null;

  afterEach(async () => {
    await pool?.disposeAll();
    pool = null;
    await repo?.shutdown();
    repo = null;
  });

  test("cold-boot path mounts without docUrl and emits no fault", async () => {
    const all = eventCollector();
    const islandId = "lar:///ha.ka.ba/bags/@test/browser-cold";

    repo = new Repo({ sharePolicy: async () => true });
    repo.create<{ tiddlers: Record<string, unknown> }>({ tiddlers: {} });

    pool = new BrowserVesselIslandPool({
      workerScriptUrl: FIXTURE_URL,
      mainRepo: repo,
      onWorkerEvent: (id, msg) => all.callback(id, msg),
    });

    await pool.mountWiki(islandId, {
      coreHash: null,
      recipe: { wikiSlug: "test" },
      grants: { islandUrl: "automerge:fixture-lararium-url" },
    });
    expect(pool.has(islandId)).toBe(true);

    await new Promise<void>((resolve) => setTimeout(resolve, 150));
    expect(all.events.every((e) => e.type !== "fault")).toBe(true);
  });

  test("docUrl non-null path resolves via repo.find(docUrl)", async () => {
    const all     = eventCollector();
    const changes = eventCollector("repo:change");
    const islandId = "lar:///ha.ka.ba/bags/@test/browser-docurl";

    repo = new Repo({ sharePolicy: async () => true });
    const docHandle = repo.create<{ tiddlers: Record<string, unknown> }>({ tiddlers: {} });

    pool = new BrowserVesselIslandPool({
      workerScriptUrl: FIXTURE_URL,
      mainRepo: repo,
      onWorkerEvent: (id, msg) => {
        all.callback(id, msg);
        changes.callback(id, msg);
      },
    });

    await pool.mountWiki(islandId, {
      coreHash: null,
      recipe: { wikiSlug: "test" },
      grants: { islandUrl: "automerge:fixture-lararium-url", wikiUrl: docHandle.url },
    });
    expect(pool.has(islandId)).toBe(true);

    const synced = await waitForEvent(all, (e) => e.listenable === "repo:synced");
    expect(synced.payload.usingDocUrl).toBe(true);

    docHandle.change((d) => {
      d.tiddlers["lar:///ha.ka.ba/bags/@test/browser-docurl/page"] = {
        title: "lar:///ha.ka.ba/bags/@test/browser-docurl/page",
        text:  "docurl",
      };
    });

    const change = await waitForEvent(changes, (e) => Number(e.payload.tiddlerCount) >= 1);
    expect(change.payload.usingDocUrl).toBe(true);
  });
});
