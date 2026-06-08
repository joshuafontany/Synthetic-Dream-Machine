import { describe, test, expect } from "vitest";
import {
  ACTION_VERBS, TRANSFER_VERBS, BAG_VERBS,
  isActionVerb, isTransferVerb, isBagVerb,
  newChangeId,
  encodeResidencyArgs, parseResidencyAction,
  isResidencyActionUri,
} from "../src/residency-actions.js";
import type {
  ResidencyAction, AddAction, CopyAction, MoveAction,
  ClearAction, DropAction, LoadAction,
} from "../src/residency-actions.js";
import {
  VERB_URI_PREFIX, SUMMONS_URI_PREFIX, taskContentId,
} from "../src/verb-tiddler.js";
import type { Verb } from "../src/verb-tiddler.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeInvocation(
  verb: string,
  args: Readonly<Record<string, unknown>>,
  overrides: Partial<Verb> = {},
): Verb {
  const requestId = overrides.requestId ?? "test-req-1";
  return {
    requestId,
    title:       overrides.title ?? `${VERB_URI_PREFIX}${requestId}`,
    action:      verb,
    args,
    targets:     overrides.targets     ?? [],
    batchMode:   overrides.batchMode   ?? "best-effort",
    status:      overrides.status      ?? "pending",
    requestedBy: overrides.requestedBy ?? "test-actor",
    requestedAt: overrides.requestedAt ?? "2026-05-31T00:00:00Z",
  };
}

// ---------------------------------------------------------------------------
// ACTION_VERBS membership + type guards (verb-set boundary)
// ---------------------------------------------------------------------------

describe("ACTION_VERBS membership", () => {
  test("exactly six canonical verbs", () => {
    expect(ACTION_VERBS).toEqual(["ADD", "COPY", "MOVE", "CLEAR", "DROP", "LOAD"]);
    expect(ACTION_VERBS).toHaveLength(6);
  });

  test("isActionVerb accepts all six canonical verbs", () => {
    for (const v of ACTION_VERBS) expect(isActionVerb(v)).toBe(true);
  });

  test("isActionVerb rejects non-ACTION verbs (verb-set boundary)", () => {
    expect(isActionVerb("echo")).toBe(false);
    expect(isActionVerb("frobnicate")).toBe(false);
    expect(isActionVerb("")).toBe(false);
  });

  test("isActionVerb stays case-sensitive (ALL-CAPS canon)", () => {
    expect(isActionVerb("add")).toBe(false);
    expect(isActionVerb("Add")).toBe(false);
    expect(isActionVerb("move")).toBe(false);
  });

  test("TRANSFER_VERBS subset = ADD, COPY, MOVE", () => {
    expect(TRANSFER_VERBS).toEqual(["ADD", "COPY", "MOVE"]);
    for (const v of TRANSFER_VERBS) expect(isTransferVerb(v)).toBe(true);
    expect(isTransferVerb("CLEAR")).toBe(false);
    expect(isTransferVerb("DROP")).toBe(false);
    expect(isTransferVerb("LOAD")).toBe(false);
  });

  test("BAG_VERBS subset = CLEAR, DROP", () => {
    expect(BAG_VERBS).toEqual(["CLEAR", "DROP"]);
    for (const v of BAG_VERBS) expect(isBagVerb(v)).toBe(true);
    expect(isBagVerb("ADD")).toBe(false);
    expect(isBagVerb("LOAD")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// newChangeId
// ---------------------------------------------------------------------------

describe("newChangeId", () => {
  test("returns a non-empty string", () => {
    const id = newChangeId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  test("returns distinct ids across calls", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) ids.add(newChangeId());
    expect(ids.size).toBe(50);
  });

  test("matches timestamp-rand format (base-32, hyphen separator)", () => {
    const id = newChangeId();
    expect(id).toMatch(/^[0-9a-v]+-[0-9a-v]+$/);
  });
});

// ---------------------------------------------------------------------------
// parseResidencyAction — valid cases per verb
// ---------------------------------------------------------------------------

describe("parseResidencyAction — valid cases", () => {
  test("parses ADD with title + from-bag + to-bag + change-id", () => {
    const inv = makeInvocation("ADD", {
      title:       "MyTiddler",
      "from-bag":  "lar:///ha.ka.ba/@personal",
      "to-bag":    "lar:///ha.ka.ba/@elyncia",
      "change-id": "change-abc",
    });
    const action = parseResidencyAction(inv);
    expect(action).not.toBeNull();
    expect(action?.verb).toBe("ADD");
    const add = action as AddAction;
    expect(add.title).toBe("MyTiddler");
    expect(add.fromBag).toBe("lar:///ha.ka.ba/@personal");
    expect(add.toBag).toBe("lar:///ha.ka.ba/@elyncia");
    expect(add.changeId).toBe("change-abc");
    expect(add.requestId).toBe("test-req-1");
    expect(add.requestedBy).toBe("test-actor");
  });

  test("parses COPY with full transfer args", () => {
    const inv = makeInvocation("COPY", {
      title:       "Note",
      "from-bag":  "lar:///ha.ka.ba/@draft",
      "to-bag":    "lar:///ha.ka.ba/@lares",
      "change-id": "c-1",
    });
    const action = parseResidencyAction(inv);
    expect(action?.verb).toBe("COPY");
    expect((action as CopyAction).fromBag).toBe("lar:///ha.ka.ba/@draft");
  });

  test("parses MOVE with full transfer args", () => {
    const inv = makeInvocation("MOVE", {
      title:       "Lore-Entry",
      "from-bag":  "lar:///ha.ka.ba/@personal",
      "to-bag":    "lar:///ha.ka.ba/@elyncia/lore",
      "change-id": "c-move-1",
    });
    const action = parseResidencyAction(inv);
    expect(action?.verb).toBe("MOVE");
    expect((action as MoveAction).toBag).toBe("lar:///ha.ka.ba/@elyncia/lore");
  });

  test("parses CLEAR with bag only (no title, no change-id required)", () => {
    const inv = makeInvocation("CLEAR", { bag: "lar:///ha.ka.ba/@draft" });
    const action = parseResidencyAction(inv);
    expect(action?.verb).toBe("CLEAR");
    expect((action as ClearAction).bag).toBe("lar:///ha.ka.ba/@draft");
  });

  test("parses DROP with bag only", () => {
    const inv = makeInvocation("DROP", { bag: "lar:///ha.ka.ba/@retired" });
    const action = parseResidencyAction(inv);
    expect(action?.verb).toBe("DROP");
    expect((action as DropAction).bag).toBe("lar:///ha.ka.ba/@retired");
  });

  test("parses LOAD with source-uri + to-bag + change-id (no from-bag)", () => {
    const inv = makeInvocation("LOAD", {
      "source-uri": "https://example.org/seed.json",
      "to-bag":     "lar:///ha.ka.ba/@elyncia",
      "change-id":  "c-load-1",
    });
    const action = parseResidencyAction(inv);
    expect(action?.verb).toBe("LOAD");
    const load = action as LoadAction;
    expect(load.sourceUri).toBe("https://example.org/seed.json");
    expect(load.toBag).toBe("lar:///ha.ka.ba/@elyncia");
    expect(load.changeId).toBe("c-load-1");
  });
});

// ---------------------------------------------------------------------------
// parseResidencyAction — invalid cases
// ---------------------------------------------------------------------------

describe("parseResidencyAction — verb-set rejection", () => {
  test("returns null for a non-ACTION verb", () => {
    const inv = makeInvocation("echo", { title: "X", "from-bag": "Y", "to-bag": "Z", "change-id": "c" });
    expect(parseResidencyAction(inv)).toBeNull();
  });

  test("returns null for empty verb", () => {
    const inv = makeInvocation("", {});
    expect(parseResidencyAction(inv)).toBeNull();
  });
});

describe("parseResidencyAction — missing-arg rejection (transfer verbs)", () => {
  const fullTransferArgs = {
    title:       "T",
    "from-bag":  "lar:///ha.ka.ba/@a",
    "to-bag":    "lar:///ha.ka.ba/@b",
    "change-id": "c-1",
  };

  for (const verb of ["ADD", "COPY", "MOVE"]) {
    test(`${verb} missing title returns null`, () => {
      const { title, ...rest } = fullTransferArgs;
      void title;
      expect(parseResidencyAction(makeInvocation(verb, rest))).toBeNull();
    });
    test(`${verb} missing from-bag returns null`, () => {
      const { "from-bag": fromBag, ...rest } = fullTransferArgs;
      void fromBag;
      expect(parseResidencyAction(makeInvocation(verb, rest))).toBeNull();
    });
    test(`${verb} missing to-bag returns null`, () => {
      const { "to-bag": toBag, ...rest } = fullTransferArgs;
      void toBag;
      expect(parseResidencyAction(makeInvocation(verb, rest))).toBeNull();
    });
    test(`${verb} missing change-id returns null (Anti-pattern #1 gate)`, () => {
      const { "change-id": cid, ...rest } = fullTransferArgs;
      void cid;
      expect(parseResidencyAction(makeInvocation(verb, rest))).toBeNull();
    });
    test(`${verb} with empty-string fields returns null`, () => {
      expect(parseResidencyAction(makeInvocation(verb, { ...fullTransferArgs, title: "" }))).toBeNull();
      expect(parseResidencyAction(makeInvocation(verb, { ...fullTransferArgs, "change-id": "" }))).toBeNull();
    });
  }
});

describe("parseResidencyAction — missing-arg rejection (bag verbs)", () => {
  for (const verb of ["CLEAR", "DROP"]) {
    test(`${verb} missing bag returns null`, () => {
      expect(parseResidencyAction(makeInvocation(verb, {}))).toBeNull();
    });
    test(`${verb} with non-string bag returns null`, () => {
      expect(parseResidencyAction(makeInvocation(verb, { bag: 42 }))).toBeNull();
    });
  }
});

describe("parseResidencyAction — missing-arg rejection (LOAD)", () => {
  const full = {
    "source-uri": "https://x",
    "to-bag":     "lar:///ha.ka.ba/@a",
    "change-id":  "c",
  };
  test("LOAD missing source-uri returns null", () => {
    const { "source-uri": s, ...rest } = full;
    void s;
    expect(parseResidencyAction(makeInvocation("LOAD", rest))).toBeNull();
  });
  test("LOAD missing to-bag returns null", () => {
    const { "to-bag": t, ...rest } = full;
    void t;
    expect(parseResidencyAction(makeInvocation("LOAD", rest))).toBeNull();
  });
  test("LOAD missing change-id returns null", () => {
    const { "change-id": c, ...rest } = full;
    void c;
    expect(parseResidencyAction(makeInvocation("LOAD", rest))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// encodeResidencyArgs roundtrip
// ---------------------------------------------------------------------------

describe("encodeResidencyArgs roundtrip", () => {
  test("ADD action encodes to transfer-shaped args", () => {
    const action: AddAction = {
      verb:        "ADD",
      requestId:   "r1",
      requestedBy: "actor",
      title:       "T",
      fromBag:     "lar:///ha.ka.ba/@a",
      toBag:       "lar:///ha.ka.ba/@b",
      changeId:    "c1",
    };
    expect(encodeResidencyArgs(action)).toEqual({
      title:       "T",
      "from-bag":  "lar:///ha.ka.ba/@a",
      "to-bag":    "lar:///ha.ka.ba/@b",
      "change-id": "c1",
    });
  });

  test("CLEAR action encodes to bag-only args", () => {
    const action: ClearAction = {
      verb:        "CLEAR",
      requestId:   "r1",
      requestedBy: "actor",
      bag:         "lar:///ha.ka.ba/@b",
    };
    expect(encodeResidencyArgs(action)).toEqual({ bag: "lar:///ha.ka.ba/@b" });
  });

  test("LOAD action encodes to source-uri + to-bag + change-id", () => {
    const action: LoadAction = {
      verb:        "LOAD",
      requestId:   "r1",
      requestedBy: "actor",
      sourceUri:   "https://x",
      toBag:       "lar:///ha.ka.ba/@b",
      changeId:    "c1",
    };
    expect(encodeResidencyArgs(action)).toEqual({
      "source-uri": "https://x",
      "to-bag":     "lar:///ha.ka.ba/@b",
      "change-id":  "c1",
    });
  });
});

// ---------------------------------------------------------------------------
// change-id preservation across encode → JSON → parse roundtrip
// (Anti-pattern #1 defense gate)
// ---------------------------------------------------------------------------

describe("change-id preservation (Anti-pattern #1 defense)", () => {
  test("ADD: change-id survives encode → JSON.stringify → JSON.parse → parseResidencyAction", () => {
    const original: AddAction = {
      verb:        "ADD",
      requestId:   "req-1",
      requestedBy: "operator",
      title:       "MyTiddler",
      fromBag:     "lar:///ha.ka.ba/@personal",
      toBag:       "lar:///ha.ka.ba/@elyncia",
      changeId:    "stable-change-id-preserved-across-bags",
    };
    const encoded = encodeResidencyArgs(original);
    const wireBytes = JSON.stringify(encoded);
    const decoded = JSON.parse(wireBytes) as Record<string, unknown>;
    const inv = makeInvocation("ADD", decoded);
    const parsed = parseResidencyAction(inv);
    expect(parsed?.verb).toBe("ADD");
    expect((parsed as AddAction).changeId).toBe("stable-change-id-preserved-across-bags");
  });

  test("MOVE → ADD lift preserves change-id (lifting recognises 'same change, different bag')", () => {
    // Operator MOVEs tiddler from @personal to @<wiki> — change-id stays stable.
    const moveAction: MoveAction = {
      verb:        "MOVE",
      requestId:   "req-move-1",
      requestedBy: "operator",
      title:       "MyTiddler",
      fromBag:     "lar:///ha.ka.ba/@personal",
      toBag:       "lar:///ha.ka.ba/@wiki",
      changeId:    "shared-change-id",
    };
    // Later, ADD lifts the same tiddler (same change-id) from @wiki into a canon library.
    const addAction: AddAction = {
      verb:        "ADD",
      requestId:   "req-add-1",
      requestedBy: "operator",
      title:       "MyTiddler",
      fromBag:     "lar:///ha.ka.ba/@wiki",
      toBag:       "lar:///ha.ka.ba/@lares",
      changeId:    "shared-change-id", // <-- preserved by caller discipline
    };
    expect(moveAction.changeId).toBe(addAction.changeId);
    // Both encode/parse roundtrips preserve the shared identity.
    const moveParsed = parseResidencyAction(makeInvocation("MOVE", encodeResidencyArgs(moveAction)));
    const addParsed  = parseResidencyAction(makeInvocation("ADD",  encodeResidencyArgs(addAction)));
    expect((moveParsed as MoveAction).changeId).toBe((addParsed as AddAction).changeId);
  });

  test("LOAD mints fresh change-id; no preservation contract (external content)", () => {
    const a: LoadAction = {
      verb: "LOAD", requestId: "r1", requestedBy: "op",
      sourceUri: "https://x", toBag: "lar:///ha.ka.ba/@a", changeId: newChangeId(),
    };
    const b: LoadAction = {
      verb: "LOAD", requestId: "r2", requestedBy: "op",
      sourceUri: "https://x", toBag: "lar:///ha.ka.ba/@a", changeId: newChangeId(),
    };
    expect(a.changeId).not.toBe(b.changeId);
  });
});

// ---------------------------------------------------------------------------
// isResidencyActionUri (URI predicate)
// ---------------------------------------------------------------------------

describe("isResidencyActionUri", () => {
  test("accepts volatile verb URI", () => {
    expect(isResidencyActionUri(`${VERB_URI_PREFIX}abc123`)).toBe(true);
  });

  test("accepts admin verb signal URI", () => {
    expect(isResidencyActionUri(`${SUMMONS_URI_PREFIX}abc123`)).toBe(true);
  });

  test("rejects non-verb-tiddler URIs", () => {
    expect(isResidencyActionUri("lar:///ha.ka.ba/@lares/some/tiddler")).toBe(false);
    expect(isResidencyActionUri("https://example.com")).toBe(false);
    expect(isResidencyActionUri("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Type-level discriminated union exhaustiveness (compile-time)
// ---------------------------------------------------------------------------

describe("ResidencyAction discriminated union", () => {
  test("exhaustive switch covers all six variants", () => {
    function describe1(action: ResidencyAction): string {
      switch (action.verb) {
        case "ADD":   return `add ${action.title} to ${action.toBag}`;
        case "COPY":  return `copy ${action.title} ${action.fromBag} -> ${action.toBag}`;
        case "MOVE":  return `move ${action.title} ${action.fromBag} -> ${action.toBag}`;
        case "CLEAR": return `clear ${action.bag}`;
        case "DROP":  return `drop ${action.bag}`;
        case "LOAD":  return `load ${action.sourceUri} -> ${action.toBag}`;
      }
    }
    const add: AddAction = {
      verb: "ADD", requestId: "r", requestedBy: "o",
      title: "T", fromBag: "A", toBag: "B", changeId: "c",
    };
    expect(describe1(add)).toBe("add T to B");
  });
});

// ---------------------------------------------------------------------------
// V1 — content-addressed idempotency for residency changes (the `lares act`
// placer contract). The placer computes taskContentId({subject: target bag,
// command: verb, args, nonce:""}); the change-id in args IS the idempotency key.
// Re-issuing the SAME logical change collapses to one id (→ dispatcher
// outcome-dedup → exactly-once EFFECT); a distinct change runs.
// ---------------------------------------------------------------------------

describe("V1 — content-addressed residency identity (lares act placer contract)", () => {
  function residencyId(verb: string, args: Record<string, string>): Promise<string> {
    const subject = args["to-bag"] ?? args["bag"] ?? "";
    return taskContentId({ subject, command: verb, args, nonce: "" });
  }
  const base = { title: "M", "from-bag": "lar:///ha.ka.ba/@a", "to-bag": "lar:///ha.ka.ba/@b", "change-id": "chg-1" };

  test("same logical change → same id (re-issue dedups → exactly-once effect)", async () => {
    expect(await residencyId("MOVE", base)).toBe(await residencyId("MOVE", { ...base }));
  });
  test("distinct change-id → distinct id (a genuinely different change runs)", async () => {
    expect(await residencyId("MOVE", base)).not.toBe(await residencyId("MOVE", { ...base, "change-id": "chg-2" }));
  });
  test("distinct verb → distinct id (ADD ≠ MOVE of the same change)", async () => {
    expect(await residencyId("MOVE", base)).not.toBe(await residencyId("ADD", base));
  });
  test("distinct target bag → distinct id", async () => {
    expect(await residencyId("MOVE", base)).not.toBe(await residencyId("MOVE", { ...base, "to-bag": "lar:///ha.ka.ba/@c" }));
  });
});
