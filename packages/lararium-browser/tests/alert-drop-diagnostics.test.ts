/**
 * The browser vessel's make-it-loud legs (open-browser-vessel):
 *  - warnDroppedBrowserAlert — a wiki-alert with no live target + no durable mailbox must SPEAK
 *    (the browser's only observability floor is the console), never vanish invisibly.
 *  - loadFoundedCatalogOrWarn — a persisted @catalog that fails to load is DATA-AMNESIA; re-founding
 *    a blank catalog must surface LOUD, never a silent discard.
 */
import { describe, it, expect, vi } from "vitest";
import { warnDroppedBrowserAlert, loadFoundedCatalogOrWarn } from "../src/open-browser-vessel.js";
import type { Repo } from "@automerge/automerge-repo";

describe("warnDroppedBrowserAlert", () => {
  it("surfaces the dropped alert with its slug, reason, message and cause", () => {
    const seen: string[] = [];
    warnDroppedBrowserAlert("home-wiki", "Disk ward refused a write", "disk-ward", "unmounted-no-mailbox", (m) => seen.push(m));
    expect(seen).toHaveLength(1);
    expect(seen[0]).toContain("DROPPED (unmounted-no-mailbox)");
    expect(seen[0]).toContain("home-wiki");
    expect(seen[0]).toContain("Disk ward refused a write");
    expect(seen[0]).toContain("disk-ward");
  });

  it("omits the cause suffix cleanly when absent", () => {
    const seen: string[] = [];
    warnDroppedBrowserAlert("w", "msg", undefined, "raced-cold", (m) => seen.push(m));
    expect(seen[0]).not.toContain("cause:");
  });
});

describe("loadFoundedCatalogOrWarn", () => {
  it("returns the loaded handle and stays QUIET when the catalog loads", async () => {
    const handle = { url: "automerge:loaded" };
    const repo = { find: vi.fn().mockResolvedValue(handle) } as unknown as Repo;
    const loud = vi.fn();
    const refound = vi.fn(() => ({ url: "automerge:blank" }) as never);
    const got = await loadFoundedCatalogOrWarn(repo, "automerge:known", refound, loud);
    expect(got).toBe(handle);
    expect(loud).not.toHaveBeenCalled();
    expect(refound).not.toHaveBeenCalled();
  });

  it("surfaces DATA-AMNESIA LOUD and re-founds when the persisted catalog fails to load", async () => {
    const blank = { url: "automerge:blank" };
    const repo = { find: vi.fn().mockRejectedValue(new Error("unavailable")) } as unknown as Repo;
    const loud = vi.fn();
    const refound = vi.fn(() => blank as never);
    const got = await loadFoundedCatalogOrWarn(repo, "automerge:known", refound, loud);
    expect(got).toBe(blank);          // recovered — the vessel still boots
    expect(refound).toHaveBeenCalledOnce();
    expect(loud).toHaveBeenCalledOnce();
    expect(String(loud.mock.calls[0]?.[0])).toContain("DATA-AMNESIA");
    expect(String(loud.mock.calls[0]?.[0])).toContain("automerge:known");
  });
});
