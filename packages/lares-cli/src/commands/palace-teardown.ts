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
 *   - the palace store      MEMPALACE_PALACE_PATH ?? ~/.mempalace   (chroma + config + entities + locks + the worldline-KG knowledge_graph.sqlite3, which lives INSIDE the palace dir)
 *   - the astpalace store   larAstPalaceDir (~/.lares/.astpalace)    (the memory-ast-unfolding — a second mempalace instance)
 *   - the formpalace store  larFormPalaceDir (~/.lares/.formpalace)  (the living-grammar FORM-vector store — a third mempalace instance; nuke-or-the-re-pave half-paves stale form-vectors keyed by verbatim_sha)
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
import { larHarvestDir, larHarvestStageDir, larPort } from "../env.js";
import { palaceOrgans, corpusTeardownDirs } from "@lararium/node";
import { emit, exitFor } from "../render.js";
import { livePalaceProcs, type PalaceProc } from "../palace-procs.js";
import { portHolderPids } from "../port-control.js";
import { quiescePalace } from "./mempalace.js";
import type { ParsedArgs } from "../parse-args.js";

interface Target {
  readonly label: string;
  readonly path:  string;
}

const ORGAN_LABEL: Readonly<Record<string, string>> = {
  mempalace:  "palace store (chroma + config + entities + locks + worldline-KG sqlite)",
  astpalace:  "astpalace (memory-ast-unfolding — a second mempalace instance)",
  formpalace: "formpalace (living-grammar FORM-vector store — a third mempalace instance)",
  meshpalace: "mesh sensorium (the federation tree — #has who/authority/flow)",
  "mesh:who": "mesh/who sensorium (identity/presence)",
  "mesh:authority": "mesh/authority sensorium (caps/keyhive)",
  "mesh:flow": "mesh/flow sensorium (traffic/coupling — the coupling-lobe)",
};

/**
 * Resolve the teardown targets — never an ambient default. The PALACE organs come from the SHARED
 * @lararium/node registry (`palaceOrgans`), the SAME list `lares wake --init` stands up (one
 * enumerator, two consumers, can't drift). Teardown adds its own non-palace idempotency targets
 * (the harvest watermark + stage) AND every ephemeral `.corpus/*` scratch instance, so an
 * interrupted `corpus run` can never leak state past a re-pave.
 */
function resolveTargets(): Target[] {
  const organs = palaceOrgans().map((o) => ({ label: ORGAN_LABEL[o.name] ?? o.name, path: o.dir }));
  const corpus = corpusTeardownDirs().map((dir) => ({ label: `corpus scratch instance (${dir.split(/[/\\]/).pop()})`, path: dir }));
  return [
    ...organs,
    ...corpus,
    { label: "harvest watermark (lar_hv idempotency)",        path: larHarvestDir() },
    { label: "harvest stage (normalized transcript copies)",  path: larHarvestStageDir() },
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
 * Live palace processes that BLOCK a clean teardown — not just the store-HOLDERS
 * (write-daemon / recall MCP / one-shot mine / chroma) but the SPAWNERS too (the
 * ingest hook + its `lares capture/subagents/telemetry` legs): a live spawner
 * re-mints a warm daemon mid-tear and the removed dir refills → ENOTEMPTY. So the
 * refusal broadened from "holders only" to "holders OR spawners", each carrying its
 * OWN spawner so the message can teach kill-the-parent. Best-effort + advisory: a
 * detection failure returns [] and never blocks on its own account.
 */
function liveMempalaceProcs(): PalaceProc[] {
  try {
    let vesselPids: number[] = [];
    try { vesselPids = portHolderPids(larPort()); } catch { /* advisory */ }
    return livePalaceProcs({ vesselPids, vesselPort: larPort() })
      .filter((p) => p.holdsStore || p.mintsDaemons);
  } catch {
    return [];
  }
}

/** One-line description naming the holder's role + what it serves + its spawner (teaches kill-the-parent). */
function describeProc(p: PalaceProc): string {
  const role = p.holdsStore ? "holds the store" : "re-mints daemons";
  return `pid ${p.pid} (${role}: ${p.serves}) — spawned by pid ${p.ppid}: ${p.spawnerCmd}`;
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
  const drain      = args.flags["drain"]   === true;
  let procs        = liveMempalaceProcs();

  // PREVIEW (default) — name every target, touch no disk.
  if (!confirm) {
    emit(args, {
      ok: true,
      data: {
        mode: "preview",
        targets: targets.map((t) => ({ label: t.label, path: t.path, exists: t.exists, bytes: t.bytes })),
        totalBytes,
        liveProcesses: procs.map((p) => ({ pid: p.pid, kind: p.kind, serves: p.serves, spawner: p.spawnerCmd, holdsStore: p.holdsStore, mintsDaemons: p.mintsDaemons })),
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
          console.log(`\n  ⚠ ${procs.length} live palace process(es) block a clean tear:`);
          for (const p of procs) console.log(`      ${describeProc(p)}`);
          console.log("      → --drain gracefully quiesces them first, or --force overrides.");
        }
        console.log("\n  → re-run with --confirm to remove (add --drain to quiesce live daemons first).");
      },
    });
    return 0;
  }

  // --drain: gracefully quiesce (pause hooks → drain warm daemons → confirm zero)
  // BEFORE tearing, so no live daemon re-mints into the dir we are about to remove
  // (the ENOTEMPTY race). Holds the hooks paused through the tear (--hold).
  let drainedInfo: { drained: number[]; forced: number[]; quiet: boolean } | undefined;
  if (drain && procs.length) {
    const q = await quiescePalace({ hold: true });
    drainedInfo = { drained: q.drained, forced: q.forced, quiet: q.quiet };
    procs = liveMempalaceProcs(); // re-snapshot after the drain
  }

  // Live-process safety: a positive find REFUSES unless --force overrides. The
  // refusal NAMES each blocker + its spawner + the graceful cure (never "stop them").
  if (procs.length && !force) {
    emit(args, {
      ok: false,
      error: {
        code: "conflict",
        message: `${procs.length} live palace process(es) block a clean teardown`,
        hint: "run `lares mempalace quiesce` (or re-run with --drain), or re-run with --confirm --force",
      },
      data: { liveProcesses: procs.map((p) => ({ pid: p.pid, kind: p.kind, serves: p.serves, spawner: p.spawnerCmd })) },
      human: () => {
        console.error("lares palace-teardown: REFUSED — live palace processes block a clean tear:");
        for (const p of procs) console.error(`  ${describeProc(p)}`);
        console.error("\nGraceful cure: `lares mempalace quiesce` (pauses hooks + drains daemons), then re-run.");
        console.error("Or re-run with --drain (quiesce-then-tear), or --confirm --force to override.");
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

  // A removal that FAILED (classically ENOTEMPTY) usually means a live daemon
  // re-minted files into the dir mid-tear. Re-snapshot so we can NAME the culprit +
  // its spawner instead of surfacing a bare errno — the whack-a-mole made legible.
  const culprits = ok ? [] : liveMempalaceProcs();

  emit(args, {
    ok,
    data: {
      mode: "teardown", removed, failed, freedBytes: freed,
      forcedUnderLiveProcs: procs.length > 0,
      ...(drainedInfo ? { drained: drainedInfo } : {}),
      ...(culprits.length ? { culprits: culprits.map((p) => ({ pid: p.pid, kind: p.kind, serves: p.serves, spawner: p.spawnerCmd })) } : {}),
    },
    ...(ok ? {} : { error: { code: "error", message: `${failed.length} target(s) failed to remove`, ...(culprits.length ? { hint: "a live daemon refilled the dir — run `lares mempalace quiesce`, then re-tear" } : {}) } }),
    human: () => {
      console.log("lares palace-teardown — TORN DOWN\n");
      if (drainedInfo) console.log(`  drained: SIGTERM'd ${drainedInfo.drained.length}${drainedInfo.forced.length ? `, SIGKILL'd ${drainedInfo.forced.length}` : ""} holder(s) — ${drainedInfo.quiet ? "quiescent" : "some survived"}.\n`);
      if (!present.length) console.log("  (nothing to remove — already clean)");
      for (const r of removed) console.log(`  ✓ removed  ${r.path}  (${humanBytes(r.bytes)})`);
      for (const f of failed)  console.log(`  ✗ FAILED   ${f.path}  — ${f.error}`);
      if (culprits.length) {
        console.log(`\n  ⚠ a live daemon refilled the dir mid-tear — the ENOTEMPTY culprit:`);
        for (const p of culprits) console.log(`      ${describeProc(p)}`);
        console.log("      cure: `lares mempalace quiesce` (pauses hooks + drains), then re-run --confirm.");
      }
      console.log(`\n  freed: ${humanBytes(freed)}`);
      console.log("  re-pave with:  lares harvest --all");
    },
  });
  return ok ? 0 : 1;
}
