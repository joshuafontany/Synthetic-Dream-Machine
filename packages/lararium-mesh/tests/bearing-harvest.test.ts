import { describe, it, expect } from "vitest";
import { harvest, isDrifted, BEARING_STANDING } from "../src/bearing-harvest.js";

describe("bearing-harvest parser", () => {
  it("harvests a clean local-form frame at full standing", () => {
    const text = [
      "<<~ lares aim lar:///operator.weighs.deps -> lar:///council.options.cuts>>",
      "Lares (Council): the work.",
      "<<~ lares yield lar:///council.fork.named -> ?>>",
    ].join("\n");
    const b = harvest(text);
    expect(b).not.toBeNull();
    expect(b!.aimUri).toContain("operator.weighs.deps");
    expect(b!.aimUri).toContain("council.options.cuts");
    expect(b!.yieldUri).toContain("council.fork.named");
    expect(b!.standing).toBe(BEARING_STANDING.clean);
    expect(b!.driftFlags).toEqual([]);
    expect(isDrifted(b!)).toBe(false);
  });

  it("notes session-form without downgrading (reads root past the authority)", () => {
    const text = [
      "<<~ lares aim lar://mara:operator@crossroads/operator.weighs.deps " +
        "-> lar://compita:agent@crossroads/council.options.cuts >>",
      "<<~ lares yield lar://compita:agent@crossroads/council.fork.named -> ?>>",
    ].join("\n");
    const b = harvest(text)!;
    expect(b.driftFlags).toContain("session-form");
    expect(b.driftFlags.some((f) => f.startsWith("arity"))).toBe(false);
    expect(b.standing).toBe(BEARING_STANDING.clean);
  });

  it("flags + downgrades a two-term arity drift", () => {
    const b = harvest("<<~ lares aim lar:///two.terms -> x>>\n<<~ lares yield lar:///two.terms -> ?>>")!;
    expect(b.driftFlags).toContain("arity:2");
    expect(b.standing).toBe(BEARING_STANDING.arityDrift);
    expect(isDrifted(b)).toBe(true);
  });

  it("grades a partial frame (aim only) low and leaves yield null", () => {
    const b = harvest("<<~ lares aim lar:///operator.weighs.deps -> lar:///council.options.cuts>>")!;
    expect(b.driftFlags).toContain("frame:no-yield");
    expect(b.standing).toBe(BEARING_STANDING.partialFrame);
    expect(b.yieldUri).toBeNull();
  });

  it("returns null when no frame is present (graceful degradation)", () => {
    expect(harvest("just an off-the-cuff turn, no sigils")).toBeNull();
    expect(harvest("")).toBeNull();
  });

  it("grades a frame with no parseable lar: URI", () => {
    const b = harvest("<<~ lares aim somewhere over there -> the role>>")!;
    expect(b.driftFlags).toContain("root:unparsed");
    expect(b.standing).toBe(BEARING_STANDING.rootUnparsed);
  });

  it("preserves a drifted URI verbatim — never lowercases", () => {
    const b = harvest("<<~ lares aim lar:///Operator.Weighs.Deps -> ROLE>>\n<<~ lares yield x -> ?>>")!;
    expect(b.aimUri).toContain("Operator.Weighs.Deps");
  });
});
