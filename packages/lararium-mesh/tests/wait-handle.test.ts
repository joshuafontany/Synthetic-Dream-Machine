/**
 * The boot resolver keeps a late remote, and that is the whole property under test.
 *
 * WHAT MAKES THIS GUARD WORTH WRITING. Every call returns a handle whether or not the late-merge stands,
 * every boot completes, and any test asserting only "a handle came back" passes either way — while a
 * peer's content silently never arrives. So the assertion has to reach past the return value and read
 * what lands in the handle AFTER the window closed. The keel documented one strategy while two ran; a
 * claim of unity wants a test a reader can check rather than a comment.
 *
 * The fakes hold only what the resolver touches: `findWithProgress`, a `whenReady` promise the test
 * resolves on its own schedule, and a `merge` that records. No Repo, no network, no clock of its own.
 */
import { describe, expect, test } from "vitest";

import { waitHandle, LOCAL_READY_MS } from "../src/wait-handle.js";

type Handle = { id: string; merged: string[] };
const handle = (id: string): Handle => ({ id, merged: [] });

/** A Repo stand-in whose readiness the test controls. `never` models a peer that has not synced. */
function fakeRepo(ready: Promise<Handle> | "never") {
  return {
    findWithProgress: () => ({
      whenReady: () => (ready === "never" ? new Promise<Handle>(() => {}) : ready),
    }),
  } as never;
}

/** A handle whose `merge` records what arrived — the only way to see a late remote land. */
function recordingFallback(id: string) {
  const h = handle(id);
  return { h, fn: () => ({ ...h, merge: (other: Handle) => h.merged.push(other.id) }) as never };
}

describe("a doc the local store already holds", () => {
  test("returns without waiting out the window", async () => {
    const started = Date.now();
    const got = await waitHandle(fakeRepo(Promise.resolve(handle("local"))), "automerge:x", () => handle("fresh") as never);
    expect((got as unknown as Handle).id).toBe("local");
    expect(Date.now() - started).toBeLessThan(LOCAL_READY_MS);
  });
});

describe("a doc the peer has not synced yet", () => {
  test("falls back rather than hanging the boot", async () => {
    const { fn } = recordingFallback("fresh");
    const got = await waitHandle(fakeRepo("never"), "automerge:x", fn, 5);
    expect((got as unknown as Handle).id).toBe("fresh");
  });

  test("★ THE LATE REMOTE MERGES INTO THE HANDLE THE CALLER ALREADY HOLDS ★", async () => {
    // Delete `progress.whenReady().then(h => fresh.merge(h))` in wait-handle.ts and THIS is the only
    // assertion that reds. Everything else about the call still behaves.
    let land!: (h: Handle) => void;
    const late = new Promise<Handle>((r) => { land = r; });
    const { h, fn } = recordingFallback("fresh");

    const got = await waitHandle(fakeRepo(late), "automerge:x", fn, 5);
    expect((got as unknown as Handle).id).toBe("fresh");   // boot moved on
    expect(h.merged).toEqual([]);                          // nothing has arrived yet

    land(handle("from-peer"));                             // the peer syncs, one tick past the window
    await new Promise((r) => setTimeout(r, 0));
    expect(h.merged, "a doc arriving after the window must merge, never leave a blank fork").toEqual(["from-peer"]);
  });

  test("a remote that never comes leaves the fallback whole and throws nothing", async () => {
    const { h, fn } = recordingFallback("fresh");
    const rejecting = { findWithProgress: () => ({ whenReady: () => Promise.reject(new Error("unavailable")) }) } as never;
    const got = await waitHandle(rejecting, "automerge:x", fn, 5);
    expect((got as unknown as Handle).id).toBe("fresh");
    await new Promise((r) => setTimeout(r, 0));
    expect(h.merged).toEqual([]);
  });
});

describe("the window", () => {
  test("a zero window reads as do-not-wait rather than as an error, and still late-merges", async () => {
    let land!: (h: Handle) => void;
    const late = new Promise<Handle>((r) => { land = r; });
    const { h, fn } = recordingFallback("fresh");
    const got = await waitHandle(fakeRepo(late), "automerge:x", fn, 0);
    expect((got as unknown as Handle).id).toBe("fresh");
    land(handle("from-peer"));
    await new Promise((r) => setTimeout(r, 0));
    expect(h.merged).toEqual(["from-peer"]);
  });
});
