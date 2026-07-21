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
 * and NOTHING else — no `--source lares` (the adapter that declares the twenty `lar_*` fields), no
 * @daemon capture verb, no worldline observer, no telemetry writeback.
 *
 * A THIN coordinator: the discovery, staging, and vanilla mine all live in PYTHON
 * (`packages/lararium-sensorium/scripts/guest_harvest.py`, discovery via the shared
 * `session_discovery.discover_all`). The guest-palace-literal (`~/.mempalace/palace`, never an env
 * override) and the ZERO-`lar_*` wall live THERE, at the boundary that actually writes. This leg only
 * resolves the interpreter + stage root and shells the lane, then renders its report — the SAME
 * python-owned discovery the sovereign `lares sense sweep` reads, no second TypeScript discovery.
 */

import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { larHarvestStageDir } from "@lararium/node";
import { resolvePython } from "../integration-check.js";
import { larRoot } from "../env.js";
import { emit } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

/** The guest Mempalace lane beneath the one canonical stage root — threaded to python for LAR_ROOT
 *  isolation parity (python's own default computes the same path). */
function mempalaceStageRoot(): string {
  return join(larHarvestStageDir(), "mempalace");
}

/** The python guest lane. */
function guestHarvestScript(): string {
  return join(larRoot(), "packages", "lararium-sensorium", "scripts", "guest_harvest.py");
}

interface GuestReport {
  readonly palace: string;
  readonly dry_run: boolean;
  readonly wings: number;
  readonly staged: number;
  readonly dropped: number;
  readonly filed: number;
  readonly ok: boolean;
  readonly results: ReadonlyArray<{
    readonly wing: string;
    readonly staged: number;
    readonly dropped: ReadonlyArray<{ pointer: string; why: string }>;
    readonly filed: number | string;
  }>;
}

/**
 * `lares mempalace harvest` — shell the python guest lane. `--dry-run` enumerates without staging or
 * mining; `--wing <w>` scopes to one wing; `--project <p>` narrows claude discovery.
 */
export async function cmdMempalaceHarvest(args: ParsedArgs): Promise<number> {
  const py = resolvePython() ?? "python3";
  const dryRun = args.flags["dry-run"] === true;
  const wing = typeof args.options["wing"] === "string" ? args.options["wing"] : undefined;
  const project = typeof args.options["project"] === "string" ? args.options["project"] : undefined;

  const argv = [guestHarvestScript(), "--stage-root", mempalaceStageRoot()];
  if (dryRun) argv.push("--dry-run");
  if (wing) argv.push("--wing", wing);
  if (project) argv.push("--project", project);

  const res = spawnSync(py, argv, { maxBuffer: 1 << 30, encoding: "utf8" });
  if (res.error || res.stdout === undefined || res.stdout === null) {
    const message = `guest harvest lane failed to run: ${res.error ? res.error.message : "no output"}`;
    emit(args, {
      ok: false,
      error: { code: "error", message, hint: "check the python interpreter (~/.venv) and guest_harvest.py" },
      human: () => console.error(`lares mempalace harvest: ${message}${res.stderr ? `\n${res.stderr}` : ""}`),
    });
    return 1;
  }

  let report: GuestReport | null = null;
  try {
    report = JSON.parse(res.stdout.trim()) as GuestReport;
  } catch {
    const message = "guest harvest lane returned no parseable report";
    emit(args, {
      ok: false,
      error: { code: "error", message },
      human: () => console.error(`lares mempalace harvest: ${message}\n${res.stdout}${res.stderr ? `\n${res.stderr}` : ""}`),
    });
    return 1;
  }

  emit(args, {
    ok: report.ok,
    data: { ...report },
    human: () => {
      console.log(`lares mempalace harvest → ${report.palace}${report.dry_run ? "  (dry run)" : ""}`);
      console.log("  vanilla mine — no lar_* metadata, no sensorium planes. A clean comparator.\n");
      for (const r of report.results) {
        const drop = r.dropped.length ? `  ✗ ${r.dropped.length} dropped` : "";
        console.log(`  ${r.wing.padEnd(38)} ${String(r.staged).padStart(4)} staged → ${String(r.filed).padStart(5)} filed${drop}`);
      }
      if (report.dropped > 0) {
        console.log(`\n  ${report.dropped} transcript(s) did NOT stage — they are ABSENT from this comparator:`);
        for (const r of report.results) {
          for (const d of r.dropped.slice(0, 3)) console.log(`    ✗ ${d.pointer}\n        ${d.why}`);
        }
      }
      console.log(`\n  ${report.staged} staged · ${report.filed} filed · ${report.dropped} dropped`);
    },
  });
  return report.ok ? 0 : 1;
}
