/**
 * ea-breath-watchdog.test.ts — the daemon VM's ea watchdog listens for breath.
 *
 * The ea-breath law (burr resolved 2026-06-12): the daemon island emits breath
 * during mount; the vessel's watchdog re-arms its silence window on each
 * breath; silence alone times out. A mounting island that still breathes
 * never reads dead, however long the mount — the flat 120s deadline retires.
 *
 * Runs openDaemonVmCore against a scripted fake worker (no real island), with
 * a small injected silence budget so the vectors stay fast.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/daemon-vm-core
 */

import { describe, test, expect, afterEach } from "vitest";
import { MessageChannel, type MessagePort as NodeMessagePort } from "worker_threads";
import { Repo } from "@automerge/automerge-repo";
import {
  emptyLarDoc,
  mkEa, mkBreath,
  type LarDoc,
  type IslandMsg_Manifest,
} from "@lararium/mesh";
import { openDaemonVmCore, type DaemonVmHost } from "@lararium/tw5";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** A scripted island stand-in: captures listeners, lets the test emit upward. */
function fakeWorker() {
  const listeners: Array<(raw: unknown) => void> = [];
  return {
    handle: {
      post:      (_msg: unknown, _transfer?: unknown[]) => {},
      listen:    (h: (raw: unknown) => void): (() => void) => { listeners.push(h); return () => {}; },
      onError:   (_h: (err: Error) => void): (() => void) => () => {},
      terminate: () => {},
    },
    emit: (msg: unknown): void => { for (const l of listeners) l(msg); },
  };
}

describe("openDaemonVmCore — the ea-breath watchdog", () => {
  const cleanups: Array<() => void | Promise<void>> = [];

  afterEach(async () => {
    for (const c of cleanups.splice(0)) await c();
  });

  function openCore(eaSilenceMs: number, eaStallMs?: number) {
    const repo        = new Repo({ sharePolicy: async () => true });
    const daemonHandle = repo.create<LarDoc>(emptyLarDoc());
    const personaHandle = repo.create<LarDoc>(emptyLarDoc());
    const fw          = fakeWorker();
    const ports: NodeMessagePort[] = [];

    const host: DaemonVmHost = {
      spawnWorker: () => fw.handle,
      newSyncChannel: () => {
        const { port1, port2 } = new MessageChannel();
        ports.push(port1, port2);
        return {
          mainPort: port1 as unknown as IslandMsg_Manifest["syncPort"],
          syncPort: port2 as unknown as IslandMsg_Manifest["syncPort"],
        };
      },
    };

    const core = openDaemonVmCore(host, {
      repo,
      daemonHandle,
      personaHandle,
      recipe:          { wikiSlug: "daemon" },
      grants:          { islandUrl: daemonHandle.url },
      coreHash:        null,
      workerScriptUrl: new URL("file:///unused-fake-worker"),
      eaSilenceMs,
      ...(eaStallMs !== undefined ? { eaStallMs } : {}),
    });

    cleanups.push(() => core.dispose());
    cleanups.push(() => { for (const p of ports) p.close(); });
    cleanups.push(() => repo.shutdown().then(() => {}));

    return { core, fw };
  }

  test("breaths re-arm the silence window — ea resolves well past the budget", async () => {
    const { core, fw } = openCore(150);

    // Breathe every 50ms for 400ms — far past the 150ms silence budget.
    for (let i = 0; i < 8; i++) {
      await sleep(50);
      fw.emit(mkBreath("lar:///ha.ka.ba/@daemon", "recipe"));
    }
    fw.emit(mkEa("lar:///ha.ka.ba/@daemon"));

    await expect(core.workerEa).resolves.toBeUndefined();
  });

  test("breathing without advancing rejects at the stall budget", async () => {
    const { core, fw } = openCore(100, 220);

    // Frozen (phase, progress) every 30ms — alive, never advancing.
    const breather = setInterval(
      () => fw.emit(mkBreath("lar:///ha.ka.ba/@daemon", "slots", 2)),
      30,
    );
    cleanups.push(() => clearInterval(breather));

    await expect(core.workerEa).rejects.toThrow(/stalled.*slots/s);
  });

  test("advancing progress sustains past the stall budget", async () => {
    const { core, fw } = openCore(100, 150);

    for (let i = 0; i < 8; i++) {
      await sleep(40);
      fw.emit(mkBreath("lar:///ha.ka.ba/@daemon", "recipe", i + 1));
    }
    fw.emit(mkEa("lar:///ha.ka.ba/@daemon"));

    await expect(core.workerEa).resolves.toBeUndefined();
  });

  test("silence alone rejects, naming the last breath heard", async () => {
    const { core, fw } = openCore(120);

    fw.emit(mkBreath("lar:///ha.ka.ba/@daemon", "slots"));
    fw.emit(mkBreath("lar:///ha.ka.ba/@daemon", "tw5-boot"));
    // ...then breathing stops.

    await expect(core.workerEa).rejects.toThrow(/silence.*tw5-boot/s);
  });
});
