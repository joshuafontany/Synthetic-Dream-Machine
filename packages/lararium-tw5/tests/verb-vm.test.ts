import { describe, test, expect } from "vitest";
import type { CompositeStore, Verb, LarTiddlerRecord } from "@lararium/mesh";
import { OUTCOME_URI_PREFIX, VERB_RESULT_KEY, VERB_URI_PREFIX, buildVerb, parseVerb } from "@lararium/mesh";
import {
  dispatchVerb,
  patchVerb,
  placeVerb,
  removeVerb,
  writeOutcome,
} from "../src/verb-vm.js";

type TiddlerFields = Record<string, unknown>;

class FakeTW5Engine {
  private readonly records = new Map<string, TiddlerFields>();

  readonly wiki = {
    addTiddler: (tiddler: { fields?: TiddlerFields } | TiddlerFields): void => {
      const fields = (tiddler && typeof tiddler === "object" && "fields" in tiddler && tiddler.fields)
        ? tiddler.fields
        : tiddler as TiddlerFields;
      const title = typeof fields.title === "string" ? fields.title : null;
      if (!title) throw new Error("title required");
      this.records.set(title, { ...fields });
    },
    getTiddler: (title: string): { fields: TiddlerFields } | undefined => {
      const fields = this.records.get(title);
      return fields ? { fields: { ...fields } } : undefined;
    },
    deleteTiddler: (title: string): void => {
      this.records.delete(title);
    },
  };

  readonly $tw = {
    Tiddler: class {
      fields: TiddlerFields;
      constructor(fields: TiddlerFields) { this.fields = fields; }
    },
    wiki: this.wiki,
  };
}

class FakeAdminStore {
  readonly writes: LarTiddlerRecord[] = [];

  async put(record: LarTiddlerRecord): Promise<void> {
    this.writes.push(record);
  }
}

function makeInvocation(overrides: Partial<Verb> = {}): Verb {
  const fields = buildVerb({
    verb: "sync-wiki",
    args: { slug: "alpha" },
    requestedBy: "did:key:test",
    requestId: "req-test-1",
  });
  const parsed = parseVerb(fields);
  if (!parsed) throw new Error("failed to build test invocation");
  return { ...parsed, ...overrides };
}

describe("verb-vm", () => {
  test("placeVerb writes a pending volatile invocation into the VM wiki", () => {
    const tw5 = new FakeTW5Engine();

    const requestId = placeVerb(tw5 as never, {
      verb: "sync-wiki",
      args: { slug: "alpha" },
      requestedBy: "did:key:test",
      requestId: "req-place-1",
    });

    expect(requestId).toBe("req-place-1");
    const placed = tw5.wiki.getTiddler(`${VERB_URI_PREFIX}${requestId}`);
    expect(placed?.fields.status).toBe("pending");
  });

  test("patchVerb mutates the existing volatile invocation fields", () => {
    const tw5 = new FakeTW5Engine();
    const invocation = makeInvocation();
    tw5.wiki.addTiddler(invocation as unknown as TiddlerFields);

    patchVerb(tw5 as never, invocation.title, { status: "running", "started-at": "now" });

    const patched = tw5.wiki.getTiddler(invocation.title);
    expect(patched?.fields.status).toBe("running");
    expect(patched?.fields["started-at"]).toBe("now");
  });

  test("removeVerb tombstones the volatile invocation from the VM wiki", () => {
    const tw5 = new FakeTW5Engine();
    const invocation = makeInvocation();
    tw5.wiki.addTiddler(invocation as unknown as TiddlerFields);

    removeVerb(tw5 as never, invocation.title);

    expect(tw5.wiki.getTiddler(invocation.title)).toBeUndefined();
  });

  test("writeOutcome emits a durable summary outcome", async () => {
    const admin = new FakeAdminStore();
    const invocation = makeInvocation();

    await writeOutcome(admin as unknown as CompositeStore, {
      invocation,
      status: "done",
      result: { recordsIngested: 3 },
    });

    expect(admin.writes).toHaveLength(1);
    expect(admin.writes[0]?.tiddler.title).toBe(`${OUTCOME_URI_PREFIX}${invocation.requestId}`);
    const results = JSON.parse(String(admin.writes[0]?.tiddler.results ?? "{}")) as Record<string, { ok: boolean; output?: Record<string, unknown> }>;
    expect(results[VERB_RESULT_KEY]?.ok).toBe(true);
    expect(results[VERB_RESULT_KEY]?.output?.recordsIngested).toBe(3);
  });

  test("dispatchVerb marks running, writes outcome, then removes the volatile invocation on success", async () => {
    const tw5 = new FakeTW5Engine();
    const admin = new FakeAdminStore();
    const invocation = makeInvocation();
    tw5.wiki.addTiddler(invocation as unknown as TiddlerFields);

    await dispatchVerb(
      tw5 as never,
      admin as unknown as CompositeStore,
      invocation,
      async () => ({ status: "ok" }),
    );

    expect(tw5.wiki.getTiddler(invocation.title)).toBeUndefined();
    expect(admin.writes).toHaveLength(1);
    const results = JSON.parse(String(admin.writes[0]?.tiddler.results ?? "{}")) as Record<string, { ok: boolean; output?: Record<string, unknown> }>;
    expect(results[VERB_RESULT_KEY]?.ok).toBe(true);
    expect(results[VERB_RESULT_KEY]?.output?.status).toBe("ok");
  });

  test("dispatchVerb writes an error outcome and still removes the volatile invocation", async () => {
    const tw5 = new FakeTW5Engine();
    const admin = new FakeAdminStore();
    const invocation = makeInvocation({ requestId: "req-test-2", title: `${VERB_URI_PREFIX}req-test-2` });
    tw5.wiki.addTiddler(invocation as unknown as TiddlerFields);

    await dispatchVerb(
      tw5 as never,
      admin as unknown as CompositeStore,
      invocation,
      async () => {
        throw new Error("boom");
      },
    );

    expect(tw5.wiki.getTiddler(invocation.title)).toBeUndefined();
    expect(admin.writes).toHaveLength(1);
    expect(admin.writes[0]?.tiddler.status).toBe("error");
    expect(admin.writes[0]?.tiddler["error-message"]).toBe("boom");
  });
});
