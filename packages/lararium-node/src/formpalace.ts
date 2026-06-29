/**
 * formpalace — the LIVING-GRAMMAR FORM store: a LOCAL, caller-vector store for the per-turn
 * FORM-vector (the two-planes form-capture's CONTINUOUS plane, encoded). Backed by a "form"
 * collection inside a mempalace instance (the same ChromaDB engine, the SECOND collection beside
 * the palace default), reached through ONE persistent Python holder (`form_encoder.py serve
 * --palace <dir>`). It NEVER federates — local, the eidetic↔grammatical bridge twin to `.astpalace`.
 *
 * Each turn's move-skeleton (emitMoveSkeleton, P1) + constructicon basis (buildConstructiconBasis,
 * P0) ride to the holder, which ENCODES the sparse fuzzy-membership form-vector (form_encoder, P2)
 * and STORES it as a caller-supplied dense vector (densified to basis.dimension), keyed by the
 * turn's `verbatim_sha` — the SAME key the content drawer carries as `lar_verbatim_sha`, so the
 * FORM graph and the CONTENT graph (the existing verbatim mempalace) fuse on one join key. The
 * embedding model is never invoked (we always supply our own vector), mirroring `.astpalace`.
 *
 * A module-level singleton keys the holder on the canonical palace dir, so a second
 * `makeFormPalace`/store REUSES the one process — the reap-don't-pile invariant.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/living-grammar-palace#two-planes
 */

import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";

import { resolveFormEncoderSpawn } from "@lararium/mempalace";
import type { MoveSkeleton, ConstructiconBasis, BearingFacets } from "@lararium/tw5/form-layer";

/** The serializable basis shape the Python encoder consumes (its `index` is re-derived from order). */
export interface SerializedBasis {
  readonly axes: ConstructiconBasis["axes"];
  readonly dimension: number;
}

/** The metadata stamped on a form entry — the where-filterable facets + the content-join key.
 *  Carries the {@link BearingFacets} (bearing_w1/w2/w3/root/path/frag/grade) too: the aim/yield
 *  bearing descended into flat scalars, where-filterable for the STRUCTURED bearing recall path
 *  (dual-graph-recall#makeFormSearch). Stamped off `skeleton.bearing.facets` in
 *  node-capture-engine#makeFormSplitFlush; the python store carries any `bearing_*` key through. */
export interface FormMetadata extends BearingFacets {
  /** the confidence register band (e.g. "synthesis"), for where-filtering */
  readonly register?: string;
  /** the deepest grammar-stack layer the turn touched */
  readonly grammar_layer?: string;
  /** sha256 of the canonical placeholdered-graph — the FORM recurrence key */
  readonly struct_hash?: string;
  /** sha256 of the verbatim turn — the CROSS-GRAPH join key to the content drawer */
  readonly verbatim_sha: string;
}

/** The outcome of an encode+store round-trip. */
export interface FormStoreResult {
  readonly key: string;
  readonly dimension: number;
  readonly count: number;
  readonly conformance: number;
  readonly slor: { readonly live: boolean; readonly model: string | null; readonly reason: string };
  readonly form_vector: { readonly indices: readonly number[]; readonly values: readonly number[] };
}

/** One form-similarity match. */
export interface FormMatch {
  readonly key: string;
  readonly distance: number | null;
  readonly metadata: Record<string, unknown>;
}

/** A stored form entry read back by key. */
export interface FormEntry {
  readonly key: string;
  readonly metadata: Record<string, unknown>;
  readonly document: string | null;
}

export interface FormPalace {
  /**
   * Encode a turn's move-skeleton against the basis, then STORE the form-vector keyed by its
   * `verbatim_sha`. Returns the encode+store outcome. THROWS if the holder did not persist, so the
   * caller never stamps a dangling form reference (the content path stays intact regardless).
   */
  encodeStore(input: {
    skeleton: MoveSkeleton;
    basis: SerializedBasis;
    key: string;
    metadata: FormMetadata;
  }): Promise<FormStoreResult>;
  /** Nearest turns by FORM similarity (encode the query skeleton, then search), optional where-filter. */
  query(input: {
    skeleton: MoveSkeleton;
    basis: SerializedBasis;
    nResults?: number;
    where?: Record<string, unknown>;
  }): Promise<FormMatch[]>;
  /**
   * METADATA-ONLY filter — NO vector. The structured bearing / keyword recall path: match form
   * entries by a `where`-clause alone (chroma `.get(where=…)`), so a bearing root or a register
   * scope yields matches without encoding a query skeleton. `distance` is null on each match (a
   * where-match carries no similarity ranking). A null/empty `where` returns up to `nResults` of
   * the collection; a where matching nothing returns []. (dual-graph-recall#makeFormSearch.)
   */
  filter(input: { where?: Record<string, unknown>; nResults?: number }): Promise<FormMatch[]>;
  /** Read a form entry back by its key (the verbatim_sha), or null if absent. */
  get(key: string): Promise<FormEntry | null>;
  /** Release this reference; the holder process is killed when the last reference closes. */
  close(): Promise<void>;
}

/** A child process plus the read-only stream surface the RPC needs (test-injectable). */
interface HolderProc {
  readonly stdin: NodeJS.WritableStream | null;
  readonly stdout: NodeJS.ReadableStream | null;
  readonly stderr: NodeJS.ReadableStream | null;
  on(event: "exit", cb: (code: number | null) => void): void;
  on(event: "error", cb: (err: Error) => void): void;
  kill(): void;
}

/** Test seam: produce the holder process for a canonical palace dir (defaults to the python helper). */
export type FormHolderSpawn = (canonicalDir: string) => HolderProc;

interface Pending {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/** The single live holder for one canonical palace dir — owns the child, ref-counts its users. */
class Holder {
  private proc: HolderProc | null = null;
  private starting: Promise<void> | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private stdoutBuf = "";
  private stderrTail = "";
  refs = 0;

  constructor(
    private readonly canonicalDir: string,
    private readonly spawnProc: FormHolderSpawn,
    private readonly timeoutMs: number,
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
      // stderr carries banner/library noise on a healthy boot, but the REAL fault (chroma permission,
      // disk full, an import blow-up) on a sick one — buffer its tail, surface it on failure.
      proc.stderr?.on?.("data", (chunk: string) => { this.stderrTail = (this.stderrTail + chunk).slice(-4096); });
      proc.on("exit", (code) => this.onDown(this.withStderr(new Error(`form_encoder holder exited (code ${code ?? "null"})`))));
      proc.on("error", (err) => this.onDown(this.withStderr(err)));
      // Handshake: a ping confirms the holder is up before any encode/store rides.
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
      if (msg.ok === false) p.reject(new Error(msg.error ?? "form_encoder error"));
      else p.resolve(msg.result);
    }
  }

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
    if (holders.get(this.canonicalDir) === this) holders.delete(this.canonicalDir);
  }

  private request(op: string, fields: Record<string, unknown>): Promise<unknown> {
    const id = this.nextId++;
    return new Promise<unknown>((res, rej) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        rej(new Error(`form_encoder '${op}' timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);
      this.pending.set(id, { resolve: res, reject: rej, timer });
      try {
        if (!this.proc?.stdin) throw new Error("form_encoder holder not started");
        this.proc.stdin.write(JSON.stringify({ id, op, ...fields }) + "\n");
      } catch (err) {
        this.pending.delete(id);
        clearTimeout(timer);
        rej(err as Error);
      }
    });
  }

  async send(op: string, fields: Record<string, unknown>): Promise<unknown> {
    await this.ensure();
    return this.request(op, fields);
  }

  shutdown(): void {
    this.onDown(new Error("form_encoder holder closed"));
    try {
      this.proc?.stdin?.end?.();
    } catch { /* ignore */ }
    this.proc?.kill?.();
  }
}

/** ONE holder per canonical palace dir — the singleton that makes "one holder, never a pile" true. */
const holders = new Map<string, Holder>();

function canonicalDirOf(dir: string): string {
  try {
    return realpathSync(dir);
  } catch {
    return resolve(dir);
  }
}

/** Default holder spawn: the venv-aware python running `form_encoder.py serve --palace <dir>`. */
function defaultHolderSpawn(canonicalDir: string): HolderProc {
  const { python, script, submoduleRoot, scriptPresent } = resolveFormEncoderSpawn();
  if (!python) throw new Error("no python holds mempalace — create ~/.venv and install the sidecar (`lares wake --install`)");
  if (!scriptPresent) throw new Error(`form_encoder.py missing at ${script}`);
  const env = { ...process.env, PYTHONPATH: submoduleRoot + (process.env["PYTHONPATH"] ? `:${process.env["PYTHONPATH"]}` : "") };
  return spawn(python, [script, "serve", "--palace", canonicalDir], {
    cwd: submoduleRoot,
    env,
    stdio: ["pipe", "pipe", "pipe"],
  }) as unknown as HolderProc;
}

export interface FormPalaceOptions {
  /** per-call RPC timeout (ms); default 60s (covers the one-time chroma open + first encode). */
  readonly timeoutMs?: number;
  /** test seam: override how the holder process is produced (defaults to the python helper). */
  readonly spawn?: FormHolderSpawn;
}

/**
 * Open the FORM store rooted at `dir` — a mempalace instance's "form" collection. Reuses the ONE
 * holder process per canonical dir (singleton); `close()` releases this reference and kills the
 * process when the last reference closes.
 */
export function makeFormPalace(dir: string, opts: FormPalaceOptions = {}): FormPalace {
  const canonicalDir = canonicalDirOf(dir);
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const spawnProc = opts.spawn ?? defaultHolderSpawn;

  let holder = holders.get(canonicalDir);
  if (!holder) {
    holder = new Holder(canonicalDir, spawnProc, timeoutMs);
    holders.set(canonicalDir, holder);
  }
  holder.refs += 1;
  const myHolder = holder;
  let closed = false;

  return {
    async encodeStore({ skeleton, basis, key, metadata }): Promise<FormStoreResult> {
      return (await myHolder.send("encode_store", {
        key,
        skeleton,
        basis,
        metadata,
      })) as FormStoreResult;
    },

    async query({ skeleton, basis, nResults, where }): Promise<FormMatch[]> {
      const res = (await myHolder.send("query", {
        skeleton,
        basis,
        n_results: nResults ?? 10,
        ...(where !== undefined ? { where } : {}),
      })) as { matches: FormMatch[] };
      return res.matches ?? [];
    },

    async filter({ where, nResults }): Promise<FormMatch[]> {
      const res = (await myHolder.send("filter", {
        n_results: nResults ?? 10,
        ...(where !== undefined ? { where } : {}),
      })) as { matches: FormMatch[] };
      return res.matches ?? [];
    },

    async get(key: string): Promise<FormEntry | null> {
      return (await myHolder.send("get", { key })) as FormEntry | null;
    },

    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      myHolder.refs -= 1;
      if (myHolder.refs <= 0) {
        myHolder.shutdown();
        if (holders.get(canonicalDir) === myHolder) holders.delete(canonicalDir);
      }
    },
  };
}

/** Test-only: how many holder processes are live (proves "one holder per palace, never a pile"). */
export function _liveFormHolderCount(): number {
  return holders.size;
}
