/**
 * federation-shore.test.ts — §8 archipelago gate (node-level pure Repo proof).
 *
 * Proves: two in-process Repos joined by a MessageChannel converge on the same
 * Automerge doc without any manifest payload, routeChangeset, or pool machinery.
 *
 * This is the Repo-level primitive that VesselIslandPool.mountWiki() and
 * BrowserVesselIslandPool.mountWiki() both rest on. When this gate holds, two
 * vessels sharing an AutomergeUrl converge without any explicit sync call —
 * the archipelago forms the moment the URL crosses the boundary.
 *
 * Island Sovereignty Law §8:
 *   When a grant in `manifest.grants` carries a non-empty AutomergeUrl, the vessel
 *   wires MessageChannelNetworkAdapter(mainPort) before delivering manifest; the
 *   island calls repo.find(docUrl).whenReady() before declaring ea. CRDT sync
 *   carries content — the manifest carries hash only.
 *
 * Gate proof: this file (node, pure Repo) +
 *             browser-repo-in-island.test.ts test 2 (browser pool).
 *
 * Meme: lar:///ha.ka.ba/lararium/node/federation-shore
 */

import { describe, test, expect } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import { MessageChannelNetworkAdapter } from "@automerge/automerge-repo-network-messagechannel";

describe("§8 federation shore — docUrl non-null, two Repos, one MessageChannel", () => {

  test("vessel doc change reaches island Repo via CRDT — no manifest payload", async () => {
    const { port1, port2 } = new MessageChannel();

    const vesselRepo = new Repo({
      network: [new MessageChannelNetworkAdapter(port1)],
      sharePolicy: async () => true,
    });
    const islandRepo = new Repo({
      network: [new MessageChannelNetworkAdapter(port2)],
      sharePolicy: async () => true,
    });

    // Vessel creates the doc. AutomergeUrl IS the capability token (§8).
    const wikiHandle = vesselRepo.create<{ tiddlers: Record<string, unknown> }>({ tiddlers: {} });

    // Island-side: find by URL, await CRDT sync — no bytes in the handshake.
    // repo.find() returns Promise<DocHandle>; whenReady() resolves when synced.
    const found = await islandRepo.find<{ tiddlers: Record<string, unknown> }>(wikiHandle.url);
    await found.whenReady();

    // Vessel writes a change after the island is synced.
    wikiHandle.change((d) => {
      d.tiddlers["lar:///ha.ka.ba/bags/test/federation/page"] = {
        title: "lar:///ha.ka.ba/bags/test/federation/page",
        text: "archipelago",
      };
    });

    // Island observes convergence via CRDT — no routeChangeset anywhere in the path.
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("timeout: island did not converge on vessel change")),
        5_000,
      );
      const check = () => {
        if (found.doc()?.tiddlers?.["lar:///ha.ka.ba/bags/test/federation/page"]) {
          clearTimeout(timer);
          resolve();
        }
      };
      found.on("change", check);
      check(); // already arrived?
    });

    expect(
      found.doc()?.tiddlers?.["lar:///ha.ka.ba/bags/test/federation/page"],
    ).toBeDefined();

    port1.close();
    port2.close();
    await vesselRepo.shutdown();
    await islandRepo.shutdown();
  }, 8_000);

  test("island change propagates back to vessel — channel is bidirectional", async () => {
    const { port1, port2 } = new MessageChannel();

    // Bidirectionality matters: the real island boot path writes `ea` back
    // through the same MessageChannelNetworkAdapter used to receive the manifest.
    const vesselRepo = new Repo({
      network: [new MessageChannelNetworkAdapter(port1)],
      sharePolicy: async () => true,
    });
    const islandRepo = new Repo({
      network: [new MessageChannelNetworkAdapter(port2)],
      sharePolicy: async () => true,
    });

    const wikiHandle = vesselRepo.create<{ tiddlers: Record<string, unknown> }>({ tiddlers: {} });
    const found = await islandRepo.find<{ tiddlers: Record<string, unknown> }>(wikiHandle.url);
    await found.whenReady();

    // Island writes — vessel observes via the same channel.
    found.change((d) => {
      d.tiddlers["lar:///ha.ka.ba/bags/test/federation/reply"] = {
        title: "lar:///ha.ka.ba/bags/test/federation/reply",
        text: "pono",
      };
    });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("timeout: vessel did not observe island change")),
        5_000,
      );
      const check = () => {
        if (wikiHandle.doc()?.tiddlers?.["lar:///ha.ka.ba/bags/test/federation/reply"]) {
          clearTimeout(timer);
          resolve();
        }
      };
      wikiHandle.on("change", check);
      check();
    });

    expect(
      wikiHandle.doc()?.tiddlers?.["lar:///ha.ka.ba/bags/test/federation/reply"],
    ).toBeDefined();

    port1.close();
    port2.close();
    await vesselRepo.shutdown();
    await islandRepo.shutdown();
  }, 8_000);
});
