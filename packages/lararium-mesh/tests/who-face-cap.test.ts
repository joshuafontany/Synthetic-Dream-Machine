/**
 * who-face-cap.test.ts — the isomorphic WHO-plane cap, through the real compose engine.
 *
 * Proven: composing whoFaceCap resolves the Nexus's WHO board through @crossroads, self-announces the
 * vessel's card, layers the board into the substrate composite (writable, so a relay syncs it), and exposes
 * an ingest that recognises what's on the board. This is the vessel-boot unit both node and browser compose.
 */
import { describe, test, expect } from "vitest";
import { Repo, type DocHandle } from "@automerge/automerge-repo";
import * as ed from "@noble/ed25519";
import { composeVessel, type CapModule } from "../src/cap-compose.js";
import { whoFaceCap, WHO_FACE_CAP, type WhoFaceComponent } from "../src/who-face-cap.js";
import { CompositeStore } from "../src/composite-store.js";
import { HandleBook } from "../src/handle-book.js";
import { signHandleCard, type HandleCard } from "../src/handle-card.js";
import { emptyLarDoc, tiddlerText, type LarDoc } from "../src/base-doc.js";
import { nexusHandlesUri } from "../src/lar-uris.js";
import { hex } from "../src/crypto.js";

const FASTJACK_SEED = new Uint8Array(32).fill(9);
const NEXUS = "abcdef0123456789";
const signer = (seed: Uint8Array) => (bytes: Uint8Array) => ed.signAsync(bytes, seed).then(hex);
const pubOf  = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);

async function publish(seed: Uint8Array, glamour: string): Promise<HandleCard> {
  return signHandleCard({
    nym: await pubOf(seed), glamour, version: 1, prev: null, expiry: 4_000_000_000_000, standing: null,
  }, signer(seed));
}

/** A minimal substrate cap standing in for the vessel core — only the composite the WHO cap layers into. */
function substrateStub(composite: CompositeStore): CapModule {
  return { id: "substrate", requires: [], build: () => ({ composite }) };
}

describe("whoFaceCap — the isomorphic WHO-plane vessel cap", () => {
  test("composing it resolves the board, self-announces the card, and layers the board writable", { timeout: 15_000 }, async () => {
    const repo = new Repo({ sharePolicy: async () => true });
    const crossroads = repo.create<LarDoc>(emptyLarDoc());
    const composite = new CompositeStore();
    const card = await publish(FASTJACK_SEED, "FastJack");

    const v = await composeVessel([
      substrateStub(composite),
      whoFaceCap({ repo, crossroadsHandle: crossroads, nexusPubkey: NEXUS, card }),
    ]);
    const who = v.get<WhoFaceComponent>(WHO_FACE_CAP)!;

    // self-announced: ingesting the board recognises this vessel's own Handle
    const book = new HandleBook();
    await who.ingest(book);
    expect(book.get(await pubOf(FASTJACK_SEED))?.card.glamour).toBe("FastJack");

    // @crossroads advertises the board; the composite carries the board layer (so a relay syncs it)
    expect(tiddlerText(crossroads.doc()?.tiddlers?.[nexusHandlesUri(NEXUS)])).toBe(who.handle.url);
    expect(composite.layerIds).toContain(nexusHandlesUri(NEXUS));

    await v.dispose();
  });

  test("a second vessel on the SAME nexus resolves the SAME board — one shared island board", { timeout: 15_000 }, async () => {
    const repo = new Repo({ sharePolicy: async () => true });
    const crossroads = repo.create<LarDoc>(emptyLarDoc());
    const cardA = await publish(FASTJACK_SEED, "FastJack");
    const cardB = await publish(new Uint8Array(32).fill(22), "Dodger");

    // vessel A composes, then vessel B composes over the SAME @crossroads
    const vA = await composeVessel([substrateStub(new CompositeStore()),
      whoFaceCap({ repo, crossroadsHandle: crossroads, nexusPubkey: NEXUS, card: cardA })]);
    const vB = await composeVessel([substrateStub(new CompositeStore()),
      whoFaceCap({ repo, crossroadsHandle: crossroads, nexusPubkey: NEXUS, card: cardB })]);

    const whoA = vA.get<WhoFaceComponent>(WHO_FACE_CAP)!;
    const whoB = vB.get<WhoFaceComponent>(WHO_FACE_CAP)!;
    expect(whoB.handle.url).toBe(whoA.handle.url);   // both resolved the one shared island board

    await vA.dispose(); await vB.dispose();
  });
});
