/**
 * capture-flush — node's CaptureFlush verb: serialize a batch → spawn `mine --source ndjson`
 * → parse the count → clean up the transient spool file.
 */

import { access, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { makeSubprocessFlush } from "../src/capture-flush.js";

describe("makeSubprocessFlush", () => {
  test("serializes the batch, spawns the adapter flush, parses the count, cleans up", async () => {
    const spool = await mkdtemp(join(tmpdir(), "capflush-"));
    let calledArgs: string[] = [];
    let captured: Array<{ content: string; metadata?: Record<string, string> }> = [];
    const flush = makeSubprocessFlush({
      spoolDir: spool,
      palacePath: "/tmp/palace",
      spawn: async (_bin, args) => {
        calledArgs = [...args];
        captured = (await readFile(args[args.length - 1], "utf-8"))
          .trim()
          .split("\n")
          .map((l) => JSON.parse(l));
        return { stdout: "  source=ndjson  Drawers filed: 2" };
      },
    });

    const filed = await flush([
      { content: "a", source_file: "x/1" },
      { content: "b", source_file: "x/2", metadata: { wing: "w" } },
    ]);
    expect(filed).toBe(2);
    // --palace is GLOBAL (before the subcommand); --daemon hands off to the write-daemon seam.
    expect(calledArgs.slice(0, 6)).toEqual(["--palace", "/tmp/palace", "mine", "--source", "ndjson", "--daemon"]);
    expect(captured[1].metadata?.wing).toBe("w");
    await expect(access(calledArgs[calledArgs.length - 1])).rejects.toThrow(); // cleaned up
  });

  test("a failing spawn throws (so CaptureNalu re-queues) and still cleans up", async () => {
    const spool = await mkdtemp(join(tmpdir(), "capflush-"));
    let spoolFile = "";
    const flush = makeSubprocessFlush({
      spoolDir: spool,
      palacePath: "/tmp/palace",
      spawn: async (_bin, args) => {
        spoolFile = args[args.length - 1];
        throw new Error("mine failed");
      },
    });
    await expect(flush([{ content: "a", source_file: "x/1" }])).rejects.toThrow("mine failed");
    await expect(access(spoolFile)).rejects.toThrow(); // cleaned up despite the failure
  });
});
