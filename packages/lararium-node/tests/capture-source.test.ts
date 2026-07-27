/** This Python AI-session shore transports descriptors only, never a session turn body. */
import { EventEmitter } from "node:events";

import { afterEach, describe, expect, test } from "vitest";

import { makeSourceCapture, type SourceCapture, type SourceCaptureRequest } from "../src/capture-source.js";
import type { PalaceHolderProc, PalaceHolderSpawn } from "../src/sensorium.js";

function fakeSpawn(seen: Array<{ op: string; fields: Record<string, unknown> }>): PalaceHolderSpawn {
  return () => {
    const stdout = new EventEmitter() as EventEmitter & { setEncoding(): void };
    stdout.setEncoding = () => {};
    const stderr = new EventEmitter() as EventEmitter & { setEncoding(): void };
    stderr.setEncoding = () => {};
    const events = new EventEmitter();
    return {
      stdin: {
        write: (line: string) => {
          const { id, op, ...fields } = JSON.parse(line.trim());
          seen.push({ op, fields });
          setTimeout(() => stdout.emit("data", JSON.stringify({ id, ok: true, result: op === "ping" ? { ready: true } : { landed: 3, skipped: 0, failed: [], watermark: 3, backlog: [] } }) + "\n"), 1);
          return true;
        }, end: () => {},
      } as unknown as NodeJS.WritableStream,
      stdout: stdout as unknown as NodeJS.ReadableStream,
      stderr: stderr as unknown as NodeJS.ReadableStream,
      on: (event: "exit" | "error", cb: (arg: never) => void) => { events.on(event, cb); },
      kill: () => {},
    } satisfies PalaceHolderProc;
  };
}

const opened: SourceCapture[] = [];
afterEach(async () => { await Promise.all(opened.splice(0).map((capture) => capture.close())); });

describe("makeSourceCapture", () => {
  test("ships only the Python source descriptor", async () => {
    const seen: Array<{ op: string; fields: Record<string, unknown> }> = [];
    const capture = makeSourceCapture("/tmp/capture-source-root", { spawn: fakeSpawn(seen) });
    opened.push(capture);
    await expect(capture.capture({ surface: "copilot-vscode", pointer: "/sessions/chat.jsonl", wing: "wing_proj", room: "conversations" })).resolves.toMatchObject({ landed: 3 });
    expect(seen).toEqual([
      { op: "ping", fields: {} },
      { op: "capture", fields: { surface: "copilot-vscode", pointer: "/sessions/chat.jsonl", wing: "wing_proj", room: "conversations" } },
    ]);
    expect(JSON.stringify(seen)).not.toContain("turnText");
  });

  test("preserves the Copilot SQLite session selector", async () => {
    const seen: Array<{ op: string; fields: Record<string, unknown> }> = [];
    const capture = makeSourceCapture("/tmp/capture-source-root", { spawn: fakeSpawn(seen) });
    opened.push(capture);
    await capture.capture({ surface: "copilot", pointer: "/sessions/session-store.db", wing: "wing_proj", sessionId: "cop-42" });
    expect(seen[1]).toEqual({ op: "capture", fields: { surface: "copilot", pointer: "/sessions/session-store.db", wing: "wing_proj", sessionId: "cop-42" } });
  });

  test("projects runtime input onto the source-descriptor admission boundary", async () => {
    const seen: Array<{ op: string; fields: Record<string, unknown> }> = [];
    const capture = makeSourceCapture("/tmp/capture-source-root", { spawn: fakeSpawn(seen) });
    opened.push(capture);
    await capture.capture({
      surface: "claude", pointer: "/sessions/session.jsonl", wing: "wing_proj",
      turnText: "this payload must not cross the descriptor shore",
    } as SourceCaptureRequest);
    expect(seen[1]).toEqual({
      op: "capture",
      fields: { surface: "claude", pointer: "/sessions/session.jsonl", wing: "wing_proj" },
    });
  });

  test("refuses an empty source descriptor before it reaches Python", async () => {
    const seen: Array<{ op: string; fields: Record<string, unknown> }> = [];
    const capture = makeSourceCapture("/tmp/capture-source-root", { spawn: fakeSpawn(seen) });
    opened.push(capture);
    await expect(capture.capture({ surface: "claude", pointer: "", wing: "wing_proj" })).rejects.toThrow("pointer and wing");
    expect(seen).toEqual([]);
  });

  test("refuses an unknown runtime surface before it reaches Python", async () => {
    const seen: Array<{ op: string; fields: Record<string, unknown> }> = [];
    const capture = makeSourceCapture("/tmp/capture-source-root", { spawn: fakeSpawn(seen) });
    opened.push(capture);
    await expect(capture.capture({ surface: "mudlet", pointer: "/events.ndjson", wing: "wing_mudlet" } as SourceCaptureRequest))
      .rejects.toThrow("supported AI session source");
    expect(seen).toEqual([]);
  });
});
