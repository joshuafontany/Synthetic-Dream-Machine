/**
 * mempalace-client — the READ LEG. A node-only, read-only MCP client that
 * speaks JSON-RPC over stdio (NDJSON, one object per line) to the pinned
 * mempalace Python sidecar. It calls only read tools (list_drawers / get_drawer)
 * — never a write — honoring the read-only sidecar contract.
 *
 * Crosses the causal-island boundary once: a separate process, a separate log.
 * The client only ever knows "as of my last sync."
 */

import { spawn, type ChildProcess } from "node:child_process";
import { resolveSidecarCapEnv } from "./sidecar-cap.js";

export interface MempalaceClientOptions {
  /** <repo>/mempalace — the spawn cwd so `python -m mempalace.mcp_server` resolves the package. */
  submoduleRoot: string;
  /** Optional --palace path; defaults to the sidecar's own config. */
  palacePath?: string;
  /** Python interpreter; default "python3". */
  python?: string;
  /** Override the spawn command (testing — e.g. "node"). */
  command?: string;
  /** Override the spawn args (testing — e.g. a fake-sidecar script). */
  args?: string[];
  /** Per-call timeout; default 15000ms. */
  timeoutMs?: number;
  /** stderr drain (redacted human logs); never carries JSON-RPC. */
  onLog?: (line: string) => void;
}

export interface DrawerSummary {
  drawer_id: string;
  [key: string]: unknown;
}

export interface ListDrawersResult {
  drawers: DrawerSummary[];
  total: number;
  count: number;
  offset: number;
  limit: number;
}

export interface DrawerContent {
  drawer_id: string;
  content: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ListDrawersArgs {
  wing?: string;
  room?: string;
  limit?: number;
  offset?: number;
}

export interface SearchArgs {
  /** Keywords or a question ONLY — max 250 chars (the sidecar embeds this verbatim). */
  query: string;
  wing?: string;
  room?: string;
  /** Max results (default 5, max 100). */
  limit?: number;
  /** Cosine-distance ceiling; hits beyond are dropped (default 1.5; 0 disables). */
  maxDistance?: number;
}

export interface SearchHit {
  /** Verbatim drawer text — the PLACE memory. */
  text: string;
  wing?: string;
  room?: string;
  source_file?: string;
  source_path?: string;
  created_at?: string;
  similarity?: number;
  distance?: number;
  [key: string]: unknown;
}

export interface SearchResult {
  query: string;
  total_before_filter?: number;
  results: SearchHit[];
  [key: string]: unknown;
}

/** A content drawer's worldline-relevant facets — the trajectory-stub source. Read off the
 *  drawer's flat metadata: the EXACT capture `lar_verbatim_sha` (the full-fidelity content↔form join
 *  key, not a transcript-text re-hash) plus the ordering keys. `ffz` (lar_ffz) is the intended
 *  production order address but stays documented-but-unstamped today, so the ordering falls back to
 *  `filedAt` (cross-flush) → `chunkIndex` (within-flush) → drawer id (orderHandleTurnsToStubs). */
export interface HandleTurn {
  readonly drawerId: string;
  readonly verbatimSha: string;
  /** the lar_ffz rhythmic address — the primary order key WHEN stamped (unstamped today, flagged). */
  readonly ffz?: string;
  /** per-source ingest ordinal (ndjson adapter) — the within-flush secondary order key. */
  readonly chunkIndex?: number;
  /** ingest timestamp (per flush batch) — the cross-flush primary order key when ffz absent. */
  readonly filedAt?: string;
  readonly sourceFile?: string;
}

/** A worldline trajectory stub — the worker's wire shape ({@link WorldlineStubWire}), minus the
 *  host-joined form vector: the content↔form join key + the within-handle happened-before tick. */
export interface TrajectoryStubLite {
  readonly verbatimSha: string;
  readonly tickCounter: number;
}

/** Compare two {@link HandleTurn}s by the best available order key, most-significant first:
 *  lar_ffz address → filed_at → chunk_index → drawer id (the stable last resort). Absent keys sort
 *  as empty/0, so within ONE handle (where the present keys are consistent) the order is total. */
function compareHandleTurns(a: HandleTurn, b: HandleTurn): number {
  // Absent ffz sorts LAST (sentinel) so a stamped row leads an unstamped one; within a handle the
  // stamping is uniform, so all-absent rows tie here and fall through to filed_at.
  const af = a.ffz || "￿", bf = b.ffz || "￿";
  if (af !== bf) return af < bf ? -1 : 1;
  const at = a.filedAt ?? "", bt = b.filedAt ?? "";
  if (at !== bt) return at < bt ? -1 : 1;
  const ac = a.chunkIndex ?? 0, bc = b.chunkIndex ?? 0;
  if (ac !== bc) return ac - bc;
  return a.drawerId < b.drawerId ? -1 : a.drawerId > b.drawerId ? 1 : 0;
}

/**
 * Order a handle's content-graph turns into worldline trajectory stubs (PURE) — sort by
 * {@link compareHandleTurns}, then assign a 0-based monotonic `tickCounter` as the within-handle
 * happened-before. The worker's `orderTrajectory` re-sorts by `tickCounter` (then verbatimSha), so
 * this assignment IS the path the flow-lens reads. Turns with no verbatim sha are dropped (no join
 * key → nothing the form graph can fuse on).
 */
export function orderHandleTurnsToStubs(turns: readonly HandleTurn[]): TrajectoryStubLite[] {
  return [...turns]
    .filter((t) => t.verbatimSha)
    .sort(compareHandleTurns)
    .map((t, i) => ({ verbatimSha: t.verbatimSha, tickCounter: i }));
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class MempalaceClient {
  private proc: ChildProcess | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private stdoutBuf = "";
  /** Last ~4KB of stderr — a ChromaDB permission/disk-full/import fault surfaces here, never swallowed
   *  to a bare timeout. Folded into faults (and timeouts) by {@link withStderr}. */
  private stderrTail = "";

  private readonly submoduleRoot: string;
  private readonly palacePath: string | undefined;
  private readonly python: string;
  private readonly commandOverride: string | undefined;
  private readonly argsOverride: string[] | undefined;
  private readonly timeoutMs: number;
  private readonly onLog: ((line: string) => void) | undefined;

  constructor(options: MempalaceClientOptions) {
    this.submoduleRoot = options.submoduleRoot;
    this.palacePath = options.palacePath;
    this.python = options.python ?? "python3";
    this.commandOverride = options.command;
    this.argsOverride = options.args;
    this.timeoutMs = options.timeoutMs ?? 15000;
    this.onLog = options.onLog;
  }

  /** Spawn the sidecar and complete the MCP handshake. Throws if initialize fails/times out. */
  async start(): Promise<void> {
    const command = this.commandOverride ?? this.python;
    const args = this.argsOverride ?? this.defaultArgs();
    // + the GPU compute cap on the DURABLE recall read path: the sidecar opens its chroma collection
    // (default onnxruntime embedder) on boot, which HARD-fails to import onnxruntime-gpu without the
    // CUDA runtime libs on LD_LIBRARY_PATH. resolveComputeCapEnv threads them (torch's bundled nvidia
    // wheels) + the device hint; absent (the QA box) the embedder degrades to CPU on its own. When the
    // spawn is overridden for tests, the cap probes the override command harmlessly (bad path ⇒ []).
    const proc = spawn(command, args, {
      cwd: this.submoduleRoot,
      env: { ...process.env, ...resolveSidecarCapEnv(command) },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.proc = proc;
    proc.stdout?.setEncoding("utf8");
    proc.stdout?.on("data", (chunk: string) => this.onStdout(chunk));
    proc.stderr?.setEncoding("utf8");
    proc.stderr?.on("data", (chunk: string) => {
      // stderr carries redacted human logs on a healthy boot, but ALSO the real fault on a sick one
      // (ChromaDB permission denied, disk full, an import blow-up). BUFFER its tail and SURFACE it on
      // failure — never let it degrade to a bare timeout. stdout stays the JSON-RPC channel.
      this.stderrTail = (this.stderrTail + chunk).slice(-4096);
      if (this.onLog) this.onLog(chunk.replace(/\n+$/, ""));
    });
    proc.on("exit", (code) => this.rejectAll(this.withStderr(new Error(`mempalace sidecar exited (code ${code ?? "null"})`))));
    proc.on("error", (err: Error) => this.rejectAll(this.withStderr(err)));

    await this.request("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "lararium-mempalace", version: "0.1.0" },
    });
    // Fire-and-forget; the server returns no response and awaiting would deadlock.
    this.notify("notifications/initialized", {});
  }

  private defaultArgs(): string[] {
    const args = ["-m", "mempalace.mcp_server"];
    if (this.palacePath) args.push("--palace", this.palacePath);
    return args;
  }

  private onStdout(chunk: string): void {
    this.stdoutBuf += chunk;
    let idx: number;
    while ((idx = this.stdoutBuf.indexOf("\n")) !== -1) {
      const line = this.stdoutBuf.slice(0, idx).trim();
      this.stdoutBuf = this.stdoutBuf.slice(idx + 1);
      if (!line) continue;
      let msg: { id?: unknown; result?: unknown; error?: { code?: number; message?: string } };
      try {
        msg = JSON.parse(line);
      } catch {
        continue; // non-JSON line on stdout — ignore (banners go to stderr)
      }
      if (typeof msg.id !== "number") continue;
      const p = this.pending.get(msg.id);
      if (!p) continue;
      this.pending.delete(msg.id);
      clearTimeout(p.timer);
      if (msg.error) {
        p.reject(new Error(`JSON-RPC ${msg.error.code ?? "?"}: ${msg.error.message ?? "error"}`));
      } else {
        p.resolve(msg.result);
      }
    }
  }

  private send(obj: unknown): void {
    if (!this.proc?.stdin) throw new Error("mempalace sidecar not started");
    this.proc.stdin.write(JSON.stringify(obj) + "\n");
  }

  private notify(method: string, params: unknown): void {
    this.send({ jsonrpc: "2.0", method, params });
  }

  /** Fold the buffered stderr tail into an error so a python-side fault reaches the caller (the recall
   *  path surfaces the REAL ChromaDB error, never a bare timeout/exit). No tail → the error unchanged. */
  private withStderr(err: Error): Error {
    const tail = this.stderrTail.trim();
    if (tail) err.message = `${err.message}\n  sidecar stderr: ${tail}`;
    return err;
  }

  private request(method: string, params: unknown): Promise<unknown> {
    const id = this.nextId++;
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(this.withStderr(new Error(`mempalace call '${method}' timed out after ${this.timeoutMs}ms`)));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.send({ jsonrpc: "2.0", id, method, params });
      } catch (err) {
        this.pending.delete(id);
        clearTimeout(timer);
        reject(err as Error);
      }
    });
  }

  /** tools/call with the double-parse (envelope -> content[0].text) + tool-level error check. */
  private async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const result = (await this.request("tools/call", { name, arguments: args })) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = result?.content?.[0]?.text;
    if (typeof text !== "string") {
      throw new Error(`mempalace tool '${name}' returned no text payload`);
    }
    const payload = JSON.parse(text) as unknown;
    if (payload && typeof payload === "object" && "error" in payload && (payload as { error: unknown }).error) {
      throw new Error(`mempalace tool '${name}': ${String((payload as { error: unknown }).error)}`);
    }
    return payload;
  }

  listDrawers(args: ListDrawersArgs = {}): Promise<ListDrawersResult> {
    return this.callTool("mempalace_list_drawers", { ...args }) as Promise<ListDrawersResult>;
  }

  getDrawer(drawerId: string): Promise<DrawerContent> {
    return this.callTool("mempalace_get_drawer", { drawer_id: drawerId }) as Promise<DrawerContent>;
  }

  /**
   * The thinnest metadata WHERE-filter the read-only sidecar contract permits. The submodule's
   * `mempalace_list_drawers` exposes only wing/room filters, so an arbitrary flat-scalar metadata
   * equality filter stays APP-LAYER: page `list_drawers` (optionally wing/room-scoped to narrow the
   * scan) and keep the drawers whose `metadata[k]` equals every clause. Read-only — never a write.
   *
   * NOTE (scope flag): with no wing scope this pages the WHOLE palace, so a hot path SHOULD pass the
   * narrowest `wing` it knows (a spirit handle lives in `<wing>__spirits`, a main handle in its wing).
   */
  async drawersWhere(
    where: Readonly<Record<string, string | number | boolean>>,
    opts: { wing?: string; room?: string; pageSize?: number } = {},
  ): Promise<DrawerSummary[]> {
    const pageSize = opts.pageSize ?? 200;
    const clauses = Object.entries(where);
    const out: DrawerSummary[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const page = await this.listDrawers({
        ...(opts.wing !== undefined ? { wing: opts.wing } : {}),
        ...(opts.room !== undefined ? { room: opts.room } : {}),
        limit: pageSize,
        offset,
      });
      for (const d of page.drawers) {
        const meta = (d["metadata"] as Record<string, unknown> | undefined) ?? {};
        if (clauses.every(([k, v]) => meta[k] === v)) out.push(d);
      }
      if (page.count < pageSize || offset + page.count >= page.total) break;
    }
    return out;
  }

  /**
   * Fetch a worldline handle's content-graph turns — the drawers WHERE `lar_agent_handle =
   * handle`, each carrying its EXACT capture `lar_verbatim_sha` (the full-fidelity stub source the
   * worker trajectory rides, vs a transcript-text re-hash) plus the order keys. Pass the handle's
   * `wing` to narrow the scan. Returns the raw {@link HandleTurn}s; {@link orderHandleTurnsToStubs}
   * orders them into the worker's stubs. Empty when the handle has no drawers (graceful).
   */
  async turnsForHandle(handle: string, opts: { wing?: string; pageSize?: number } = {}): Promise<HandleTurn[]> {
    const drawers = await this.drawersWhere({ lar_agent_handle: handle }, opts);
    const turns: HandleTurn[] = [];
    for (const d of drawers) {
      const meta = (d["metadata"] as Record<string, unknown> | undefined) ?? {};
      const verbatimSha = typeof meta["lar_verbatim_sha"] === "string" ? (meta["lar_verbatim_sha"] as string) : "";
      if (!verbatimSha) continue; // no join key → nothing the form graph fuses on
      turns.push({
        drawerId: d.drawer_id,
        verbatimSha,
        ...(typeof meta["lar_ffz"] === "string" ? { ffz: meta["lar_ffz"] as string } : {}),
        ...(typeof meta["chunk_index"] === "number" ? { chunkIndex: meta["chunk_index"] as number } : {}),
        ...(typeof meta["filed_at"] === "string" ? { filedAt: meta["filed_at"] as string } : {}),
        ...(typeof meta["source_file"] === "string" ? { sourceFile: meta["source_file"] as string } : {}),
      });
    }
    return turns;
  }

  /** Semantic recall — read-only `mempalace_search`. Returns verbatim hits with
   *  similarity/distance. The query carries ONLY keywords (the sidecar embeds it). */
  search(args: SearchArgs): Promise<SearchResult> {
    const payload: Record<string, unknown> = { query: args.query };
    if (args.wing !== undefined) payload["wing"] = args.wing;
    if (args.room !== undefined) payload["room"] = args.room;
    if (args.limit !== undefined) payload["limit"] = args.limit;
    if (args.maxDistance !== undefined) payload["max_distance"] = args.maxDistance;
    return this.callTool("mempalace_search", payload) as Promise<SearchResult>;
  }

  /** True while the sidecar process is spawned and has not exited — for pooling. */
  isAlive(): boolean {
    return this.proc !== null && this.proc.exitCode === null && this.proc.signalCode === null && !this.proc.killed;
  }

  private rejectAll(err: Error): void {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(err);
    }
    this.pending.clear();
  }

  async stop(): Promise<void> {
    this.rejectAll(new Error("mempalace client stopped"));
    this.proc?.stdin?.end();
    this.proc?.kill();
    this.proc = null;
  }
}
