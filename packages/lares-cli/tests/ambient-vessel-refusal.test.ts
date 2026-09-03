/**
 * ambient-vessel-refusal — the fallback that aims a fixture at the operator's own hearth.
 *
 * `udsSocketPath()` with no argument means "this caller's vessel", and the ambient default is right.
 * `udsSocketPath(null)` means a root was looked for and NOT FOUND — and falling back there connects a
 * caller to the live vessel while it believes it holds a fixture. That failure PASSES: the real daemon
 * answers correctly, so the vector goes green having measured the wrong hearth.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/lares-lararium-binding
 */

import { describe, expect, test } from "vitest";
import { udsSocketPath, udsSocketPresent } from "../src/local-connector.js";

describe("the ambient vessel is reached by asking, never by failing to resolve", () => {
  test("an unresolved root is refused, and the refusal names what it refused", () => {
    expect(() => udsSocketPath(null)).toThrow(/refusing to fall back to the ambient vessel/);
  });

  /** The control: an ABSENT argument is a different ask and keeps the default it always had. */
  test("an absent root still resolves a path", () => {
    expect(udsSocketPath()).toMatch(/\.sock$/);
  });

  /**
   * A stated root reaches ITS OWN door. The rendezvous hashes the root into `/tmp/lares-<uid>/`, so the
   * path never quotes the root back — which is exactly why the null case had to be refused rather than
   * caught by inspection downstream: two different roots produce two opaque names, and neither one
   * announces which hearth it belongs to.
   */
  test("two roots are two doors, and neither is the ambient one", () => {
    const a = udsSocketPath("/tmp/staged-root-a");
    const b = udsSocketPath("/tmp/staged-root-b");
    expect(a).not.toBe(b);
    expect(a).not.toBe(udsSocketPath());
    expect(b).not.toBe(udsSocketPath());
  });

  /** The presence read carries the same refusal — it derives the path before it stats anything. */
  test("the presence read refuses an unresolved root rather than answering about the live vessel", () => {
    expect(() => udsSocketPresent(null)).toThrow(/refusing to fall back/);
  });
});
