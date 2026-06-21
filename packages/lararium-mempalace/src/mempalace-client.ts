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
  [key: string]: unknown;
}

export interface ListDrawersArgs {
  wing?: string;
  room?: string;
  limit?: number;
  offset?: number;
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
    const proc = spawn(command, args, {
      cwd: this.submoduleRoot,
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.proc = proc;
    proc.stdout?.setEncoding("utf8");
    proc.stdout?.on("data", (chunk: string) => this.onStdout(chunk));
    proc.stderr?.setEncoding("utf8");
    proc.stderr?.on("data", (chunk: string) => {
      if (this.onLog) this.onLog(chunk.replace(/\n+$/, ""));
    });
    proc.on("exit", (code) => this.rejectAll(new Error(`mempalace sidecar exited (code ${code ?? "null"})`)));
    proc.on("error", (err: Error) => this.rejectAll(err));

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

  private request(method: string, params: unknown): Promise<unknown> {
    const id = this.nextId++;
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`mempalace call '${method}' timed out after ${this.timeoutMs}ms`));
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
