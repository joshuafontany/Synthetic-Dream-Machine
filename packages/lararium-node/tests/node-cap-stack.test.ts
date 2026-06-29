/**
 * node-cap-stack — the node #has-cap-stack wiring, witnessed in isolation (no genesis/TW5 needed).
 *
 * Proves the load-bearing decouple the Herm rests on: the @daemon cap is the IMMUNE CORE present in
 * both stacks, and it boots WITHOUT a user wiki — when no `wikislot` cap is in the stack, it calls
 * openDaemon with NO slot, so registerBags omits the absent user-wiki bags (blind by structure). And
 * the read-face cap REFUSES to boot without the meshpalace it serves (mandatory-dep, loud, not a flag).
 *
 * Canon: lar:///ha.ka.ba/@lararium/api/composable-keel · …/mesh/vessel-caps#lares-viales
 */

import { describe, test, expect, vi } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import { composeVessel, MESH_PALACE_BAG, type CapModule, type VesselDaemonVm } from "@lararium/mesh";
// substrate + daemon caps moved to the SHARED tw5 core-caps (both Lararium + Herm compose over them);
// node-caps keeps only the Herm-own caps (meshpalace, carriage, read-face).
import { daemonCap, CORE_CAP } from "@lararium/tw5";
import { CAP, meshPalaceCap, flowMapReadFaceCap } from "../src/node-caps.js";

const fakeDaemon = (): VesselDaemonVm =>
  ({ workerEa: Promise.resolve(), mountMainVerbs: () => {}, resolveBinding: {} as never });

describe("daemon cap — the immune core boots WITH or WITHOUT a wiki slot (the herm decouple)", () => {
  test("no wikislot cap in the stack → openDaemon receives NO slot (herm: registerBags omits wiki bags)", async () => {
    let received: { assembly: unknown; slot?: unknown } | null = null;
    const openDaemon = vi.fn(async (a: { assembly: unknown; slot?: unknown }) => { received = a; return fakeDaemon(); });
    const assembly = { marker: "assembly" };
    const stack: CapModule[] = [
      { id: CAP.substrate, build: () => assembly },
      daemonCap({ openDaemon }),
    ];

    await composeVessel(stack);

    expect(openDaemon).toHaveBeenCalledOnce();
    expect(received!.assembly).toBe(assembly);   // the daemon reached its declared substrate dep
    expect(received!.slot).toBeUndefined();       // …and NO wiki slot — the decouple
  });

  test("a wikislot cap present → openDaemon routes the slot (full Lararium: wiki bags registered)", async () => {
    let received: { assembly: unknown; slot?: unknown } | null = null;
    const openDaemon = vi.fn(async (a: { assembly: unknown; slot?: unknown }) => { received = a; return fakeDaemon(); });
    const slot = { wikiBagId: "lar:///@w", draftBagId: "lar:///@d" };
    const stack: CapModule[] = [
      { id: CAP.substrate, build: () => ({}) },
      { id: CORE_CAP.wikislot,  build: () => slot },
      daemonCap({ openDaemon }),
    ];

    await composeVessel(stack);

    expect(received!.slot).toBe(slot);            // the optional wikislot dep wired → slot routed
  });
});

describe("meshpalace cap — a writable @meshpalace FLOW-map layer + residency pin", () => {
  test("adds the @meshpalace layer (writable) and pins it", async () => {
    const repo = new Repo({ sharePolicy: async () => true });
    const added: Array<{ bagId: string; writable?: boolean; defaultWritable?: boolean }> = [];
    const composite = { addLayer: (l: { bagId: string; writable?: boolean; defaultWritable?: boolean }) => added.push(l) };
    const pins: string[] = [];
    const residency = { pin: async (b: string) => { pins.push(b); } };

    const stack: CapModule[] = [
      { id: CAP.substrate, build: () => ({ composite }) },
      meshPalaceCap({ repo, residency: residency as never }),
    ];
    const v = await composeVessel(stack);

    expect(added).toHaveLength(1);
    expect(added[0]!.bagId).toBe(MESH_PALACE_BAG);
    expect(added[0]!.writable).toBe(true);
    expect(added[0]!.defaultWritable).toBe(true);
    expect(pins).toContain(MESH_PALACE_BAG);
    expect((v.get(CAP.meshpalace) as { handle: unknown }).handle).toBeDefined();

    await repo.shutdown();
  });
});

describe("read-face cap — structurally bound to the FLOW-map it serves", () => {
  test("REFUSES to boot without the meshpalace cap (mandatory dep, loud)", async () => {
    const stack: CapModule[] = [
      { id: CAP.substrate, build: () => ({}) },
      flowMapReadFaceCap({ httpServer: {} as never, signerSeed: new Uint8Array(32), storageDir: "/tmp/herm-noop" }),
    ];
    await expect(composeVessel(stack)).rejects.toThrow(/refuses to boot.*requires "meshpalace"/);
  });
});
