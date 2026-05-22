import { describe, test, expect } from "vitest";
import type { LarTiddlerStore, MemeProjection, LarTiddlerChange, LarTiddlerRecord, ChangeOrigin } from "@lararium/mesh";
import { openVmIslandBridge } from "../src/vm-island-bridge.js";

type TW5Fields = Record<string, unknown>;

class FakeTW5Engine {
  readonly wiki = {
    addTiddler: (_tiddler: unknown): void => {},
    deleteTiddler: (_title: string): void => {},
    getTiddler: (_title: string): undefined => undefined,
    transact: (fn: () => void): void => fn(),
    addEventListener: (_event: string, _cb: (changes: Record<string, unknown>) => void): void => {},
    removeEventListener: (_event: string, _cb: (changes: Record<string, unknown>) => void): void => {},
  };

  readonly $tw = {
    Tiddler: class {
      fields: TW5Fields;
      constructor(fields: TW5Fields) { this.fields = fields; }
      getFieldStrings(): Record<string, string> {
        return Object.fromEntries(Object.entries(this.fields).map(([k, v]) => [k, String(v)]));
      }
    },
    wiki: this.wiki,
  };
}

class FakeProjectionStore implements LarTiddlerStore {
  readonly projections: MemeProjection[] = [];
  readonly unsubscribed: MemeProjection[] = [];

  async listVisible(): Promise<string[]> { return []; }
  async get(_title: string): Promise<LarTiddlerRecord | null> { return null; }
  async put(_record: LarTiddlerRecord, _origin: ChangeOrigin): Promise<void> {}
  async tombstone(_title: string, _origin: ChangeOrigin): Promise<void> {}
  subscribe(_fn: (change: LarTiddlerChange) => void): () => void {
    return () => {};
  }
  addProjection(p: MemeProjection): () => void {
    this.projections.push(p);
    return () => {
      this.unsubscribed.push(p);
    };
  }
}

describe("vm-island-bridge", () => {
  test("registers one adaptor and N accumulators on the store", () => {
    const store = new FakeProjectionStore();
    const bridge = openVmIslandBridge({
      engine: new FakeTW5Engine() as never,
      store,
      instanceId: "wiki:test",
      targetBag: "lar:///ha.ka.ba/@lararium/wikis/test",
      accumulatorCount: 3,
    });

    expect(store.projections).toHaveLength(4);
    expect(bridge.accumulators).toHaveLength(3);
    expect(store.projections[0]).toBe(bridge.adaptor);
  });

  test("stop unsubscribes the adaptor and every accumulator", () => {
    const store = new FakeProjectionStore();
    const bridge = openVmIslandBridge({
      engine: new FakeTW5Engine() as never,
      store,
      instanceId: "wiki:test",
      targetBag: "lar:///ha.ka.ba/@lararium/wikis/test",
      accumulatorCount: 2,
    });

    bridge.stop();

    expect(store.unsubscribed).toHaveLength(3);
    expect(store.unsubscribed[0]).toBe(bridge.accumulators[0]);
    expect(store.unsubscribed[1]).toBe(bridge.accumulators[1]);
    expect(store.unsubscribed[2]).toBe(bridge.adaptor);
  });
});