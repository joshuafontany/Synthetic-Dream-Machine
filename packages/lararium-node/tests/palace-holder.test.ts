/**
 * palace-holder — the SHARED palace-instance transport cap (the #has-stack foundation both the
 * astpalace and the formpalace compose). These tests drive it with a FAKE spawn (no python):
 *   - the op round-trip: send(op, fields) → request → matched response by id;
 *   - the ping handshake gates the first op (ensure-once);
 *   - the reap-don't-pile invariant: ONE holder per canonical dir, ref-counted, freed on last close;
 *   - two registries (the two palace TYPES) stay ISOLATED even on the SAME dir;
 *   - a sick holder SURFACES its buffered stderr tail (the silent-error footgun cure).
 *
 * The fake holder echoes a JSON-RPC reply for every line it receives on stdin, so a real
 * line-RPC round-trip runs without chroma/python.
 */

import { EventEmitter } from "node:events";

import { describe, expect, test } from "vitest";

import {
  PalaceHolderRegistry,
  type PalaceHolderProc,
  type PalaceHolderSpawn,
} from "../src/palace-holder.js";

/** A fake holder: parses each stdin line and emits an {id, ok, result} reply (per-op handler). */
function fakeSpawn(handle: (op: string, fields: Record<string, unknown>) => unknown): PalaceHolderSpawn {
  return () => {
    const stdout = new EventEmitter() as EventEmitter & { setEncoding(): void };
    stdout.setEncoding = () => {};
    const stderr = new EventEmitter() as EventEmitter & { setEncoding(): void };
    stderr.setEncoding = () => {};
    const events = new EventEmitter();
    const stdin = {
      write: (line: string) => {
        const { id, op, ...fields } = JSON.parse(line.trim());
        // reply async, next tick, mimicking a real process
        setTimeout(() => {
          try {
            const result = handle(op, fields);
            stdout.emit("data", JSON.stringify({ id, ok: true, result }) + "\n");
          } catch (err) {
            stdout.emit("data", JSON.stringify({ id, ok: false, error: String(err) }) + "\n");
          }
        }, 1);
        return true;
      },
      end: () => {},
    } as unknown as NodeJS.WritableStream;
    return {
      stdin,
      stdout: stdout as unknown as NodeJS.ReadableStream,
      stderr: stderr as unknown as NodeJS.ReadableStream,
      on: (ev: "exit" | "error", cb: (arg: never) => void) => { events.on(ev, cb); },
      kill: () => {},
    } satisfies PalaceHolderProc;
  };
}

/** A sick holder: emits a stderr fault then exits non-zero (ping never resolves). */
function sickSpawn(stderrText: string, exitCode = 1): PalaceHolderSpawn {
  return () => {
    const stdout = new EventEmitter() as EventEmitter & { setEncoding(): void };
    stdout.setEncoding = () => {};
    const stderr = new EventEmitter() as EventEmitter & { setEncoding(): void };
    stderr.setEncoding = () => {};
    const events = new EventEmitter();
    setTimeout(() => {
      stderr.emit("data", stderrText);
      events.emit("exit", exitCode);
    }, 5);
    return {
      stdin: { write: () => true, end: () => {} } as unknown as NodeJS.WritableStream,
      stdout: stdout as unknown as NodeJS.ReadableStream,
      stderr: stderr as unknown as NodeJS.ReadableStream,
      on: (ev: "exit" | "error", cb: (arg: never) => void) => { events.on(ev, cb); },
      kill: () => {},
    } satisfies PalaceHolderProc;
  };
}

describe("PalaceHolder transport cap — the op round-trip", () => {
  test("send(op, fields) round-trips through the fake holder, matched by id", async () => {
    const reg = new PalaceHolderRegistry("test");
    const seen: Array<{ op: string; fields: Record<string, unknown> }> = [];
    const spawn = fakeSpawn((op, fields) => {
      seen.push({ op, fields });
      if (op === "ping") return { ok: true };
      if (op === "echo") return { got: fields["n"] };
      throw new Error(`unknown op ${op}`);
    });
    const holder = reg.acquire("/tmp/test-a", spawn, 5_000);

    const r1 = (await holder.send("echo", { n: 1 })) as { got: number };
    const r2 = (await holder.send("echo", { n: 2 })) as { got: number };
    expect(r1.got).toBe(1);
    expect(r2.got).toBe(2);
    // ping fired exactly once (ensure-once), before the first op.
    expect(seen.filter((s) => s.op === "ping")).toHaveLength(1);
    expect(seen[0]!.op).toBe("ping");

    reg.release(holder);
    expect(reg.size()).toBe(0);
  });

  test("a holder op that returns ok:false rejects with the error", async () => {
    const reg = new PalaceHolderRegistry("test");
    const holder = reg.acquire("/tmp/test-b", fakeSpawn((op) => {
      if (op === "ping") return {};
      throw new Error("boom");
    }), 5_000);
    await expect(holder.send("nope", {})).rejects.toThrow(/boom/);
    reg.release(holder);
  });
});

describe("PalaceHolderRegistry — reap-don't-pile (ONE holder per dir)", () => {
  test("two acquires on the SAME dir share ONE holder; freed only on the last release", async () => {
    const reg = new PalaceHolderRegistry("test");
    const spawn = fakeSpawn((op) => (op === "ping" ? {} : { ok: true }));
    const a = reg.acquire("/tmp/shared", spawn, 5_000);
    const b = reg.acquire("/tmp/shared", spawn, 5_000);
    expect(a).toBe(b);          // the SAME holder object — no pile
    expect(reg.size()).toBe(1);
    expect(a.refs).toBe(2);

    // both references drive ops through the one holder
    await Promise.all([a.send("x", {}), b.send("y", {})]);

    reg.release(a);
    expect(reg.size()).toBe(1); // b still holds it
    reg.release(b);
    expect(reg.size()).toBe(0); // last release frees it
  });

  test("two registries (two palace TYPES) stay isolated on the SAME dir", () => {
    const astReg = new PalaceHolderRegistry("astpalace");
    const formReg = new PalaceHolderRegistry("form_encoder");
    const spawn = fakeSpawn((op) => (op === "ping" ? {} : {}));
    const a = astReg.acquire("/tmp/same", spawn, 5_000);
    const f = formReg.acquire("/tmp/same", spawn, 5_000);
    expect(a).not.toBe(f);       // distinct holders despite the shared dir
    expect(astReg.size()).toBe(1);
    expect(formReg.size()).toBe(1);
    astReg.release(a);
    formReg.release(f);
  });
});

describe("PalaceHolder — a sick holder surfaces its stderr (the footgun cure)", () => {
  test("an op against a holder that dies rejects WITH the buffered stderr fault", async () => {
    const reg = new PalaceHolderRegistry("astpalace");
    const fault = "chromadb PermissionError: [Errno 13] could not open chroma.sqlite3";
    const holder = reg.acquire("/tmp/sick", sickSpawn(fault), 5_000);
    await expect(holder.send("put", {})).rejects.toThrow(/PermissionError/);
    // self-heal: the dead holder dropped itself from the registry
    expect(reg.size()).toBe(0);
  });
});
