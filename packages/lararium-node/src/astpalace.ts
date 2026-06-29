/**
 * astpalace — the memory-ast-unfolding: a LOCAL, content-addressed store for the per-turn
 * parse-tree AST, now backed by a SECOND mempalace instance (the same ChromaDB engine, a
 * separate palace dir at `~/.lares/.astpalace`) — parallel to the verbatim palace
 * (`~/.mempalace`) and to `.meshpalace`. It NEVER federates on the mesh (the pattern
 * integrity, twin to .meshpalace's "code, no content, ever" — here it is ".astpalace: the
 * unfolding, local, never the wire").
 *
 * Each AST is stored as a drawer keyed by its STRUCTURAL HASH — sha256 of the canonical-JSON
 * of the parse tree. Recurrence (the SAME structure parsed again) lands the SAME hash = the
 * SAME drawer: the frequency signal (Unison-style), tallied as `count`. Each entry BINDS to
 * its verbatim BOTH ways — it carries `source_file` + `verbatim_sha` back toward the verbatim
 * mempalace drawer, and that drawer carries `lar_ast_hash` (this entry's id) forward to here.
 * The join keys are pure-TS hashes (computed HERE), so neither store waits on the other's id.
 *
 * The store is a thin RPC over ONE persistent Python holder (`astpalace_io.py serve`) that
 * owns the `.astpalace` PersistentClient. A module-level singleton keys that holder on the
 * canonical palace dir, so a second `makeAstPalace`/`put` REUSES the one process — the
 * reap-don't-pile invariant: never two holders fighting the per-palace mine lock.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/capture-annotation-model#isomorphic-telemetry-vm
 */

import { spawn, type ChildProcess } from "node:child_process";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";

import {
  canonicalJson,
  canonicalJsonBytes,
  defaultCryptoProvider,
  sha256Hex,
  utf8Bytes,
} from "@lararium/mesh";
import { resolveAstPalaceSpawn } from "@lararium/mempalace";

/** A provenance link back to a verbatim turn (the drawer this AST unfolded from). */
export interface AstProvenance {
  /** the capture source_file (the session-drawer locator in the mempalace) */
  readonly source_file: string;
  /** sha256 of the verbatim turn text — the join key to the drawer's content */
  readonly verbatim_sha: string;
}

/** One stored AST unfolding, content-addressed by {@link AstEntry.hash}. */
export interface AstEntry {
  /** the structural hash — sha256(canonicalJson(ast)); THE content address + the recurrence key */
  readonly hash: string;
  /** the parse tree (canonical-key-ordered) — invariant for a given hash; holds the sigils */
  readonly ast: unknown;
  /** recurrence tally — how many turns have unfolded to this exact structure (the frequency signal) */
  count: number;
  /** ISO timestamp of first sighting */
  readonly first_seen: string;
  /** ISO timestamp of most-recent sighting */
  last_seen: string;
  /** the verbatim turns this structure unfolded from (deduped, capped) — the bound-to-verbatim link */
  provenance: AstProvenance[];
}

export interface AstPalace {
  /**
   * Store an AST tree, keyed by its structural hash, bound to its verbatim. Idempotent on the
   * STRUCTURE: an identical tree collides to the same hash/drawer and bumps `count` (recurrence),
   * accreting distinct provenance. Returns the structural hash (the drawer keeps it as `lar_ast_hash`)
   * + the verbatim sha (the drawer keeps it as `lar_verbatim_sha`). THROWS if the store did not
   * persist, so the caller keeps the inline AST rather than stamping a dangling reference.
   */
  put(astTree: unknown, verbatim: { source_file: string; content: string }): Promise<{ hash: string; verbatimSha: string }>;
  /** Read an entry back by its structural hash, or null if absent. */
  get(hash: string): Promise<AstEntry | null>;
  /** The structural hash of a tree WITHOUT storing it (the content address) — pure-TS, no holder. */
  hashOf(astTree: unknown): Promise<string>;
  /** Release this reference to the shared holder; the process is killed when the last one closes. */
  close(): Promise<void>;
}

const HEX64 = /^[0-9a-f]{64}$/;

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
export type HolderSpawn = (canonicalDir: string) => HolderProc;

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
  /** Last ~4KB of the holder's stderr — a ChromaDB permission/disk-full error surfaces here, never swallowed. */
  private stderrTail = "";
  refs = 0;

  constructor(
    private readonly canonicalDir: string,
    private readonly spawnProc: HolderSpawn,
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
      // stderr carries library/banner noise on a healthy boot, but ALSO the real fault on a sick one
      // (ChromaDB permission denied, disk full, an import blow-up). BUFFER its tail and SURFACE it on
      // failure — never swallow it to a noop (the silent-error footgun). stdout stays the JSON-RPC channel.
      proc.stderr?.on?.("data", (chunk: string) => { this.stderrTail = (this.stderrTail + chunk).slice(-4096); });
      proc.on("exit", (code) => this.onDown(this.withStderr(new Error(`astpalace holder exited (code ${code ?? "null"})`))));
      proc.on("error", (err) => this.onDown(this.withStderr(err)));
      // Handshake: a ping confirms the chroma collection opened before any put/get rides.
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
      if (msg.ok === false) p.reject(new Error(msg.error ?? "astpalace error"));
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
    if (holders.get(this.canonicalDir) === this) holders.delete(this.canonicalDir);
  }

  private request(op: string, fields: Record<string, unknown>): Promise<unknown> {
    const id = this.nextId++;
    return new Promise<unknown>((res, rej) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        rej(new Error(`astpalace '${op}' timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);
      this.pending.set(id, { resolve: res, reject: rej, timer });
      try {
        if (!this.proc?.stdin) throw new Error("astpalace holder not started");
        this.proc.stdin.write(JSON.stringify({ id, op, ...fields }) + "\n");
      } catch (err) {
        this.pending.delete(id);
        clearTimeout(timer);
        rej(err as Error);
      }
    });
  }

  async put(hash: string, astJson: string, source_file: string, verbatim_sha: string): Promise<{ hash: string; count: number }> {
    await this.ensure();
    return (await this.request("put", { hash, ast: astJson, source_file, verbatim_sha })) as { hash: string; count: number };
  }

  async get(hash: string): Promise<AstEntry | null> {
    await this.ensure();
    return (await this.request("get", { hash })) as AstEntry | null;
  }

  shutdown(): void {
    this.onDown(new Error("astpalace holder closed"));
    try {
      this.proc?.stdin?.end?.();
    } catch { /* ignore */ }
    this.proc?.kill?.();
  }
}

/** ONE holder per canonical palace dir — the singleton that makes "one holder, never a pile" true. */
const holders = new Map<string, Holder>();

/** Canonicalize a palace dir the way the python side will (realpath when it exists, else resolve). */
function canonicalDirOf(dir: string): string {
  try {
    return realpathSync(dir);
  } catch {
    return resolve(dir);
  }
}

/** Default holder spawn: the venv-aware python running `astpalace_io.py serve --palace <dir>`. */
function defaultHolderSpawn(canonicalDir: string): HolderProc {
  const { python, script, submoduleRoot, scriptPresent } = resolveAstPalaceSpawn();
  if (!python) throw new Error("no python holds mempalace — create ~/.venv and install the sidecar (`lares wake --install`)");
  if (!scriptPresent) throw new Error(`astpalace_io.py missing at ${script}`);
  // PYTHONPATH=submoduleRoot makes `import mempalace` resolve (it is not pip-installed); the venv
  // python supplies chromadb. `python script.py` sets sys.path[0] to the SCRIPT dir, so PYTHONPATH
  // is the seam that reaches the submodule package.
  const env = { ...process.env, PYTHONPATH: submoduleRoot + (process.env["PYTHONPATH"] ? `:${process.env["PYTHONPATH"]}` : "") };
  return spawn(python, [script, "serve", "--palace", canonicalDir], {
    cwd: submoduleRoot,
    env,
    stdio: ["pipe", "pipe", "pipe"],
  }) as unknown as HolderProc;
}

export interface AstPalaceOptions {
  /** per-call RPC timeout (ms); default 30s (covers the one-time chroma open on first call). */
  readonly timeoutMs?: number;
  /** test seam: override how the holder process is produced (defaults to the python helper). */
  readonly spawn?: HolderSpawn;
}

/**
 * Open the `.astpalace` content-addressed AST store rooted at `dir` — a mempalace instance.
 * Reuses the ONE holder process per canonical dir (singleton); `close()` releases this
 * reference and kills the process when the last reference closes.
 */
export function makeAstPalace(dir: string, opts: AstPalaceOptions = {}): AstPalace {
  const canonicalDir = canonicalDirOf(dir);
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const spawnProc = opts.spawn ?? defaultHolderSpawn;

  let holder = holders.get(canonicalDir);
  if (!holder) {
    holder = new Holder(canonicalDir, spawnProc, timeoutMs);
    holders.set(canonicalDir, holder);
  }
  holder.refs += 1;
  const myHolder = holder;
  let closed = false;

  const hashOf = (astTree: unknown): Promise<string> =>
    sha256Hex(canonicalJsonBytes(astTree), defaultCryptoProvider);

  return {
    hashOf,

    async put(astTree, verbatim): Promise<{ hash: string; verbatimSha: string }> {
      // Join keys computed HERE (pure-TS) — identical to the prior store, so the drawer-stamp is
      // unchanged and independent of the python store. The store persists the AST under that hash.
      const hash = await hashOf(astTree);
      const verbatimSha = await sha256Hex(utf8Bytes(verbatim.content), defaultCryptoProvider);
      const astJson = canonicalJson(astTree); // canonical-key-ordered — invariant for this hash
      await myHolder.put(hash, astJson, verbatim.source_file, verbatimSha);
      return { hash, verbatimSha };
    },

    async get(hash: string): Promise<AstEntry | null> {
      if (!HEX64.test(hash)) return null;
      return myHolder.get(hash);
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
export function _liveHolderCount(): number {
  return holders.size;
}
