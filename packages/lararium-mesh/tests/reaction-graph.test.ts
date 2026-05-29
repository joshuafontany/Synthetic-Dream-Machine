import { describe, test, expect, vi } from "vitest";
import { ReactionGraph, extractReactionBindings } from "../src/reaction-graph.js";
import type { EdgeLike } from "../src/reaction-graph.js";

// ---------------------------------------------------------------------------
// extractReactionBindings
// ---------------------------------------------------------------------------

describe("extractReactionBindings", () => {
  test("extracts wired bindings from edges carrying both listenable and subscribable", () => {
    const edges: EdgeLike[] = [
      { fromUri: "lar:///a", toUri: "lar:///b", family: "reaction", role: null,
        payload: { listenable: "OnTick", subscribable: "Enable" } },
    ];
    const bindings = extractReactionBindings(edges);
    expect(bindings).toHaveLength(1);
    expect(bindings[0]).toMatchObject({
      fromUri: "lar:///a", toUri: "lar:///b",
      listenable: "OnTick", subscribable: "Enable", source: "wired",
    });
  });

  test("ignores edges missing listenable", () => {
    const edges: EdgeLike[] = [
      { fromUri: "lar:///a", toUri: "lar:///b", family: "reaction", role: null,
        payload: { subscribable: "Enable" } },
    ];
    expect(extractReactionBindings(edges)).toHaveLength(0);
  });

  test("ignores edges missing subscribable", () => {
    const edges: EdgeLike[] = [
      { fromUri: "lar:///a", toUri: "lar:///b", family: "reaction", role: null,
        payload: { listenable: "OnTick" } },
    ];
    expect(extractReactionBindings(edges)).toHaveLength(0);
  });

  test("ignores edges with empty-string listenable or subscribable", () => {
    const edges: EdgeLike[] = [
      { fromUri: "lar:///a", toUri: "lar:///b", family: "reaction", role: null,
        payload: { listenable: "", subscribable: "Enable" } },
      { fromUri: "lar:///a", toUri: "lar:///b", family: "reaction", role: null,
        payload: { listenable: "OnTick", subscribable: "" } },
    ];
    expect(extractReactionBindings(edges)).toHaveLength(0);
  });

  test("ignores edges missing fromUri or toUri", () => {
    const edges = [
      { fromUri: "", toUri: "lar:///b", family: "reaction", role: null,
        payload: { listenable: "OnTick", subscribable: "Enable" } },
      { fromUri: "lar:///a", toUri: "", family: "reaction", role: null,
        payload: { listenable: "OnTick", subscribable: "Enable" } },
    ] as EdgeLike[];
    expect(extractReactionBindings(edges)).toHaveLength(0);
  });

  test("extracts multiple valid bindings from a mixed edge list", () => {
    const edges: EdgeLike[] = [
      { fromUri: "lar:///a", toUri: "lar:///b", family: "reaction", role: null,
        payload: { listenable: "OnTick", subscribable: "Enable" } },
      { fromUri: "lar:///c", toUri: "lar:///d", family: "reference", role: null,
        payload: { listenable: "OnFire", subscribable: "Trigger" } },
      { fromUri: "lar:///e", toUri: "lar:///f", family: "reaction", role: null,
        payload: { listenable: "OnTick" } }, // missing subscribable — ignored
    ];
    const bindings = extractReactionBindings(edges);
    expect(bindings).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// ReactionGraph — binding management
// ---------------------------------------------------------------------------

describe("ReactionGraph binding management", () => {
  test("load() replaces entire binding set", () => {
    const g = new ReactionGraph();
    g.load([
      { fromUri: "lar:///a", toUri: "lar:///b", listenable: "OnTick", subscribable: "Enable", source: "wired" },
    ]);
    expect(g.bindings).toHaveLength(1);

    g.load([
      { fromUri: "lar:///c", toUri: "lar:///d", listenable: "OnFire", subscribable: "Trigger", source: "wired" },
      { fromUri: "lar:///e", toUri: "lar:///f", listenable: "OnEnd",  subscribable: "Stop",    source: "wired" },
    ]);
    expect(g.bindings).toHaveLength(2);
    expect(g.bindings.every((b) => b.fromUri !== "lar:///a")).toBe(true);
  });

  test("updateUri() replaces only bindings referencing the given uri", () => {
    const g = new ReactionGraph();
    g.load([
      { fromUri: "lar:///a", toUri: "lar:///b", listenable: "OnTick", subscribable: "Enable", source: "wired" },
      { fromUri: "lar:///c", toUri: "lar:///d", listenable: "OnFire", subscribable: "Trigger", source: "wired" },
    ]);

    g.updateUri("lar:///a", [
      { fromUri: "lar:///a", toUri: "lar:///x", listenable: "OnTick", subscribable: "Run", source: "wired" },
    ]);

    expect(g.bindings).toHaveLength(2);
    const updated = g.bindings.find((b) => b.fromUri === "lar:///a");
    expect(updated?.toUri).toBe("lar:///x");
  });

  test("removeUri() removes bindings where uri is fromUri", () => {
    const g = new ReactionGraph();
    g.load([
      { fromUri: "lar:///a", toUri: "lar:///b", listenable: "OnTick", subscribable: "Enable", source: "wired" },
      { fromUri: "lar:///c", toUri: "lar:///d", listenable: "OnFire", subscribable: "Trigger", source: "wired" },
    ]);
    g.removeUri("lar:///a");
    expect(g.bindings).toHaveLength(1);
    expect(g.bindings[0].fromUri).toBe("lar:///c");
  });

  test("removeUri() removes bindings where uri is toUri", () => {
    const g = new ReactionGraph();
    g.load([
      { fromUri: "lar:///a", toUri: "lar:///b", listenable: "OnTick", subscribable: "Enable", source: "wired" },
      { fromUri: "lar:///c", toUri: "lar:///d", listenable: "OnFire", subscribable: "Trigger", source: "wired" },
    ]);
    g.removeUri("lar:///b");
    expect(g.bindings).toHaveLength(1);
    expect(g.bindings[0].fromUri).toBe("lar:///c");
  });
});

// ---------------------------------------------------------------------------
// ReactionGraph — direct subscribe / fireSync
// ---------------------------------------------------------------------------

describe("ReactionGraph direct subscribe + fireSync", () => {
  test("subscribe() handler fires when fromUri+listenable matches", () => {
    const g = new ReactionGraph();
    const handler = vi.fn();
    g.subscribe("lar:///a", "OnTick", handler);
    g.fireSync("lar:///a", "OnTick", { t: 1 });
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ t: 1 });
  });

  test("subscribe() handler does not fire for different listenable", () => {
    const g = new ReactionGraph();
    const handler = vi.fn();
    g.subscribe("lar:///a", "OnTick", handler);
    g.fireSync("lar:///a", "OnFire");
    expect(handler).not.toHaveBeenCalled();
  });

  test("cancel() from subscribe() stops further dispatch", () => {
    const g = new ReactionGraph();
    const handler = vi.fn();
    const cancel = g.subscribe("lar:///a", "OnTick", handler);
    cancel();
    g.fireSync("lar:///a", "OnTick");
    expect(handler).not.toHaveBeenCalled();
  });

  test("multiple handlers for the same key all fire", () => {
    const g = new ReactionGraph();
    const h1 = vi.fn();
    const h2 = vi.fn();
    g.subscribe("lar:///a", "OnTick", h1);
    g.subscribe("lar:///a", "OnTick", h2);
    g.fireSync("lar:///a", "OnTick");
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  test("default payload is empty object when omitted", () => {
    const g = new ReactionGraph();
    const handler = vi.fn();
    g.subscribe("lar:///a", "OnTick", handler);
    g.fireSync("lar:///a", "OnTick");
    expect(handler).toHaveBeenCalledWith({});
  });
});

// ---------------------------------------------------------------------------
// ReactionGraph — subscribeByFn
// ---------------------------------------------------------------------------

describe("ReactionGraph subscribeByFn", () => {
  test("fires handler for each binding routing to fnName", () => {
    const g = new ReactionGraph();
    g.load([
      { fromUri: "lar:///a", toUri: "lar:///b", listenable: "OnTick", subscribable: "Enable", source: "wired" },
    ]);
    const handler = vi.fn();
    g.subscribeByFn("Enable", handler);
    g.fireSync("lar:///a", "OnTick", { x: 1 });
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ x: 1 });
  });

  test("wildcard '*' fires once per fireSync regardless of binding count", () => {
    const g = new ReactionGraph();
    g.load([
      { fromUri: "lar:///a", toUri: "lar:///b", listenable: "OnTick", subscribable: "Enable", source: "wired" },
      { fromUri: "lar:///a", toUri: "lar:///c", listenable: "OnTick", subscribable: "Trigger", source: "wired" },
    ]);
    const wildcard = vi.fn();
    g.subscribeByFn("*", wildcard);
    g.fireSync("lar:///a", "OnTick");
    expect(wildcard).toHaveBeenCalledOnce();
  });

  test("subscribeByFn cancel() stops dispatch", () => {
    const g = new ReactionGraph();
    g.load([
      { fromUri: "lar:///a", toUri: "lar:///b", listenable: "OnTick", subscribable: "Enable", source: "wired" },
    ]);
    const handler = vi.fn();
    const cancel = g.subscribeByFn("Enable", handler);
    cancel();
    g.fireSync("lar:///a", "OnTick");
    expect(handler).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// ReactionGraph — onFireSync monitoring observer
// ---------------------------------------------------------------------------

describe("ReactionGraph onFireSync observer", () => {
  test("observer fires before handlers, receives full context", () => {
    const g = new ReactionGraph();
    const order: string[] = [];
    g.onFireSync((fromUri, listenable) => { order.push(`obs:${fromUri}:${listenable}`); });
    g.subscribe("lar:///a", "OnTick", () => { order.push("handler"); });
    g.fireSync("lar:///a", "OnTick");
    expect(order).toEqual(["obs:lar:///a:OnTick", "handler"]);
  });

  test("onFireSync cancel() stops the observer", () => {
    const g = new ReactionGraph();
    const obs = vi.fn();
    const cancel = g.onFireSync(obs);
    cancel();
    g.fireSync("lar:///a", "OnTick");
    expect(obs).not.toHaveBeenCalled();
  });

  test("observer errors do not prevent handler dispatch", () => {
    const g = new ReactionGraph();
    g.onFireSync(() => { throw new Error("observer boom"); });
    const handler = vi.fn();
    g.subscribe("lar:///a", "OnTick", handler);
    expect(() => g.fireSync("lar:///a", "OnTick")).not.toThrow();
    expect(handler).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// ReactionGraph — subscribeOnce (kukali primitive)
// ---------------------------------------------------------------------------

describe("ReactionGraph subscribeOnce", () => {
  test("resolves with the first payload then unsubscribes", async () => {
    const g = new ReactionGraph();
    const p = g.subscribeOnce("lar:///a", "OnTick");
    g.fireSync("lar:///a", "OnTick", { n: 42 });
    g.fireSync("lar:///a", "OnTick", { n: 99 }); // second fire should not affect resolved value
    expect(await p).toEqual({ n: 42 });
  });

  test("does not fire for a different listenable", async () => {
    const g = new ReactionGraph();
    const p = g.subscribeOnce("lar:///a", "OnTick");
    g.fireSync("lar:///a", "OnFire");

    // Promise should still be pending — race with a short delay to confirm
    const result = await Promise.race([
      p.then(() => "resolved"),
      new Promise<string>((r) => setTimeout(() => r("pending"), 20)),
    ]);
    expect(result).toBe("pending");
  });
});

// ---------------------------------------------------------------------------
// ReactionGraph — update invariant (handlers survive reload)
// ---------------------------------------------------------------------------

describe("ReactionGraph update invariant", () => {
  test("load() preserves occupied handler slots for keys still in new binding set", () => {
    const g = new ReactionGraph();
    g.load([
      { fromUri: "lar:///a", toUri: "lar:///b", listenable: "OnTick", subscribable: "Enable", source: "wired" },
    ]);
    const handler = vi.fn();
    g.subscribe("lar:///a", "OnTick", handler);

    // Reload with the same key still present
    g.load([
      { fromUri: "lar:///a", toUri: "lar:///b", listenable: "OnTick", subscribable: "Enable", source: "wired" },
      { fromUri: "lar:///c", toUri: "lar:///d", listenable: "OnFire", subscribable: "Trigger", source: "wired" },
    ]);

    g.fireSync("lar:///a", "OnTick");
    expect(handler).toHaveBeenCalledOnce();
  });

  test("updateUri() preserves in-flight subscribeOnce for uri still in new binding set", async () => {
    const g = new ReactionGraph();
    g.load([
      { fromUri: "lar:///a", toUri: "lar:///b", listenable: "OnTick", subscribable: "Enable", source: "wired" },
    ]);

    const p = g.subscribeOnce("lar:///a", "OnTick");

    // Update uri with the same key still present (simulates nalu rebuild)
    g.updateUri("lar:///a", [
      { fromUri: "lar:///a", toUri: "lar:///b", listenable: "OnTick", subscribable: "Enable", source: "wired" },
    ]);

    g.fireSync("lar:///a", "OnTick", { after: "rebuild" });
    expect(await p).toEqual({ after: "rebuild" });
  });

  test("handler errors do not halt subsequent handler dispatch", () => {
    const g = new ReactionGraph();
    const boom = vi.fn(() => { throw new Error("handler boom"); });
    const safe  = vi.fn();
    g.subscribe("lar:///a", "OnTick", boom);
    g.subscribe("lar:///a", "OnTick", safe);
    expect(() => g.fireSync("lar:///a", "OnTick")).not.toThrow();
    expect(safe).toHaveBeenCalled();
  });
});
