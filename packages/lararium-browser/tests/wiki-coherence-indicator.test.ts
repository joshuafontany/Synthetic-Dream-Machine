/**
 * wiki-coherence-indicator (browser tier) — the coherence projection's DOM-SINK witness, the ONLY platform seam.
 *
 * The platform-blind organ (@lararium/tw5 projectCoherenceIndicator) shaped the frame; this witnesses
 * the DOM write that renders it — a real Chromium `document`, a real host element. The assertions:
 * a coherent frame reads coherent on the host, an obstruction frame names the tiddler in the tooltip,
 * and a STALE frame (older rev) drops (the coalesce ordering's main-thread half). One hull, differ by
 * grant not hull: swap THIS sink for a node no-op and the organ never changes.
 *
 * (Like the consistency keystone's browser witness, the RUN awaits the @vitest/browser harness repair; the sink drags in
 * zero node builtins — it imports @lararium/tw5 for the frame TYPE only, erased at runtime.)
 *
 * Meme: lar:///ha.ka.ba/@lares/api/lares/wiki-coherence-projection
 */

import { describe, test, expect } from "vitest";
import { mountCoherenceIndicator } from "../src/wiki-coherence-sink.js";
import type { CoherenceFrameWithRev } from "../src/wiki-coherence-sink.js";

function frame(over: Partial<CoherenceFrameWithRev>): CoherenceFrameWithRev {
  return {
    status: "coherent", radius: 0, glues: true, vacuous: false,
    obstructing: [], lociTotal: 0, label: "the wiki coheres", rev: 1, ...over,
  };
}

describe("mountCoherenceIndicator — the DOM coherence sink", () => {
  test("a COHERENT frame reads coherent on the host (status attr + label text)", () => {
    const host = document.createElement("div");
    mountCoherenceIndicator(host).apply(frame({ status: "coherent", label: "the wiki coheres" }));
    expect(host.getAttribute("data-coherence")).toBe("coherent");
    expect(host.getAttribute("data-radius")).toBe("0");
    expect(host.textContent).toBe("the wiki coheres");
    expect(host.hasAttribute("title")).toBe(false); // nothing to look at when it glues
  });

  test("an OBSTRUCTION frame names the offending tiddler in the tooltip", () => {
    const host = document.createElement("div");
    mountCoherenceIndicator(host).apply(frame({
      status: "obstructed", radius: 1, glues: false,
      obstructing: ["ornate-novel"], label: "the planes fracture (radius 1) at: ornate-novel",
    }));
    expect(host.getAttribute("data-coherence")).toBe("obstructed");
    expect(host.getAttribute("data-radius")).toBe("1");
    expect(host.getAttribute("title")).toBe("ornate-novel");
    expect(host.textContent).toContain("ornate-novel");
  });

  test("a STALE frame (older rev) DROPS — a newer read already landed (coalesce ordering)", () => {
    const host = document.createElement("div");
    const sink = mountCoherenceIndicator(host);
    sink.apply(frame({ status: "obstructed", label: "newer", rev: 5 }));
    sink.apply(frame({ status: "coherent", label: "older", rev: 3 })); // stale — must not overwrite
    expect(host.getAttribute("data-coherence")).toBe("obstructed");
    expect(host.textContent).toBe("newer");
  });

  test("rev 1 turns an EPOCH — a re-booted projector's frames land, never drop forever", () => {
    const host = document.createElement("div");
    const sink = mountCoherenceIndicator(host);
    sink.apply(frame({ status: "obstructed", label: "old epoch", rev: 9 }));
    // the worker restarted: the new projector counts from 1 again — the gate resets with it.
    sink.apply(frame({ status: "coherent", label: "new epoch", rev: 1 }));
    expect(host.getAttribute("data-coherence")).toBe("coherent");
    expect(host.textContent).toBe("new epoch");
    // and the ordering guard re-arms WITHIN the new epoch.
    sink.apply(frame({ status: "obstructed", label: "newer in epoch", rev: 3 }));
    sink.apply(frame({ status: "coherent", label: "stale in epoch", rev: 2 }));
    expect(host.textContent).toBe("newer in epoch");
  });
});
