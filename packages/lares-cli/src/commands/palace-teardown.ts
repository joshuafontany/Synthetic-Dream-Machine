/**
 * `lares palace-teardown` — completely tear down the local mempalace store and
 * the harvest idempotency state, so a re-pave starts from true zero.
 *
 * This has bitten us: a partial / interrupted re-pave leaves a half-mined chroma
 * store, a stale `lar_hv` watermark that makes the next `harvest` SKIP turns it
 * thinks it already saw, and MCP servers holding the old store open. Hand-`rm`-ing
 * the paths invites the confused-deputy trap (wipe an ambient default, miss the
 * watermark). This verb resolves every target explicitly, previews by default,
 * and removes only on `--confirm`.
 *
 * Targets (resolved, never ambient):
 *   - the palace store      MEMPALACE_PALACE_PATH ?? ~/.mempalace   (chroma + config + entities + locks)
 *   - the astpalace store   larDataDir/astpalace                    (the memory-ast-unfolding bridge — local AST store)
 *   - the harvest watermark ~/.lares/harvest                        (lar_hv idempotency state.json)
 *   - the harvest stage     ~/.lares/harvest-stage                  (normalized transcript copies)
 *
 * Safety: if live mempalace processes (MCP servers / a running mine) hold the
 * store open, the verb REFUSES (exit conflict) unless `--force` is also given —
 * stop them first, or override. Re-pave after with `lares harvest --all`.
 *
 * Usage:  lares palace-teardown                    # preview what would be removed
 *         lares palace-teardown --confirm          # remove it
 *         lares palace-teardown --confirm --force  # remove even under live MCP
 */

import { existsSync, rmSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import { larHarvestDir, larHarvestStageDir, larDataDir } from "../env.js";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

interface Target {
  readonly label: string;
  readonly path:  string;
}

/** Resolve the teardown targets from env + the fixed lares/mempalace homes — never an ambient default. */
function resolveTargets(): Target[] {
  const palace = process.env["MEMPALACE_PALACE_PATH"]?.trim() || join(homedir(), ".mempalace");
  return [
    { label: "palace store (chroma + config + entities + locks)", path: palace },
    { label: "astpalace (memory-ast-unfolding bridge — local AST store)", path: join(larDataDir(), "astpalace") },
    { label: "harvest watermark (lar_hv idempotency)",            path: larHarvestDir() },
    { label: "harvest stage (normalized transcript copies)",      path: larHarvestStageDir() },
  ];
}

/** Best-effort recursive byte size; 0 when absent or unreadable. */
function dirSize(p: string): number {
  let total = 0;
  const walk = (cur: string): void => {
    let st;
    try { st = statSync(cur); } catch { return; }
    if (st.isDirectory()) {
      let ents: string[];
      try { ents = readdirSync(cur); } catch { return; }
      for (const e of ents) walk(join(cur, e));
    } else {
      total += st.size;
    }
  };
  walk(p);
  return total;
}

function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(1)} ${units[i] ?? "TB"}`;
}

/**
 * Live mempalace processes (MCP servers / a running mine / chroma) that hold the
 * store open. Best-effort + advisory: a detection failure returns [] and never
 * blocks on its own account — the refusal only fires on a POSITIVE find.
 */
function liveMempalaceProcs(): Array<{ pid: number; cmd: string }> {
  const out: Array<{ pid: number; cmd: string }> = [];
  try {
    const isWin = process.platform === "win32";
    const raw = isWin
      ? execFileSync("tasklist", ["/fo", "csv", "/nh"], { encoding: "utf8", maxBuffer: 1 << 24 })
      : execFileSync("ps", ["-eo", "pid=,args="], { encoding: "utf8", maxBuffer: 1 << 24 });
    const re = /mempalace[-.]mcp|mempalace\.mcp_server|mempalace\s+mine|chromadb|chroma\.cli/i;
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || !re.test(trimmed)) continue;
      const m = trimmed.match(/^"?(\d+)"?[,\s]+(.*)$/);
      if (!m || !m[1] || m[2] === undefined) continue;
      out.push({ pid: Number(m[1]), cmd: m[2].replace(/^"|"$/g, "").slice(0, 140) });
    }
  } catch {
    /* detection unreliable on this host — advisory only */
  }
  return out;
}

export async function cmdPalaceTeardown(args: ParsedArgs): Promise<number> {
  const targets = resolveTargets().map((t) => {
    const exists = existsSync(t.path);
    return { ...t, exists, bytes: exists ? dirSize(t.path) : 0 };
  });
  const present    = targets.filter((t) => t.exists);
  const totalBytes = present.reduce((s, t) => s + t.bytes, 0);
  const confirm    = args.flags["confirm"] === true;
  const force      = args.flags["force"]   === true;
  const procs      = liveMempalaceProcs();

  // PREVIEW (default) — name every target, touch no disk.
  if (!confirm) {
    emit(args, {
      ok: true,
      data: {
        mode: "preview",
        targets: targets.map((t) => ({ label: t.label, path: t.path, exists: t.exists, bytes: t.bytes })),
        totalBytes,
        liveProcesses: procs,
        hint: "re-run with --confirm to remove",
      },
      human: () => {
        console.log("lares palace-teardown — PREVIEW (nothing removed)\n");
        for (const t of targets) {
          const mark = t.exists ? "✗" : "·";
          const size = t.exists ? `  (${humanBytes(t.bytes)})` : "  (absent)";
          console.log(`  ${mark} ${t.path}\n      ${t.label}${size}`);
        }
        console.log(`\n  total to free: ${humanBytes(totalBytes)}`);
        if (procs.length) {
          console.log(`\n  ⚠ ${procs.length} live mempalace process(es) hold the store:`);
          for (const p of procs) console.log(`      pid ${p.pid}  ${p.cmd}`);
          console.log("      stop them first, or pass --force alongside --confirm.");
        }
        console.log("\n  → re-run with --confirm to remove.");
      },
    });
    return 0;
  }

  // Live-process safety: a positive find REFUSES unless --force overrides.
  if (procs.length && !force) {
    emit(args, {
      ok: false,
      error: {
        code: "conflict",
        message: `${procs.length} live mempalace process(es) hold the store open`,
        hint: "stop the MCP servers / mine first, or re-run with --confirm --force",
      },
      data: { liveProcesses: procs },
      human: () => {
        console.error("lares palace-teardown: REFUSED — live mempalace processes hold the store:");
        for (const p of procs) console.error(`  pid ${p.pid}  ${p.cmd}`);
        console.error("\nStop them (end the MCP clients / `kill <pid>`), or re-run with --confirm --force.");
      },
    });
    return exitFor("conflict");
  }

  // EXECUTE.
  const removed: Array<{ path: string; bytes: number }> = [];
  const failed:  Array<{ path: string; error: string }> = [];
  for (const t of present) {
    try {
      rmSync(t.path, { recursive: true, force: true });
      removed.push({ path: t.path, bytes: t.bytes });
    } catch (e) {
      failed.push({ path: t.path, error: e instanceof Error ? e.message : String(e) });
    }
  }
  const freed = removed.reduce((s, r) => s + r.bytes, 0);
  const ok    = failed.length === 0;

  emit(args, {
    ok,
    data: { mode: "teardown", removed, failed, freedBytes: freed, forcedUnderLiveProcs: procs.length > 0 },
    ...(ok ? {} : { error: { code: "error", message: `${failed.length} target(s) failed to remove` } }),
    human: () => {
      console.log("lares palace-teardown — TORN DOWN\n");
      if (!present.length) console.log("  (nothing to remove — already clean)");
      for (const r of removed) console.log(`  ✓ removed  ${r.path}  (${humanBytes(r.bytes)})`);
      for (const f of failed)  console.log(`  ✗ FAILED   ${f.path}  — ${f.error}`);
      console.log(`\n  freed: ${humanBytes(freed)}`);
      console.log("  re-pave with:  lares harvest --all");
    },
  });
  return ok ? 0 : 1;
}
