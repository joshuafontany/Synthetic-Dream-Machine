/**
 * projection-input-leg.test — a relayed keystroke reaches TW5 where TW5 reads a local one.
 *
 * A projected wiki paints in a shadow root on the main thread while its widgets live in the worker, so an
 * edit only works when the value lands ON THE NODE the widget holds, before that widget's own handler
 * runs — TW5's edit widgets read `domNodes[0].value` inside the handler and never read the event. These
 * tests stand a minimal fake element (the shape TW5's fakedom presents) and drive the leg end to end,
 * with no TW5 boot, no worker, and no browser.
 */
import { describe, test, expect } from "vitest";
import { patchFakeElementForEvents, dispatchProjectedInput, dispatchProjectedEvent } from "../src/tw5-projection.js";
import { hasProjection } from "../src/has-island-watches.js";
import { mkWikiDomInput, mkWikiDomEvent, DOM_INPUT_MAX_CHARS, ISLAND_PROTOCOL_VERSION } from "@lararium/mesh";
import type { IslandContext } from "../src/island-context.js";

/** The two members the patch reads off a fakedom element: an attribute bag and a setter. */
class FakeEl {
  attributes: Record<string, string | undefined> = {};
  setAttribute(name: string, value: string): void { this.attributes[name] = value; }
}
const fakeDoc = { createElement: (_t: string): FakeEl => new FakeEl() };
patchFakeElementForEvents(fakeDoc as unknown as Parameters<typeof patchFakeElementForEvents>[0]);

/** Stand a node that binds a handler, and hand back its render-id plus what the handler saw. */
function boundNode(eventType: string): { rid: string; el: FakeEl; seen: { value: unknown }[] } {
  const el = fakeDoc.createElement("textarea");
  const seen: { value: unknown }[] = [];
  (el as unknown as { addEventListener(t: string, h: (ev: unknown) => void): void })
    .addEventListener(eventType, function (this: unknown, ev: unknown) {
      // What TW5's own handler does: read the value off the NODE, not off the event.
      const target = (ev as { target: { value?: string } }).target;
      seen.push({ value: target.value });
    });
  return { rid: el.attributes["data-lar-rid"]!, el, seen };
}

describe("the projected input leg", () => {
  test("the value lands on the NODE before the handler runs — TW5 reads it where it always reads it", () => {
    const n = boundNode("input");
    dispatchProjectedInput(n.rid, "input", "a tiddler being typed");
    expect(n.seen).toEqual([{ value: "a tiddler being typed" }]);
    expect(n.el).toHaveProperty("value", "a tiddler being typed");
  });

  test("the caret follows the written value — a widget reading a selection reads a coherent one", () => {
    const n = boundNode("input");
    dispatchProjectedInput(n.rid, "input", "abcd");
    expect(n.el).toMatchObject({ selectionStart: 4, selectionEnd: 4 });
  });

  test("only the handlers bound to THAT event type fire", () => {
    const el = fakeDoc.createElement("input");
    const onInput: string[] = [], onChange: string[] = [];
    const add = (el as unknown as { addEventListener(t: string, h: (ev: unknown) => void): void });
    add.addEventListener("input",  () => onInput.push("i"));
    add.addEventListener("change", () => onChange.push("c"));
    const rid = el.attributes["data-lar-rid"]!;
    dispatchProjectedInput(rid, "change", "committed");
    expect(onInput).toEqual([]);
    expect(onChange).toEqual(["c"]);
  });

  test("an unknown render-id DROPS silently — a stale frame is a hiatus, never a throw", () => {
    expect(() => dispatchProjectedInput("no-such-rid", "input", "x")).not.toThrow();
  });

  test("the caret verbs an edit widget calls answer harmlessly instead of throwing mid-handler", () => {
    const el = fakeDoc.createElement("textarea") as unknown as Record<string, () => void>;
    for (const verb of ["focus", "blur", "select"]) expect(() => el[verb]!()).not.toThrow();
  });
});

describe("the projection cap's door", () => {
  const cap = hasProjection();
  const ctx = {} as IslandContext;

  test("the cap CLAIMS both legs and nothing else", () => {
    const n = boundNode("input");
    expect(cap.onSignal!("wiki:dom-input", mkWikiDomInput({ renderId: n.rid, eventType: "input", value: "hi" }), ctx)).toBe(true);
    expect(cap.onSignal!("wiki:dom-event", mkWikiDomEvent({ renderId: n.rid, eventType: "click", fields: { button: 0 } }), ctx)).toBe(true);
    expect(cap.onSignal!("daemon:place-verb", {}, ctx)).toBe(false);
    expect(n.seen).toEqual([{ value: "hi" }]);
  });

  test("an over-bound value that reached the cap DROPS — claimed, never dispatched", () => {
    const n = boundNode("input");
    // Hand-built, bypassing mkWikiDomInput's throw: this stands in for a sender that never called it.
    const forged = {
      schema_version: ISLAND_PROTOCOL_VERSION, type: "wiki:dom-input",
      renderId: n.rid, eventType: "input", value: "x".repeat(DOM_INPUT_MAX_CHARS + 1),
    };
    expect(cap.onSignal!("wiki:dom-input", forged, ctx)).toBe(true);   // claimed — it falls to no other cap
    expect(n.seen).toEqual([]);                                        // and dispatched to nothing
  });

  test("the CLICK leg still carries its primitive fields onto the event, untouched", () => {
    const el = fakeDoc.createElement("a");
    const seen: Record<string, unknown>[] = [];
    (el as unknown as { addEventListener(t: string, h: (ev: unknown) => void): void })
      .addEventListener("click", (ev) => seen.push(ev as Record<string, unknown>));
    dispatchProjectedEvent(el.attributes["data-lar-rid"]!, "click", { button: 0, metaKey: true });
    expect(seen[0]).toMatchObject({ type: "click", button: 0, metaKey: true });
  });
});
