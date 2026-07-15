/**
 * `lares mempalace harvest` — build the GUEST comparator from every harness transcript, through the
 * vendored miner's OWN vanilla path.
 *
 * The comparator holds the clean baseline the memory sensorium measures itself against. Its whole value
 * rests on carrying no Lares vocabulary: a store stamped with our own `lar_*` gradient stops measuring
 * and starts mirroring. So this mines with the plain
 *
 *     mempalace --palace <guest> mine <stage>/<wing> --mode convos --wing <wing>
 *
 * and NOTHING else. No `--source lares` (the RFC-002 adapter that declares the twenty `lar_*` fields
 * is gated behind that flag, so omitting it cannot reach it). No @daemon capture verb, no
 * caller-vector flush, no AST or form split, no worldline observer, no telemetry writeback, no spirit
 * sweep. The drawer carries only mempalace's native metadata: source_file, wing, room, agent,
 * chunk_index, source_mtime, extract_mode.
 *
 * The guest lane, raised by hand. `lares harvest --all` carries the RUN and feeds the sovereign
 * sensorium; the RUN never writes the comparator. This runs as an operator ACT, and the two lanes
 * share no path.
 *
 * Idempotent with no state of our own: the vendored `mine_convos` dedups on (source_file, mtime,
 * NORMALIZE_VERSION), so a re-run over an unchanged transcript is a no-op it reports itself.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, linkSync, copyFileSync, realpathSync, statSync, utimesSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { withMineLane, mineWithServo } from "@lararium/mempalace";
import { resolveMempalaceExe, larHarvestStageDir } from "@lararium/node";
import { resolvePython } from "../integration-check.js";
import { larRoot } from "../env.js";
import { emit } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";
import {
  discoverClaude, discoverCodex, discoverCopilotVscode, discoverCopilotCli,
  type HarvestEntry,
} from "./harvest.js";

/**
 * The guest palace, spelled LITERALLY.
 *
 * Not `resolvePalacePath()`: that honors `MEMPALACE_PALACE_PATH`, and an env var that can redirect
 * the comparator can redirect it onto the sensorium. This command may write exactly the one store the
 * RUN may not.
 */
function guestPalace(): string {
  return join(homedir(), ".mempalace", "palace");
}

/** The guest Mempalace lane beneath the one canonical stage root. */
function mempalaceStage(): string {
  return join(larHarvestStageDir(), "mempalace");
}

/**
 * Which sources carry a native-format reader, keyed by `HarvestEntry.source` → script name.
 *
 * A source listed here is adapted only for the guest comparator. A missing adapter
 * is a named staging failure, never an opaque spawn error.
 *
 * `copilot-cli` names the comparator-only SQLite→JSONL adapter. The sovereign sensorium reads
 * the database natively and never reaches this adapter.
 */
const NORMALIZER_SCRIPTS: Readonly<Record<string, string>> = {
  "copilot-vscode": "copilot_vscode_normalize.py",
  // Comparator-only adapter: the vanilla miner consumes JSONL, not Copilot's SQLite schema.
  "copilot-cli": "copilot_sqlite_normalize.py",
};

/**
 * Resolve a source's normalizer, or `null` when none exists.
 *
 * Off `larRoot()`, never `process.cwd()`: a cwd-relative script path binds the harvest to whichever
 * directory the caller happened to stand in, and `lares` runs from anywhere.
 */
function normalizerFor(source: string): string | null {
  const script = NORMALIZER_SCRIPTS[source];
  return script ? join(larRoot(), "packages", "lararium-mempalace", "scripts", script) : null;
}

/**
 * Stable, collision-resistant relative path inside the Mempalace stage.
 *
 * The old `<surface>__<basename>` key silently conflated different transcript
 * roots that happened to share a filename (notably VS Code workspaces).  The
 * canonical source path supplies a durable disambiguator while the readable
 * suffix keeps a staged tree inspectable.  This stays comparator-local: no
 * `lar_*` metadata crosses the boundary.
 */
export function mempalaceStageName(entry: Pick<HarvestEntry, "file" | "source" | "stageName" | "sessionId">): string {
  let sourcePath = entry.file;
  try { sourcePath = realpathSync(entry.file); } catch { /* missing source reports during staging */ }
  const key = createHash("sha256").update(sourcePath).digest("hex").slice(0, 16);
  const name = entry.source === "copilot-cli" && entry.sessionId
    ? `${entry.sessionId}.jsonl`
    : basename(entry.file);
  return join(entry.source, key, name);
}

interface WingMine {
  readonly wing: string;
  readonly staged: number;
  readonly dropped: ReadonlyArray<{ file: string; why: string }>;
  readonly filed: number | string;
}

/**
 * `lares mempalace harvest` — mine every transcript surface into the guest, vanilla.
 * `--dry-run` enumerates without staging or mining. `--wing <w>` scopes to one wing.
 */
export async function cmdMempalaceHarvest(args: ParsedArgs): Promise<number> {
  const MP = resolveMempalaceExe();
  const PY = resolvePython() ?? "python3";
  const palace = guestPalace();
  const dryRun = args.flags["dry-run"] === true;
  const only = typeof args.options["wing"] === "string" ? args.options["wing"] : undefined;

  const entries = [
    ...discoverClaude(), ...discoverCodex(), ...discoverCopilotVscode(), ...discoverCopilotCli(),
  ].filter((e) => only === undefined || e.wing === only);

  const byWing = new Map<string, HarvestEntry[]>();
  for (const e of entries) {
    const list = byWing.get(e.wing) ?? [];
    list.push(e);
    byWing.set(e.wing, list);
  }

  const results: WingMine[] = [];
  const stageRoot = mempalaceStage();

  for (const [wing, es] of [...byWing.entries()].sort()) {
    if (dryRun) {
      // A dry-run can predict a missing comparator adapter without staging anything.
      const willDrop = es
        .filter((e) => (e.source === "copilot-vscode" || e.source === "copilot-cli") && !normalizerFor(e.source))
        .map((e) => ({ file: e.file, why: `no normalizer for source '${e.source}' — its native format has no reader yet` }));
      results.push({ wing, staged: es.length - willDrop.length, dropped: willDrop, filed: "dry-run" });
      continue;
    }
    const stage = join(stageRoot, wing);
    // This comparator pass owns a complete snapshot of its wing. Rebuild its staging tree before
    // copying, so vanished sources cannot remain as stale mine inputs. The relative source-hash path
    // stays stable across runs, preserving vanilla miner idempotency without renaming a transcript.
    rmSync(stage, { recursive: true, force: true });
    mkdirSync(stage, { recursive: true });

    // Stage each transcript. A file that fails to stage is NAMED — a staging error leaves no trace on
    // the next pass (the file simply is not there), so a silent skip mines an empty stage and calls it
    // a success.
    const dropped: Array<{ file: string; why: string }> = [];
    let staged = 0;
    for (const e of es) {
      const dst = join(stage, mempalaceStageName(e));
      try {
        // Re-stage every pass so the comparator observes the producer's current bytes and mtime.
        mkdirSync(dirname(dst), { recursive: true });
        if (e.source === "copilot-vscode" || e.source === "copilot-cli") {
          // Vanilla Mempalace reads JSONL, so comparator-only adapters translate
          // the two Copilot formats at this boundary.
          const norm = normalizerFor(e.source);
          if (!norm || !existsSync(norm)) {
            throw new Error(`no normalizer for source '${e.source}' — its native format has no reader yet`);
          }
          if (e.source === "copilot-cli") {
            if (!e.sessionId) throw new Error("Copilot SQLite comparator entry lacks sessionId");
            execFileSync(PY, [norm, "--session", e.sessionId, e.file, dirname(dst)], { maxBuffer: 1 << 30, encoding: "utf8" });
            if (!existsSync(dst)) throw new Error(`Copilot SQLite session ${e.sessionId} did not export`);
          } else {
            writeFileSync(dst, execFileSync(PY, [norm, e.file], { maxBuffer: 1 << 30, encoding: "utf8" }));
          }
        } else {
          try { linkSync(e.file, dst); } catch { copyFileSync(e.file, dst); }
        }
        const sourceStat = statSync(e.file);
        utimesSync(dst, sourceStat.atime, sourceStat.mtime);
        staged += 1;
      } catch (err) {
        dropped.push({ file: e.file, why: err instanceof Error ? err.message.slice(0, 140) : String(err) });
      }
    }

    // The VANILLA mine. One invocation per wing over the staged tree: `scan_convos` walks it
    // recursively, and its own (source_file, mtime) dedup carries idempotency.
    let filed: number | string;
    try {
      const out = await withMineLane(palace, async () =>
        mineWithServo("mempalace-comparator-mine", (timeoutMs) =>
          execFileSync(MP, ["--palace", palace, "mine", stage, "--mode", "convos", "--wing", wing], {
            maxBuffer: 1 << 30, encoding: "utf8", timeout: timeoutMs, killSignal: "SIGKILL",
          }),
          // The wing's transcript count IS the work. Hand it over, or the servo prices a 756-transcript
          // wing at the mean of every wing it has seen and kills it as a hang.
          { items: staged },
        ),
      );
      filed = Number(/Drawers filed:\s*(\d+)/.exec(out)?.[1] ?? 0);
    } catch (err) {
      filed = `mine-failed: ${err instanceof Error ? err.message.slice(0, 100) : String(err)}`;
    }
    results.push({ wing, staged, dropped, filed });
  }

  const totalStaged = results.reduce((n, r) => n + r.staged, 0);
  const totalDropped = results.reduce((n, r) => n + r.dropped.length, 0);
  const totalFiled = results.reduce((n, r) => n + (typeof r.filed === "number" ? r.filed : 0), 0);
  const ok = results.every((r) => typeof r.filed !== "string" || r.filed === "dry-run");

  emit(args, {
    ok,
    data: { palace, dryRun, wings: results.length, staged: totalStaged, dropped: totalDropped, filed: totalFiled, results },
    human: () => {
      console.log(`lares mempalace harvest → ${palace}${dryRun ? "  (dry run)" : ""}`);
      console.log("  vanilla mine — no lar_* metadata, no sensorium planes. A clean comparator.\n");
      for (const r of results) {
        const drop = r.dropped.length ? `  ✗ ${r.dropped.length} dropped` : "";
        console.log(`  ${r.wing.padEnd(38)} ${String(r.staged).padStart(4)} staged → ${String(r.filed).padStart(5)} filed${drop}`);
      }
      if (totalDropped > 0) {
        console.log(`\n  ${totalDropped} transcript(s) did NOT stage — they are ABSENT from this comparator:`);
        for (const r of results) {
          for (const d of r.dropped.slice(0, 3)) console.log(`    ✗ ${d.file}\n        ${d.why}`);
        }
      }
      console.log(`\n  ${totalStaged} staged · ${totalFiled} filed · ${totalDropped} dropped`);
    },
  });
  return ok ? 0 : 1;
}
