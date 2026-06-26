/**
 * telemetry-worker — the SEPARATE LOCAL non-federated telemetry-VM (a worker_thread). It
 * composes the isomorphic capture engine with node seams + `defaultAnnotate`, recovers its
 * WAL on boot, takes raw turns over the parentPort, and crests its own 20 Hz server tick to
 * flush to the mempalace palace. One per daemon, beside (never inside) the federated @admin.
 *
 * Runs in real node (the daemon spawns it), so importing `defaultAnnotate` (→ mempalace) is
 * fine here; the host references this module by URL only, never imports it.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/api/capture-annotation-model#isomorphic-telemetry-vm
 */

import { parentPort, workerData } from "node:worker_threads";

import { defaultAnnotate } from "./capture-annotate.js";
import { makeNodeCaptureEngine } from "./node-capture-engine.js";
import type { TelemetryWorkerConfig } from "./telemetry-worker-host.js";

type InMsg =
  | { readonly type: "enqueue"; readonly turnText: string; readonly sourceFile: string }
  | { readonly type: "flush" }
  | { readonly type: "stop" };

if (!parentPort) throw new Error("telemetry-worker must run as a worker_thread");
const port = parentPort;
const cfg = workerData as TelemetryWorkerConfig;

const engine = makeNodeCaptureEngine({
  palacePath: cfg.palacePath,
  spoolDir: cfg.spoolDir,
  walPath: cfg.walPath,
  quarantinePath: cfg.quarantinePath,
  annotate: defaultAnnotate,
  ...(cfg.gate !== undefined ? { gate: cfg.gate } : {}),
  ...(cfg.mempalaceBin !== undefined ? { mempalaceBin: cfg.mempalaceBin } : {}),
});

const tickMs = cfg.tickMs ?? 50;
let timer: ReturnType<typeof setInterval> | undefined;

async function tick(): Promise<void> {
  try {
    const filed = await engine.tick(Date.now());
    if (filed > 0) port.postMessage({ type: "flushed", filed, stats: engine.stats() });
  } catch (err) {
    port.postMessage({ type: "error", where: "tick", message: String(err) });
  }
}

port.on("message", (msg: InMsg) => {
  if (msg.type === "enqueue") {
    void engine
      .enqueue(msg.turnText, msg.sourceFile)
      .catch((err) => port.postMessage({ type: "error", where: "enqueue", message: String(err) }));
  } else if (msg.type === "flush") {
    void tick();
  } else if (msg.type === "stop") {
    if (timer) clearInterval(timer);
    void engine
      .tick(Date.now())
      .catch(() => undefined)
      .finally(() => {
        port.postMessage({ type: "stopped", stats: engine.stats() });
        port.close();
      });
  }
});

// Boot: recover the WAL (open sessions survive a restart), then start the tick.
void engine
  .recover()
  .then((recovered) => {
    timer = setInterval(() => void tick(), tickMs);
    port.postMessage({ type: "ready", recovered });
  })
  .catch((err) => port.postMessage({ type: "error", where: "recover", message: String(err) }));
