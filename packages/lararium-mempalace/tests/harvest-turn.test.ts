import { describe, it, expect } from "vitest";
import { harvestTurn } from "../src/harvest-turn.js";

const CTX = { ts: "2026-06-21T10:00:00Z", sessionId: "s1", turn: "m1" };

describe("harvest-turn (glue: @lararium/mesh parser -> bearing record)", () => {
  it("builds a clean record from a framed turn", () => {
    const turn =
      "<<~ lares aim lar:///operator.weighs.deps -> lar:///council.options.cuts >>\n" +
      "body\n<<~ lares yield lar:///council.fork.named -> ? >>";
    const r = harvestTurn(turn, { ...CTX, sourceDrawerId: "sweep_s1_m1", validFrom: "2026-06-21T10:00:00Z", validTo: "2026-06-21T10:30:00Z" });
    expect(r).not.toBeNull();
    expect(r!.aim).toContain("operator.weighs.deps");
    expect(r!.yield).toContain("council.fork.named");
    expect(r!.confidence).toBe(0.9);
    expect(r!.sourceDrawerId).toBe("sweep_s1_m1");
  });

  it("returns null for an unframed turn (no fabricated bearing)", () => {
    expect(harvestTurn("just an off-the-cuff message", CTX)).toBeNull();
  });

  it("carries drift through to the record (low confidence + flags)", () => {
    const r = harvestTurn("<<~ lares aim lar:///two.terms -> x >>\n<<~ lares yield lar:///two.terms -> ? >>", CTX);
    expect(r!.confidence).toBe(0.4);
    expect(r!.driftFlags).toContain("arity:2");
  });
});
