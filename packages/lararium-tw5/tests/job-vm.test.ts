import { describe, test, expect } from "vitest";
import type { CompositeStore, JobTiddler, LarTiddlerRecord } from "@lararium/mesh";
import { JOB_RECEIPT_URI_PREFIX, JOB_RESULT_KEY, JOB_URI_PREFIX, buildJobTiddler, parseJobTiddler } from "@lararium/mesh";
import {
  dispatchVmJobLifecycle,
  patchVmJob,
  placeVmJob,
  removeVmJob,
  writeVmJobReceipt,
} from "../src/job-vm.js";

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

function makeJob(overrides: Partial<JobTiddler> = {}): JobTiddler {
  const fields = buildJobTiddler({
    verb: "sync-wiki",
    args: { slug: "alpha" },
    requestedBy: "did:key:test",
    requestId: "req-test-1",
  });
  const parsed = parseJobTiddler(fields);
  if (!parsed) throw new Error("failed to build test job");
  return { ...parsed, ...overrides };
}

describe("job-vm", () => {
  test("placeVmJob writes a pending volatile job into the VM wiki", () => {
    const tw5 = new FakeTW5Engine();

    const requestId = placeVmJob(tw5 as never, {
      verb: "sync-wiki",
      args: { slug: "alpha" },
      requestedBy: "did:key:test",
      requestId: "req-place-1",
    });

    expect(requestId).toBe("req-place-1");
    const placed = tw5.wiki.getTiddler(`${JOB_URI_PREFIX}${requestId}`);
    expect(placed?.fields.status).toBe("pending");
  });

  test("patchVmJob mutates the existing volatile job fields", () => {
    const tw5 = new FakeTW5Engine();
    const job = makeJob();
    tw5.wiki.addTiddler(job as unknown as TiddlerFields);

    patchVmJob(tw5 as never, job.title, { status: "running", "started-at": "now" });

    const patched = tw5.wiki.getTiddler(job.title);
    expect(patched?.fields.status).toBe("running");
    expect(patched?.fields["started-at"]).toBe("now");
  });

  test("removeVmJob tombstones the volatile job from the VM wiki", () => {
    const tw5 = new FakeTW5Engine();
    const job = makeJob();
    tw5.wiki.addTiddler(job as unknown as TiddlerFields);

    removeVmJob(tw5 as never, job.title);

    expect(tw5.wiki.getTiddler(job.title)).toBeUndefined();
  });

  test("writeVmJobReceipt emits a durable summary receipt", async () => {
    const admin = new FakeAdminStore();
    const job = makeJob();

    await writeVmJobReceipt(admin as unknown as CompositeStore, {
      job,
      status: "done",
      result: { recordsIngested: 3 },
    });

    expect(admin.writes).toHaveLength(1);
    expect(admin.writes[0]?.tiddler.title).toBe(`${JOB_RECEIPT_URI_PREFIX}${job.requestId}`);
    const results = JSON.parse(String(admin.writes[0]?.tiddler.results ?? "{}")) as Record<string, { ok: boolean; output?: Record<string, unknown> }>;
    expect(results[JOB_RESULT_KEY]?.ok).toBe(true);
    expect(results[JOB_RESULT_KEY]?.output?.recordsIngested).toBe(3);
  });

  test("dispatchVmJobLifecycle marks running, writes receipt, then removes the volatile job on success", async () => {
    const tw5 = new FakeTW5Engine();
    const admin = new FakeAdminStore();
    const job = makeJob();
    tw5.wiki.addTiddler(job as unknown as TiddlerFields);

    await dispatchVmJobLifecycle(
      tw5 as never,
      admin as unknown as CompositeStore,
      job,
      async () => ({ status: "ok" }),
    );

    expect(tw5.wiki.getTiddler(job.title)).toBeUndefined();
    expect(admin.writes).toHaveLength(1);
    const results = JSON.parse(String(admin.writes[0]?.tiddler.results ?? "{}")) as Record<string, { ok: boolean; output?: Record<string, unknown> }>;
    expect(results[JOB_RESULT_KEY]?.ok).toBe(true);
    expect(results[JOB_RESULT_KEY]?.output?.status).toBe("ok");
  });

  test("dispatchVmJobLifecycle writes an error receipt and still removes the volatile job", async () => {
    const tw5 = new FakeTW5Engine();
    const admin = new FakeAdminStore();
    const job = makeJob({ requestId: "req-test-2", title: `${JOB_URI_PREFIX}req-test-2` });
    tw5.wiki.addTiddler(job as unknown as TiddlerFields);

    await dispatchVmJobLifecycle(
      tw5 as never,
      admin as unknown as CompositeStore,
      job,
      async () => {
        throw new Error("boom");
      },
    );

    expect(tw5.wiki.getTiddler(job.title)).toBeUndefined();
    expect(admin.writes).toHaveLength(1);
    expect(admin.writes[0]?.tiddler.status).toBe("error");
    expect(admin.writes[0]?.tiddler["error-message"]).toBe("boom");
  });
});