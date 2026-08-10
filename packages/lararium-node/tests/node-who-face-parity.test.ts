/**
 * node-who-face-parity — the ANCHOR and its LEAVES resolve the ONE WHO board.
 *
 * `openNodeVessel` composes whoFaceCap with its own gate key; a browser leaf composes the same cap with the
 * relayGatePubKey it dials. Those name the SAME string (a node anchors its confederation, so its gate key IS
 * the Nexus key its leaves pass back), and both sides reach the board through the deterministic @crossroads
 * address. This witnesses that construction end-to-end: two independently-composed vessels, wired exactly as
 * the two openers wire them, land on one board and one composite layer — and neither publishes a face.
 *
 * Proving it here rather than through a live boot keeps the witness runnable: openNodeVessel founds a hearth.
 *
 * Canon: lar:///ha.ka.ba/lararium/docs/crossroads
 */
import { describe, test, expect } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import {
  whoFaceCap, WHO_FACE_CAP, type WhoFaceComponent,
  composeVessel, type CapModule,
  CompositeStore, HandleBook,
  materializeSharedLarDoc, crossroadsDocUrl,
  nexusHandlesUri, tiddlerText,
} from "@lararium/mesh";

/** The node's own gate key — the value it hands its leaves as relayGatePubKey. */
const ANCHOR_GATE_KEY = "9f3c1a77b20e4d6688aa5510cc73ef02";

/** Stand in for the vessel core — the WHO cap needs only the composite it layers the board into. */
function substrateStub(composite: CompositeStore): CapModule {
  return { id: "substrate", requires: [], build: () => ({ composite }) };
}

/** Compose the WHO plane the way an opener does: materialize @crossroads deterministically, then wire the cap. */
async function composeWhoPlane(repo: Repo, nexusPubkey: string, composite: CompositeStore) {
  const crossroadsHandle = await materializeSharedLarDoc(repo, crossroadsDocUrl(nexusPubkey), "board:crossroads");
  const vessel = await composeVessel([
    substrateStub(composite),
    whoFaceCap({ repo, crossroadsHandle, nexusPubkey }),
  ]);
  return { vessel, crossroadsHandle, who: vessel.get<WhoFaceComponent>(WHO_FACE_CAP)! };
}

describe("node WHO-plane parity — anchor and leaf reach one board", () => {
  test("the anchor's gate key and a leaf's relayGatePubKey resolve the SAME board + layer", { timeout: 20_000 }, async () => {
    const repo = new Repo({ sharePolicy: async () => true });

    // the ANCHOR composes with its own gate key (openNodeVessel's wiring) …
    const anchorComposite = new CompositeStore();
    const anchor = await composeWhoPlane(repo, ANCHOR_GATE_KEY, anchorComposite);

    // … and a LEAF composes with the relayGatePubKey it dialled — the anchor's key, handed back
    const leafComposite = new CompositeStore();
    const leaf = await composeWhoPlane(repo, ANCHOR_GATE_KEY, leafComposite);

    // both reached the one deterministic @crossroads, hence the one advertised board
    expect(leaf.crossroadsHandle.url).toBe(anchor.crossroadsHandle.url);
    expect(leaf.who.handle.url).toBe(anchor.who.handle.url);

    // and each layered THAT board into its own composite under the one per-Nexus bag id
    const bagId = nexusHandlesUri(ANCHOR_GATE_KEY);
    expect(anchorComposite.layerIds).toContain(bagId);
    expect(leafComposite.layerIds).toContain(bagId);
    expect(tiddlerText(anchor.crossroadsHandle.doc()?.tiddlers?.[bagId])).toBe(anchor.who.handle.url);

    await anchor.vessel.dispose(); await leaf.vessel.dispose();
  });

  test("a node composing the WHO plane announces NOTHING — recognition without disclosure", { timeout: 20_000 }, async () => {
    const repo = new Repo({ sharePolicy: async () => true });
    const anchor = await composeWhoPlane(repo, ANCHOR_GATE_KEY, new CompositeStore());

    // the board resolved, and it carries no card at all — boot binds the vessel, it never announces it
    const book = new HandleBook();
    const verdicts = await anchor.who.ingest(book);
    expect(verdicts.size).toBe(0);

    await anchor.vessel.dispose();
  });

  test("a DIFFERENT Nexus key reaches a DIFFERENT board — the island scopes the WHO plane", { timeout: 20_000 }, async () => {
    const repo = new Repo({ sharePolicy: async () => true });
    const ours   = await composeWhoPlane(repo, ANCHOR_GATE_KEY, new CompositeStore());
    const theirs = await composeWhoPlane(repo, "0011223344556677889900aabbccddee", new CompositeStore());

    expect(theirs.who.handle.url).not.toBe(ours.who.handle.url);

    await ours.vessel.dispose(); await theirs.vessel.dispose();
  });
});
