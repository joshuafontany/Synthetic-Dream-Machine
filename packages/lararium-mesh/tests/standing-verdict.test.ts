/**
 * standing-verdict — whether a running vessel still stands as its own state implies.
 *
 * A vessel decides its standing ONCE, at boot, from the face it finds. Light a face afterward and the
 * running daemon knows nothing of it: it serves the public shelf and refuses every persona-scoped act,
 * while its own refusal counsels "stand the vessel again" — an act that attaches to what already
 * answers and lifts nothing.
 *
 * This is the reading that makes the lift possible: the published marker against the face on disk.
 *
 * ── WHAT ABSENCE MUST NEVER LICENSE ─────────────────────────────────────────────────────────────
 * Re-standing kills a live daemon and boots another. So every case where the reading is UNKNOWN —
 * no marker, an unparseable one, a marker whose writer is gone — must resolve to ATTACH. A verdict
 * that treated missing information as a reason to act would make an older vessel, a crash, or a
 * half-written file into a restart nobody asked for.
 */
import { describe, it, expect } from "vitest";
import { standingVerdict, markerIsOurs } from "../src/rendezvous-path.js";

/** A marker as a standing vessel publishes one. */
const marker = (standing: "hearth" | "herm", faceLit: boolean, pid = process.pid) =>
  JSON.stringify({ standing, faceLit, pid });

describe("standing-verdict — attach, or lift off the floor", () => {
  it("★ a vessel at the floor with a face NOW lit re-stands — this is the lift ★", () => {
    const v = standingVerdict({ marker: marker("herm", false), faceOnDisk: true });
    expect(v.act).toBe("restand");
    // The reason rides back so the caller can SAY why it is about to kill a daemon.
    expect(v.reason).toMatch(/face/i);
  });

  it("a hearth whose face still stands attaches — no churn", () => {
    expect(standingVerdict({ marker: marker("hearth", true), faceOnDisk: true }).act).toBe("attach");
  });

  it("a floor with no face on disk attaches — there is nothing to lift to", () => {
    expect(standingVerdict({ marker: marker("herm", false), faceOnDisk: false }).act).toBe("attach");
  });

  it("★ no marker attaches — an unknown standing never licenses a restart ★", () => {
    expect(standingVerdict({ marker: null, faceOnDisk: true }).act).toBe("attach");
  });

  it("★ an unreadable marker attaches, and says so rather than guessing ★", () => {
    const v = standingVerdict({ marker: "{ not json", faceOnDisk: true });
    expect(v.act).toBe("attach");
    expect(v.reason).toMatch(/unreadable|unknown/i);
  });

  it("★ a marker whose writer is gone reads as absent, never as truth ★", () => {
    // A vessel killed hard leaves its marker behind. The pid is what tells a reader the difference,
    // and a stale marker must not become the ground for killing whatever runs there now.
    const v = standingVerdict({ marker: marker("herm", false, 999_999_999), faceOnDisk: true });
    expect(v.act).toBe("attach");
    expect(v.reason).toMatch(/gone|stale|no longer/i);
  });

  it("a herm asked to stand faceless keeps its standing — the class is not a floor", () => {
    // `--recipe herm` is a deliberate standing, not a vessel waiting for a face. Lifting one would
    // convert an operator's choice into a fault.
    expect(standingVerdict({ marker: marker("herm", false), faceOnDisk: true, askedHerm: true }).act)
      .toBe("attach");
  });
});

describe("the standing marker — a departing vessel drops only its OWN", () => {
  it("★ a dying vessel must not delete the marker its successor just published ★", () => {
    // MEASURED on the founding rehearsal, cycle 2. The marker path derives from the ROOT, so two
    // vessels standing at that root in sequence share one file. The outgoing daemon's exit handler
    // fired AFTER the incoming one had published, deleting a marker that no longer described it —
    // and the lift then read an absent standing, correctly refused to disturb the unknown, and left
    // the vessel at the waking floor with every sovereign act refusing beneath a green step.
    //
    // The drop is therefore conditional: a marker naming another live process is not this one's to
    // remove. Nothing here deletes on a mismatch — an unreadable or foreign marker is left standing,
    // because a wrong delete is what this exists to prevent.
    expect(markerIsOurs(JSON.stringify({ standing: "herm", faceLit: false, pid: process.pid }), process.pid)).toBe(true);
    expect(markerIsOurs(JSON.stringify({ standing: "herm", faceLit: false, pid: process.pid + 1 }), process.pid)).toBe(false);
  });

  it("★ an unreadable or absent marker is never ours to delete ★", () => {
    expect(markerIsOurs(null, process.pid)).toBe(false);
    expect(markerIsOurs("{ not json", process.pid)).toBe(false);
    expect(markerIsOurs(JSON.stringify({ standing: "herm" }), process.pid)).toBe(false);
  });
});
