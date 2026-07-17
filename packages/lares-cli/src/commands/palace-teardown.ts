/**
 * `lares sense teardown` — completely tear down the local mempalace store and
 * the harvest idempotency state, so a re-pave starts from true zero.
 *
 * This has bitten us: a partial / interrupted re-pave leaves a half-mined chroma
 * store, a stale `lar_hv` watermark that makes the next `harvest` SKIP turns it
 * thinks it already saw, and MCP servers holding the old store open. Hand-`rm`-ing
 * the paths invites the confused-deputy trap (wipe an ambient default, miss the
 * watermark). This verb resolves every target explicitly, previews by default,
 * and removes only on `--confirm`.
 *
 * Targets (resolved, never ambient) — the SOVEREIGN sensoriums only; the external guest
 * ~/.mempalace (a separate causal island) stands untouched. The targets SEPARATE by sensorium GROUP,
 * so the operator tears one sensorium and leaves the rest standing:
 *   - memory            <memory>/{content,structure,form,persistence,mempalace} + the harvest watermark/stage
 *   - mesh              <mesh>/{who,authority,flow} (the federation tree)
 *   - memetic-wikitext  <memetic-wikitext>/{formal,informal} (the co-located peers)
 *   - corpus            every ephemeral .corpus/* scratch instance
 * The in-tree `<memory>/mempalace` (the paved recall projection) tears WITH `memory`; the guest
 * `~/.mempalace` rides its own lane (guestMempalaceOrgan) and is never in this list.
 *
 * Safety: if live mempalace processes (MCP servers / a running mine) hold a SELECTED store open, the
 * verb REFUSES (exit conflict) unless `--force` is also given — a holder of an UN-selected sensorium
 * never blocks. Re-pave after with the full ceremony:
 * `lares wake --init` → `lares sense pour --all` → `lares mempalace resume`.
 *
 * Usage:  lares sense teardown                    # preview EVERY group
 *         lares sense teardown memory             # preview ONE sensorium
 *         lares sense teardown memory --confirm   # tear one, leave the rest standing
 *         lares sense teardown --confirm          # remove every group
 *         lares sense teardown --confirm --force  # remove even under live holders
 *   groups: memory · mesh · memetic-wikitext · corpus   (no group = all)
 */

import { existsSync, rmSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { larHarvestDir, larHarvestStageDir, larPort } from "../env.js";
import { palaceOrgans, corpusTeardownDirs, memorySensoriumDir } from "@lararium/node";
import { emit, exitFor } from "../render.js";
import { livePalaceProcs, type PalaceProc } from "../palace-procs.js";
import { portHolderPids } from "../port-control.js";
import { quiescePalace } from "./mempalace.js";
import type { ParsedArgs } from "../parse-args.js";

interface Target {
  readonly label: string;
  readonly path:  string;
  /** The teardown SELECTION unit — a sensorium name (`memory` · `mesh` · `memetic-wikitext`) or `corpus`. */
  readonly group: string;
}

/**
 * The group a target rides under — the sensorium segment beneath `sensoriums/` (`memory` · `mesh` ·
 * `memetic-wikitext`); the AI-sessions pour idempotency (`harvest*`) rides with `memory`, so a memory
 * re-pave clears the watermark that would otherwise SKIP re-poured turns; everything else falls to the
 * `corpus` scratch bucket. Naming a group tears ONLY that group; naming none tears every group.
 */
function targetGroup(path: string): string {
  const m = /[/\\]sensoriums[/\\]([^/\\]+)/.exec(path);
  if (m && m[1]) return m[1];
  if (/[/\\]harvest(-stage)?$/.test(path)) return "memory";
  return "corpus";
}

/**
 * Does a live holder BLOCK this selection? A spawner (mints daemons) re-mints the memory-content
 * capture, so it blocks only a `memory` tear; a store-holder blocks only when it serves a path under
 * one of the selected targets (a mesh-only tear is never blocked by a memory holder). A non-path serve
 * (a bare "sessions" mine that could feed memory content) blocks a `memory` tear, errs toward refusal.
 */
function procBlocks(p: PalaceProc, selectedDirs: string[], memorySelected: boolean): boolean {
  if (p.mintsDaemons) return memorySelected;
  const s = p.serves;
  if (!s || !s.startsWith("/")) return memorySelected;
  return selectedDirs.some((dir) => s === dir || s.startsWith(dir.endsWith("/") ? dir : dir + "/"));
}

const ORGAN_LABEL: Readonly<Record<string, string>> = {
  mempalace:  "in-tree mempalace cap (the curated-memory recall projection — lexical + entity surfaces)",
  structurepalace:  "structure plane (unfolds each turn's AST under the sensorium root)",
  formpalace: "form plane (holds the living-grammar move-vectors under the sensorium root)",
  meshpalace: "mesh sensorium (the federation tree — #has who/authority/flow)",
  "mesh:who": "mesh/who sensorium (identity/presence)",
  "mesh:authority": "mesh/authority sensorium (caps/keyhive)",
  "mesh:flow": "mesh/flow sensorium (traffic/coupling — the coupling-lobe)",
  "memetic-wikitext": "memetic-wikitext sensorium (the formal ⋈ informal co-located-peers tree)",
  "memetic-wikitext:formal": "memetic-wikitext/formal sensorium (memes-on-disk — grammar/liturgy)",
  "memetic-wikitext:informal": "memetic-wikitext/informal sensorium (chat-sessions — pidgin)",
};

/**
 * Resolve the teardown targets — never an ambient default. The PALACE organs come from the SHARED
 * @lararium/node registry (`palaceOrgans`), the SAME list `lares wake --init` stands up (one
 * enumerator, two consumers, can't drift). Teardown adds its own non-palace idempotency targets
 * (the harvest watermark + stage) AND every ephemeral `.corpus/*` scratch instance, so an
 * interrupted `corpus run` can never leak state past a re-pave.
 */
/** Is `dir` at or beneath `root`? — path-segment safe, never a bare string-prefix match. */
function isUnder(dir: string, root: string): boolean {
  return dir === root || dir.startsWith(root.endsWith("/") ? root : root + "/");
}

function resolveTargets(): Target[] {
  // The `mempalace` organ now resolves to the IN-TREE `<memory>/mempalace` curated projection (the
  // sovereign paved recall surface) — NOT the guest. The external `~/.mempalace` rides
  // guestMempalaceOrgan, enumerated SEPARATELY and NEVER present in palaceOrgans(), so every organ here
  // tears with its sensorium and the guest comparator stays untouched by construction.
  //
  // TRUE-ZERO for memory (idempotent teardown): its planes are SUBDIRS of the sensorium root, and the
  // root ALSO holds the worldline KG (knowledge_graph.sqlite3), the .worldline log, and the manifest —
  // none of them organ dirs. A subdir-only tear left those strays behind, so a re-pave appended onto a
  // stale KG. Tearing the ROOT reaps every plane AND every root stray in one cut (a NEW root artifact
  // is caught with no code change). Other sensoriums' organ dirs ARE their own roots, so they already
  // tear complete; fold only memory's sub-plane organs into the single root target (no path overlap, so
  // totalBytes never double-counts).
  const memRoot = memorySensoriumDir();
  const organs = palaceOrgans()
    .filter((o) => !isUnder(o.dir, memRoot))
    .map((o) => ({ label: ORGAN_LABEL[o.name] ?? o.name, path: o.dir }));
  const corpus = corpusTeardownDirs().map((dir) => ({ label: `corpus scratch instance (${dir.split(/[/\\]/).pop()})`, path: dir }));
  const raw = [
    { label: "memory sensorium (all planes + worldline KG + .worldline + manifest)", path: memRoot },
    ...organs,
    ...corpus,
    { label: "harvest watermark (lar_hv idempotency)",        path: larHarvestDir() },
    { label: "harvest stage (normalized transcript copies)",  path: larHarvestStageDir() },
  ];
  return raw.map((t) => ({ ...t, group: targetGroup(t.path) }));
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
 * ingest hook + its `lares sense capture/subagents/telemetry` legs): a live spawner
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
  const all       = resolveTargets();
  const allGroups = [...new Set(all.map((t) => t.group))].sort();
  // Group SELECTION — positional names tear ONLY those sensoriums; no name tears every group. An
  // unknown group refuses loud (the confused-deputy cure: name the target, never a silent wildcard).
  const requested = args.positional.map((s) => String(s).toLowerCase());
  const unknown   = requested.filter((g) => !allGroups.includes(g));
  if (unknown.length) {
    emit(args, {
      ok: false,
      error: { code: "usage", message: `unknown sensorium group(s): ${unknown.join(", ")}`, hint: `groups: ${allGroups.join(" · ")} (no group = all)` },
      human: () => {
        console.error(`lares sense teardown: unknown group(s): ${unknown.join(", ")}`);
        console.error(`  groups: ${allGroups.join(" · ")}   (name none to tear every group)`);
      },
    });
    return exitFor("usage");
  }
  const selected = requested.length ? new Set(requested) : new Set(allGroups);
  const targets  = all
    .filter((t) => selected.has(t.group))
    .map((t) => {
      const exists = existsSync(t.path);
      return { ...t, exists, bytes: exists ? dirSize(t.path) : 0 };
    });
  const present    = targets.filter((t) => t.exists);
  const totalBytes = present.reduce((s, t) => s + t.bytes, 0);
  const confirm    = args.flags["confirm"] === true;
  const force      = args.flags["force"]   === true;
  const drain      = args.flags["drain"]   === true;
  // Blocking is SCOPED to the selection: a holder of an un-selected sensorium never blocks this tear.
  const selectedDirs   = targets.map((t) => t.path);
  const memorySelected = selected.has("memory");
  let procs        = liveMempalaceProcs().filter((p) => procBlocks(p, selectedDirs, memorySelected));

  // PREVIEW (default) — name every target, touch no disk.
  if (!confirm) {
    emit(args, {
      ok: true,
      data: {
        mode: "preview",
        groups: allGroups,
        selected: [...selected],
        targets: targets.map((t) => ({ group: t.group, label: t.label, path: t.path, exists: t.exists, bytes: t.bytes })),
        totalBytes,
        liveProcesses: procs.map((p) => ({ pid: p.pid, kind: p.kind, serves: p.serves, spawner: p.spawnerCmd, holdsStore: p.holdsStore, mintsDaemons: p.mintsDaemons })),
        hint: "re-run with --confirm to remove",
      },
      human: () => {
        console.log("lares sense teardown — PREVIEW (nothing removed)\n");
        console.log(`  groups available: ${allGroups.join(" · ")}   (name none to tear all)`);
        console.log(`  scope this run:   ${[...selected].join(" · ")}   — the external guest ~/.mempalace is never touched\n`);
        // Group the listing by sensorium so the selection unit is legible at a glance.
        for (const g of allGroups) {
          if (!selected.has(g)) continue;
          console.log(`  [${g}]`);
          for (const t of targets.filter((x) => x.group === g)) {
            const mark = t.exists ? "✗" : "·";
            const size = t.exists ? `  (${humanBytes(t.bytes)})` : "  (absent)";
            console.log(`    ${mark} ${t.path}\n        ${t.label}${size}`);
          }
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
  // ALWAYS runs on --drain — never gated on a momentarily-quiet process table: a
  // Stop-hook can fire MID-tear and re-mint a poisoned half-palace (witnessed:
  // ~/.mempalace re-created config-less). quiescePalace stays idempotent; on a
  // quiet table it pauses the hooks and no-ops the drain.
  let drainedInfo: { drained: number[]; forced: number[]; quiet: boolean } | undefined;
  if (drain) {
    const q = await quiescePalace({ hold: true });
    drainedInfo = { drained: q.drained, forced: q.forced, quiet: q.quiet };
    procs = liveMempalaceProcs().filter((p) => procBlocks(p, selectedDirs, memorySelected)); // re-snapshot, still scoped
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
        console.error("lares sense teardown: REFUSED — live palace processes block a clean tear:");
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
      console.log("lares sense teardown — TORN DOWN\n");
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
      // The FULL ceremony tail — a bare `harvest --all` hint left followers with a
      // config-less palace and hooks paused forever (--drain holds them paused).
      console.log("  re-pave ceremony:");
      console.log("    1. lares wake --init        (stand the organs: config.json + hooks.auto_save=false pin)");
      console.log("    2. lares sense pour --all      (the re-pave)");
      console.log("    3. lares mempalace resume   (un-pause the hooks)");
    },
  });
  return ok ? 0 : 1;
}
