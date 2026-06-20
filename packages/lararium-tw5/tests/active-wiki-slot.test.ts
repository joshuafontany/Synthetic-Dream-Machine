import { describe, test, expect } from "vitest";
import { CompositeStore } from "@lararium/mesh";
import { MemoryTiddlerStore } from "../src/memory-store.js";
import { ActiveWikiLayerSlot, planActiveWikiSlot } from "../src/active-wiki.js";

describe("active-wiki-slot", () => {
  test("planActiveWikiSlot derives wiki and draft identities", () => {
    expect(planActiveWikiSlot({
      hostId: "lararium-node",
      wikiSlug: "altar-fire",
      identityDid: "did:key:test",
    })).toEqual({
      wikiSlug: "altar-fire",
      wikiKey: "lar:///ha.ka.ba/@altar-fire",
      wikiBagId: "lar:///ha.ka.ba/@altar-fire",
      draftBagId: "lar:///ha.ka.ba/@altar-fire/draft",
      draftOracleTitle: "lar:///ha.ka.ba/@altar-fire/drafts/did%3Akey%3Atest",
      vesselId: "lararium-node:altar-fire",
    });
  });

  test("mount adds wiki then draft layers and targets draft as default writable", () => {
    const composite = new CompositeStore();
    const slot = new ActiveWikiLayerSlot(composite);
    const plan = planActiveWikiSlot({
      hostId: "lararium-node",
      wikiSlug: "altar-fire",
      identityDid: "did:key:test",
    });

    slot.mount({
      plan,
      wikiStore: new MemoryTiddlerStore(plan.wikiBagId),
      draftStore: new MemoryTiddlerStore(plan.draftBagId),
    });

    expect(composite.layerIds).toEqual([plan.wikiBagId, plan.draftBagId]);
    expect(composite.defaultWritableBagId()).toBe(plan.draftBagId);
    expect(slot.current).toEqual(plan);
  });

  test("mount swaps prior active wiki layers out before mounting the next ones", () => {
    const composite = new CompositeStore();
    const slot = new ActiveWikiLayerSlot(composite);
    const first = planActiveWikiSlot({
      hostId: "lararium-node",
      wikiSlug: "altar-fire",
      identityDid: "did:key:first",
    });
    const second = planActiveWikiSlot({
      hostId: "lararium-node",
      wikiSlug: "ember-hall",
      identityDid: "did:key:second",
    });

    slot.mount({
      plan: first,
      wikiStore: new MemoryTiddlerStore(first.wikiBagId),
      draftStore: new MemoryTiddlerStore(first.draftBagId),
    });
    slot.mount({
      plan: second,
      wikiStore: new MemoryTiddlerStore(second.wikiBagId),
      draftStore: new MemoryTiddlerStore(second.draftBagId),
    });

    expect(composite.hasBag(first.wikiBagId)).toBe(false);
    expect(composite.hasBag(first.draftBagId)).toBe(false);
    expect(composite.layerIds).toEqual([second.wikiBagId, second.draftBagId]);
    expect(composite.defaultWritableBagId()).toBe(second.draftBagId);
    expect(slot.current).toEqual(second);
  });
});