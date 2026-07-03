/**
 * sink-flow — the end-to-end witness the aftermath asked for: a REAL multi-plane signal driven through
 * makeSink → classifySink → mintPurpleSink (no hand-built verdicts). Proves the connected half composes:
 * a cross-plane closure tags receiver-boundary and mints (a TEMPORAL flat purple holds PROPOSED — the
 * crucible bites; an ATEMPORAL corpus purple BINDS — the feed waives standing); a cymatic signal tags
 * signal-boundary and mints nothing.
 */
import { describe, expect, test } from "vitest";

import { runSinkClassMint } from "../src/sink-flow.js";
import { makeMintRegistry } from "../src/purple-minter.js";
import type { SinkEvent } from "../src/sink.js";

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const jitter = (s: number): number => {
  const x = Math.sin(s * 12.9898 + 4.1414) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 0.08;
};
const counter = () => {
  let n = 0;
  return () => `sink-${n++}`;
};

// Two INDEPENDENT planes: constant-high agreement + independent jitter → uncorrelated (ρ≈0 → effective
// planes ~2 → cross-plane drive → born), each series near-flat/non-periodic → no solo re-lock → purple.
const crossPlaneClosure = (): SinkEvent[] => {
  const ev: SinkEvent[] = [];
  for (let t = 0; t < 40; t++) {
    ev.push({ plane: "content", agreement: clamp01(0.85 + jitter(t + 1)) });
    ev.push({ plane: "structure", agreement: clamp01(0.85 + jitter(t + 900)) });
  }
  return ev;
};

describe("sink-flow — end-to-end birth → class → mint on a real signal", () => {
  test("a TEMPORAL cross-plane closure tags receiver-boundary and mints, held PROPOSED (the crucible bites)", () => {
    const { verdict, klass, minted } = runSinkClassMint(crossPlaneClosure(), makeMintRegistry(), counter());
    expect(verdict.birth.born).toBe(true); // 2 independent planes → cross-plane drive
    expect(klass.sinkClass).toBe("receiver-boundary");
    expect(minted).not.toBeNull();
    expect(minted!.presentInNoPlane).toBe(true);
    expect(minted!.commit.state).toBe("PROPOSED"); // temporal + no re-lock → held below the floor
  });

  test("an ATEMPORAL corpus closure BINDS — the feed waives standing (the atemporal-mint fix)", () => {
    // isolate the standing-waiver (the BA#1 fix): minSupersaturation:0 so only the requireStanding
    // derivation decides binding, not the near-equilibrium supersaturation of a constant feed.
    const { verdict, klass, minted } = runSinkClassMint(crossPlaneClosure(), makeMintRegistry(), counter(), {
      sink: { atemporal: true },
      mint: { floor: { minSupersaturation: 0 } },
    });
    expect(verdict.atemporal).toBe(true);
    expect(klass.sinkClass).toBe("receiver-boundary");
    expect(klass.cymaticTestable).toBe(false); // the cymatic detector goes blind without a beat
    expect(minted).not.toBeNull();
    expect(minted!.commit.bound).toBe(true); // standing waived by the atemporal feed → RULED
  });

  test("a CYMATIC signal (one plane re-locks alone) tags signal-boundary and mints NOTHING", () => {
    const ev: SinkEvent[] = [];
    for (let t = 0; t < 80; t++) {
      ev.push({ plane: "content", agreement: clamp01(0.5 + 0.4 * Math.sin((2 * Math.PI * t) / 8)) });
      ev.push({ plane: "structure", agreement: 0.5 });
    }
    const { klass, minted } = runSinkClassMint(ev, makeMintRegistry(), counter());
    expect(klass.sinkClass).toBe("signal-boundary");
    expect(klass.signalPlanes).toContain("content");
    expect(minted).toBeNull(); // cymatic gets DETECTED, never minted
  });
});
