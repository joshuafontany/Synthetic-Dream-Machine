/**
 * palace-holder — the SHARED palace-instance transport cap (the @daemon's TS side).
 *
 * The nameless palace-instance model, one level up from the python sidecar-caps collapse
 * (b18235f6): a palace client = its #has-stack of caps composed at a root, NOT a bespoke
 * holder per store with copy-pasted serve machinery. This module IS the one cap every
 * local palace-instance #has — the NDJSON line-RPC transport over a persistent python
 * `serve` holder, ref-counted to ONE process per canonical palace dir (reap-don't-pile).
 *
 * The caps a palace-instance composes from here:
 *   - the TRANSPORT cap  → {@link PalaceHolder} (this module): spawn-once, line-RPC, stderr
 *     surfacing, ping handshake, self-healing registry, ref-counted singleton-per-dir.
 *   - the REGISTRY cap   → {@link PalaceHolderRegistry}: ONE map per palace TYPE, so two
 *     palace types serving the SAME dir never collide (structurepalace ⟂ formpalace).
 * Each store (structurepalace · formpalace) then #has only its own OP SURFACE — a thin typed
 * facade of `holder.send(op, fields)` calls — and nothing of the transport machinery.
 *
 * The honest grain (NOT a god base-class — the sidecar 2-shapes lesson carried up): the
 * two LOCAL stores split by op-surface, but BOTH ride the identical transport, so the
 * transport collapses to ONE file while the op-surfaces stay distinct. A third shape, the
 * MESHPALACE, would compose this SAME transport plus a SOURCE-FEED cap (see {@link PalaceFeedCap})
 * — modeled here, federation deferred.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/capture-annotation-model#isomorphic-telemetry-vm
 */

import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { resolveComputeCapEnv } from "@lararium/mempalace";

/** A child process plus the read-only stream surface the line-RPC needs (test-injectable). */
export interface PalaceHolderProc {
  readonly stdin: NodeJS.WritableStream | null;
  readonly stdout: NodeJS.ReadableStream | null;
  readonly stderr: NodeJS.ReadableStream | null;
  on(event: "exit", cb: (code: number | null) => void): void;
  on(event: "error", cb: (err: Error) => void): void;
  kill(): void;
}

/** Test seam: produce the holder process for a canonical palace dir (defaults to a python helper). */
export type PalaceHolderSpawn = (canonicalDir: string) => PalaceHolderProc;

/** The resolved spawn inputs a python `serve` holder needs (the shape StructurePalaceSpawn / FormEncoderSpawn share). */
export interface ResolvedServeSpawn {
  /** the venv-aware interpreter, or null when none holds mempalace */
  readonly python: string | null;
  /** the helper script (full path) to run `serve` on */
  readonly script: string;
  /** the mempalace submodule root — the spawn cwd + PYTHONPATH so `import mempalace` resolves */
  readonly submoduleRoot: string;
  /** whether {@link ResolvedServeSpawn.script} exists on disk */
  readonly scriptPresent: boolean;
}

/**
 * Build the default holder spawn for a python `serve` palace store: resolve the venv-aware python
 * + helper script (lazily, per spawn, via `resolveSpawn`), then run `<python> <script> serve
 * --palace <dir>` with PYTHONPATH reaching the mempalace submodule. structurepalace + formpalace share
 * this verbatim — the only divergence was the resolve fn, lifted to a parameter here.
 */
export function makeServeSpawn(resolveSpawn: () => ResolvedServeSpawn, opts: { readonly palaceless?: boolean } = {}): PalaceHolderSpawn {
  return (canonicalDir: string): PalaceHolderProc => {
    const { python, script, submoduleRoot, scriptPresent } = resolveSpawn();
    if (!python) throw new Error("no python holds mempalace — create ~/.venv and install the sidecar (`lares wake --install`)");
    if (!scriptPresent) throw new Error(`serve helper missing at ${script}`);
    // PYTHONPATH=submoduleRoot makes `import mempalace` resolve (it is not pip-installed); the venv
    // python supplies chromadb. `python script.py` sets sys.path[0] to the SCRIPT dir, so PYTHONPATH
    // is the seam that reaches the submodule package.
    // The GPU compute cap (LD_LIBRARY_PATH → CUDA runtime libs + the device hint): the `serve` holder
    // opens its chroma collection, which builds the default onnxruntime embedder — and onnxruntime-gpu
    // HARD-fails to import (`libcudart.so.NN`) without the CUDA libs on the loader path. resolveComputeCapEnv
    // walks torch's bundled nvidia wheels; absent (the QA box) it adds only the device hint and degrades to CPU.
    const env = { ...process.env, PYTHONPATH: submoduleRoot + (process.env["PYTHONPATH"] ? `:${process.env["PYTHONPATH"]}` : ""), ...resolveComputeCapEnv(python) };
    // A palace-less holder (the embed cap) serves `serve` with NO --palace: the model is the
    // resource, not a store dir; `canonicalDir` is only the registry KEY, never passed to python.
    const argv = opts.palaceless ? [script, "serve"] : [script, "serve", "--palace", canonicalDir];
    return spawn(python, argv, {
      cwd: submoduleRoot,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    }) as unknown as PalaceHolderProc;
  };
}

/** Canonicalize a palace dir the way the python side will (realpath when it exists, else resolve). */
export function canonicalDirOf(dir: string): string {
  try {
    return realpathSync(dir);
  } catch {
    return resolve(dir);
  }
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * The TRANSPORT cap — one live holder for one canonical palace dir. Owns the child, speaks
 * NDJSON line-RPC ({id, op, ...fields} → {id, ok, result|error}) over stdin/stdout, buffers
 * the stderr tail and folds it into faults (the silent-error footgun cure), ref-counts its
 * users, and self-heals (drops itself from its registry on death so the next call respawns ONE).
 */
export class PalaceHolder {
  private proc: PalaceHolderProc | null = null;
  private starting: Promise<void> | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private stdoutBuf = "";
  /** Last ~4KB of stderr — a ChromaDB permission/disk-full error surfaces here, never swallowed. */
  private stderrTail = "";
  refs = 0;

  constructor(
    /** the canonical palace dir this holder serves — the registry key */
    readonly canonicalDir: string,
    private readonly spawnProc: PalaceHolderSpawn,
    private readonly timeoutMs: number,
    /** error-message prefix, e.g. "structurepalace" | "form_encoder" */
    private readonly label: string,
    /** drop this holder from its registry on death (self-heal) */
    private readonly dropSelf: (holder: PalaceHolder) => void,
  ) {}

  private async ensure(): Promise<void> {
    if (this.proc) return;
    if (this.starting) return this.starting;
    this.starting = new Promise<void>((res, rej) => {
      const proc = this.spawnProc(this.canonicalDir);
      this.proc = proc;
      proc.stdout?.setEncoding?.("utf8");
      proc.stdout?.on?.("data", (chunk: string) => this.onStdout(chunk));
      proc.stderr?.setEncoding?.("utf8");
      // stderr carries library/banner noise on a healthy boot, but ALSO the real fault on a sick one
      // (ChromaDB permission denied, disk full, an import blow-up). BUFFER its tail and SURFACE it on
      // failure — never swallow it to a noop. stdout stays the JSON-RPC channel.
      proc.stderr?.on?.("data", (chunk: string) => { this.stderrTail = (this.stderrTail + chunk).slice(-4096); });
      proc.on("exit", (code) => this.onDown(this.withStderr(new Error(`${this.label} holder exited (code ${code ?? "null"})`))));
      proc.on("error", (err) => this.onDown(this.withStderr(err)));
      // Handshake: a ping confirms the holder (and its chroma collection) opened before any op rides.
      this.request("ping", {}).then(() => res()).catch(rej);
    });
    try {
      await this.starting;
    } finally {
      this.starting = null;
    }
  }

  private onStdout(chunk: string): void {
    this.stdoutBuf += chunk;
    let idx: number;
    while ((idx = this.stdoutBuf.indexOf("\n")) !== -1) {
      const line = this.stdoutBuf.slice(0, idx).trim();
      this.stdoutBuf = this.stdoutBuf.slice(idx + 1);
      if (!line) continue;
      let msg: { id?: unknown; ok?: boolean; result?: unknown; error?: string };
      try {
        msg = JSON.parse(line);
      } catch {
        continue; // non-JSON on stdout (stray banner) — ignore
      }
      if (typeof msg.id !== "number") continue;
      const p = this.pending.get(msg.id);
      if (!p) continue;
      this.pending.delete(msg.id);
      clearTimeout(p.timer);
      if (msg.ok === false) p.reject(new Error(msg.error ?? `${this.label} error`));
      else p.resolve(msg.result);
    }
  }

  /** Fold the buffered stderr tail into an error so a python-side fault reaches the caller, not a noop. */
  private withStderr(err: Error): Error {
    const tail = this.stderrTail.trim();
    if (tail) err.message = `${err.message}\n  holder stderr: ${tail}`;
    return err;
  }

  private onDown(err: Error): void {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(err);
    }
    this.pending.clear();
    this.proc = null;
    // Self-healing: drop from the registry so the next call respawns ONE fresh holder.
    this.dropSelf(this);
  }

  private request(op: string, fields: Record<string, unknown>): Promise<unknown> {
    const id = this.nextId++;
    return new Promise<unknown>((res, rej) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        rej(new Error(`${this.label} '${op}' timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);
      this.pending.set(id, { resolve: res, reject: rej, timer });
      try {
        if (!this.proc?.stdin) throw new Error(`${this.label} holder not started`);
        this.proc.stdin.write(JSON.stringify({ id, op, ...fields }) + "\n");
      } catch (err) {
        this.pending.delete(id);
        clearTimeout(timer);
        rej(err as Error);
      }
    });
  }

  /** Ensure the holder is up (handshake once), then issue one RPC and await its result. */
  async send(op: string, fields: Record<string, unknown> = {}): Promise<unknown> {
    await this.ensure();
    return this.request(op, fields);
  }

  shutdown(): void {
    this.onDown(new Error(`${this.label} holder closed`));
    try {
      this.proc?.stdin?.end?.();
    } catch { /* ignore */ }
    this.proc?.kill?.();
  }
}

/**
 * The REGISTRY cap — ONE holder per canonical palace dir, scoped to ONE palace TYPE. Each
 * palace store instantiates its OWN registry, so structurepalace's holders and formpalace's holders
 * stay separate even when they happen to serve the same dir. Makes "one holder, never a pile"
 * true and gives the store a uniform acquire/release lifecycle.
 */
export class PalaceHolderRegistry {
  private readonly holders = new Map<string, PalaceHolder>();

  /** @param label error-message prefix shared by every holder this registry makes. */
  constructor(private readonly label: string) {}

  /** Get-or-create the singleton holder for `canonicalDir` and add a reference to it. */
  acquire(canonicalDir: string, spawnProc: PalaceHolderSpawn, timeoutMs: number): PalaceHolder {
    let holder = this.holders.get(canonicalDir);
    if (!holder) {
      holder = new PalaceHolder(canonicalDir, spawnProc, timeoutMs, this.label, (h) => {
        if (this.holders.get(h.canonicalDir) === h) this.holders.delete(h.canonicalDir);
      });
      this.holders.set(canonicalDir, holder);
    }
    holder.refs += 1;
    return holder;
  }

  /** Release one reference; kill the process (and drop it) when the last reference closes. */
  release(holder: PalaceHolder): void {
    holder.refs -= 1;
    if (holder.refs <= 0) {
      holder.shutdown(); // shutdown → onDown → dropSelf removes it from the map
    }
  }

  /** How many holder processes are live — proves "one holder per palace, never a pile". */
  size(): number {
    return this.holders.size;
  }
}

/**
 * A COMPOSED HOLDER — the send/close handle onto one held line-RPC subprocess. The shape every
 * cap that rides a python holder returns (palace store · encoder · a future consume-sidecar).
 */
export interface ComposedHolder {
  /** issue one line-RPC to the holder (the op-surface's single verb). */
  send(op: string, fields?: Record<string, unknown>): Promise<unknown>;
  /** release this reference; the holder process dies when the last reference closes. Idempotent. */
  close(): Promise<void>;
}

/** Back-compat alias — a palace's composed transport IS a composed holder. */
export type ComposedPalace = ComposedHolder;

/** ONE registry per label — module-global so a label's holders singleton across composes. */
const holderRegistries = new Map<string, PalaceHolderRegistry>();

/**
 * composeHolder — the GENERAL held-subprocess cap: one ref-counted line-RPC holder per `key` within
 * a `label` registry (+ a `send`/`close` pair). Knows NOTHING of "palace" — a nameless entity that
 * #has {held-process · line-RPC · one-per-key registry}. `composePalace` and `composeEncoder` both
 * COMPOSE this (siblings, neither over the other — the IoC that dissolves the palace-less sentinel):
 * a palace keys by its store DIR; an encoder keys by its LABEL (the model is the resource, no dir).
 * `key` is handed to `spawn` too — a palace-spawn reads it as the dir; an encoder-spawn ignores it.
 */
export function composeHolder(label: string, key: string, spawn: PalaceHolderSpawn, timeoutMs: number): ComposedHolder {
  let registry = holderRegistries.get(label);
  if (!registry) { registry = new PalaceHolderRegistry(label); holderRegistries.set(label, registry); }
  const reg = registry;
  const holder = reg.acquire(key, spawn, timeoutMs);
  let closed = false;
  return {
    send: (op: string, fields: Record<string, unknown> = {}) => holder.send(op, fields),
    close: async (): Promise<void> => { if (closed) return; closed = true; reg.release(holder); },
  };
}

/** A PALACE holder — composeHolder keyed by the canonical store DIR (one holder per dir per label). */
export function composePalace(label: string, dir: string, spawn: PalaceHolderSpawn, timeoutMs: number): ComposedPalace {
  return composeHolder(label, canonicalDirOf(dir), spawn, timeoutMs);
}

/** An ENCODER holder — composeHolder keyed by the LABEL (palace-less: ONE holder, the model is the
 *  resource; the spawn ignores the key). No sentinel dir — the sibling of composePalace. */
export function composeEncoder(label: string, spawn: PalaceHolderSpawn, timeoutMs: number): ComposedHolder {
  return composeHolder(label, label, spawn, timeoutMs);
}

/** How many holder processes a label holds live (proves "one holder per label, never a pile"). */
export function livePalaceHolderCount(label: string): number {
  return holderRegistries.get(label)?.size() ?? 0;
}

/**
 * MESHPALACE shape — FLAGGED, MODELED, NOT BUILT HERE.
 *
 * The meshpalace = a mempalace-instance fed by the @meshpalace Automerge doc through a
 * SOURCE-ADAPTER, AND the cross-Lararium bridge (peer Lararia federate their ≥meme memes
 * through it). As a palace-instance it #has the SAME transport cap above PLUS this feed cap
 * — the doc→palace source-adapter. The op-surface would be read-oriented (search/get over
 * the federated corpus), the FEED replacing the per-turn local `encodeStore`/`put` write path.
 *
 * The full DreamNet peer-federation wiring (the @meshpalace AutomergeDocStore FLOW-map,
 * mesh-memegraph, manaoio, the read-face wire) is a SEPARATE, larger mesh-domain piece and
 * is NOT implemented here. This interface only names the seam so the shape is ready.
 */
export interface PalaceFeedCap {
  /** Pull the next batch of source records (e.g. ≥meme drawers off the @meshpalace doc) to index. */
  pull(sinceWatermark?: string): Promise<{ records: readonly unknown[]; watermark: string }>;
}
