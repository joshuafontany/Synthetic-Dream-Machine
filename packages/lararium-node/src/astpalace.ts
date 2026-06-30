/**
 * astpalace — the memory-ast-unfolding: a LOCAL, content-addressed store for the per-turn
 * parse-tree AST, backed by a SECOND mempalace instance (the same ChromaDB engine, a
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
 * THE CAP-STACK (the palace-instance #has): astpalace = the SHARED palace transport
 * ({@link PalaceHolder} + {@link PalaceHolderRegistry}, palace-holder.ts) composed with its
 * OWN op-surface — `put`/`get` over the python `astpalace_io.py serve` holder, plus a
 * pure-TS `hashOf` (the content address, no holder). It owns NONE of the serve machinery;
 * that lives once in the transport cap. This is the distinguishing op-surface; the form
 * store #has a different one over the SAME transport (the sidecar 2-shapes lesson, carried up).
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/capture-annotation-model#isomorphic-telemetry-vm
 */

import { spawn } from "node:child_process";

import {
  canonicalJson,
  canonicalJsonBytes,
  defaultCryptoProvider,
  sha256Hex,
  utf8Bytes,
} from "@lararium/mesh";
import { resolveAstPalaceSpawn } from "@lararium/mempalace";

import {
  PalaceHolderRegistry,
  canonicalDirOf,
  type PalaceHolderProc,
  type PalaceHolderSpawn,
} from "./palace-holder.js";

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

/** The result of a kapae (rewind) — the tally set-aside + the drawers to down-weight. */
export interface AstKapaeResult {
  /** provenance lines closed (normally 1; 0 = idempotent no-op / unknown turn). */
  readonly closed: number;
  /** structural hashes tombstoned (count fell to ≤0) — set aside, the row kept. */
  readonly tombstoned: readonly string[];
  /** the verbatim shas the dropped provenance lines carried — the content drawers to down-weight. */
  readonly verbatim_shas: readonly string[];
  readonly turn_key: string;
}

export interface AstPalace {
  /**
   * Store an AST tree, keyed by its structural hash, bound to its verbatim. Idempotent on the
   * STRUCTURE: an identical tree collides to the same hash/drawer and bumps `count` (recurrence),
   * accreting distinct provenance. `turnKey` (optional) — the USER turn's uuid — rides into the
   * provenance line + the reverse-index, so a later {@link kapae} can set-aside this turn's tally.
   * Returns the structural hash (the drawer keeps it as `lar_ast_hash`) + the verbatim sha (the
   * drawer keeps it as `lar_verbatim_sha`). THROWS if the store did not persist, so the caller keeps
   * the inline AST rather than stamping a dangling reference.
   */
  put(astTree: unknown, verbatim: { source_file: string; content: string; turnKey?: string }): Promise<{ hash: string; verbatimSha: string }>;
  /** Read an entry back by its structural hash, or null if absent. */
  get(hash: string): Promise<AstEntry | null>;
  /**
   * REWIND (kapae = set-aside, never erase) one turn's recurrence tally, keyed by the USER turn's
   * uuid (mirrors the worldline KG kapae so ONE gone uuid closes both stores). Decrements the
   * structure's `count`; tombstones it (row kept, recall-excluded) when the count falls to ≤0;
   * idempotent. Returns the dropped verbatim shas (the content drawers the salience producer
   * down-weights). Best-effort at the caller — a holder fault never sinks the harvest.
   */
  kapae(turnKey: string, ended?: string): Promise<AstKapaeResult>;
  /** The structural hash of a tree WITHOUT storing it (the content address) — pure-TS, no holder. */
  hashOf(astTree: unknown): Promise<string>;
  /** Release this reference to the shared holder; the process is killed when the last one closes. */
  close(): Promise<void>;
}

const HEX64 = /^[0-9a-f]{64}$/;

/** Test seam alias: how the holder process is produced (defaults to the python helper). */
export type HolderSpawn = PalaceHolderSpawn;

/** ONE registry per palace TYPE — astpalace's holders stay separate from formpalace's. */
const registry = new PalaceHolderRegistry("astpalace");

/** Default holder spawn: the venv-aware python running `astpalace_io.py serve --palace <dir>`. */
function defaultHolderSpawn(canonicalDir: string): PalaceHolderProc {
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
  }) as unknown as PalaceHolderProc;
}

export interface AstPalaceOptions {
  /** per-call RPC timeout (ms); default 30s (covers the one-time chroma open on first call). */
  readonly timeoutMs?: number;
  /** test seam: override how the holder process is produced (defaults to the python helper). */
  readonly spawn?: HolderSpawn;
}

/**
 * Open the `.astpalace` content-addressed AST store rooted at `dir` — a mempalace instance.
 * Composes the shared transport cap (ref-counted ONE holder per canonical dir) with the
 * astpalace op-surface; `close()` releases this reference and kills the process when the last
 * reference closes.
 */
export function makeAstPalace(dir: string, opts: AstPalaceOptions = {}): AstPalace {
  const canonicalDir = canonicalDirOf(dir);
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const spawnProc = opts.spawn ?? defaultHolderSpawn;

  const holder = registry.acquire(canonicalDir, spawnProc, timeoutMs);
  let closed = false;

  const hashOf = (astTree: unknown): Promise<string> =>
    sha256Hex(canonicalJsonBytes(astTree), defaultCryptoProvider);

  return {
    hashOf,

    async put(astTree, verbatim): Promise<{ hash: string; verbatimSha: string }> {
      // Join keys computed HERE (pure-TS) — independent of the python store, so the drawer-stamp is
      // stable and neither store waits on the other's id. The store persists the AST under that hash.
      const hash = await hashOf(astTree);
      const verbatimSha = await sha256Hex(utf8Bytes(verbatim.content), defaultCryptoProvider);
      const astJson = canonicalJson(astTree); // canonical-key-ordered — invariant for this hash
      await holder.send("put", {
        hash, ast: astJson, source_file: verbatim.source_file, verbatim_sha: verbatimSha,
        ...(verbatim.turnKey ? { turn_key: verbatim.turnKey } : {}),
      });
      return { hash, verbatimSha };
    },

    async get(hash: string): Promise<AstEntry | null> {
      if (!HEX64.test(hash)) return null;
      return (await holder.send("get", { hash })) as AstEntry | null;
    },

    async kapae(turnKey: string, ended?: string): Promise<AstKapaeResult> {
      const res = (await holder.send("kapae", { turn_key: turnKey, ...(ended ? { ended } : {}) })) as
        | Partial<AstKapaeResult>
        | null;
      return {
        closed: res?.closed ?? 0,
        tombstoned: res?.tombstoned ?? [],
        verbatim_shas: res?.verbatim_shas ?? [],
        turn_key: res?.turn_key ?? turnKey,
      };
    },

    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      registry.release(holder);
    },
  };
}

/** Test-only: how many holder processes are live (proves "one holder per palace, never a pile"). */
export function _liveHolderCount(): number {
  return registry.size();
}
