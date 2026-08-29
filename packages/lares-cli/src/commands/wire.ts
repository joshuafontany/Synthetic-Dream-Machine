/**
 * `lares vessel wire` — point every AI surface on this machine at this vessel.
 *
 * ── WHY ITS OWN VERB ────────────────────────────────────────────────────────────────────────────
 * Standing a vessel never leaves `LAR_ROOT`. Wiring always reaches the operator's home — `~/.claude`,
 * `~/.codex`, `~/.copilot`, every VS Code config root. Two acts, two radii, and while the second rode
 * a flag SUFFIX on the first (`--init` wired, `--install` did not) the difference that mattered most
 * escaped a reader entirely. The radius now names itself: the verb you type states the reach it takes.
 *
 * ── IDEMPOTENT TO INTENT, NEVER TO PRESENCE ─────────────────────────────────────────────────────
 * A wire that only created what was missing left a drifted seat aimed at a moved holder script —
 * shut, and reporting success. So each surface converges on the RESOLVED spawn: aligned passes
 * untouched, drifted RE-AIMS, absent gets written. Running it a second time heals a stale seat, which
 * makes repetition the point rather than a waste.
 *
 * Every surface stays graceful where its tool is not installed: a missing home is nothing to wire,
 * never a failure.
 *
 * Meme: lar:///ha.ka.ba/lares/cli/vessel-door
 */

import { repoRoot } from "@lararium/mesh/node";
import { wireClaudeHome, type ClaudeWireResult } from "../claude-wire.js";
import { wireCodexHome, type CodexWireResult } from "../codex-wire.js";
import { wireCopilotHome, type CopilotWireResult } from "../copilot-wire.js";
import { wireVscode, type VscodeWireResult } from "../vscode-wire.js";
import { tendRepoAdapters, type BootPointerStep } from "../boot-pointer.js";
import { emit } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

/** The surfaces this door tends. A flag names one; no flag names them all. */
export const SURFACES = ["claude", "codex", "copilot", "vscode"] as const;
export type Surface = (typeof SURFACES)[number];

export interface WireReport {
  claude?:   ClaudeWireResult;
  codex?:    CodexWireResult;
  copilot?:  CopilotWireResult;
  vscode?:   VscodeWireResult;
  adapters?: BootPointerStep[];
}

function usage(): number {
  console.error("usage: lares vessel wire [--claude] [--codex] [--copilot] [--vscode] [--observe]");
  console.error("");
  console.error("  Point every AI surface on this machine at this vessel. Idempotent: an aligned wire");
  console.error("  passes untouched, a DRIFTED one re-aims, an absent one gets written.");
  console.error("");
  console.error("  no flag        tend every surface, plus this repo's own adapters");
  console.error("  --claude       ~/.claude — mempalace MCP + the wake/ingest hooks");
  console.error("  --codex        ~/.codex");
  console.error("  --copilot      ~/.copilot");
  console.error("  --vscode       every VS Code root present (stable + Insiders, remote + local)");
  console.error("  --observe      REPORT what a wiring would do; touch nothing");
  console.error("");
  console.error("  This is the one vessel verb that reaches OUTSIDE the vessel root. `stand` never does.");
  return 2;
}

/** A wire that throws still reports — a missing tool names itself rather than ending the run. */
async function attempt<T>(run: () => T | Promise<T>, onFail: (detail: string) => T): Promise<T> {
  try { return await run(); }
  catch (e) { return onFail(e instanceof Error ? e.message : String(e)); }
}

/**
 * Tend the named surfaces, and report what each one did.
 *
 * THE ONE IMPLEMENTATION. `stand --init` wires as part of a founding and this door wires alone; two
 * copies of the same eight calls would drift the moment one grew a surface the other did not.
 */
export async function tendSurfaces(
  wanted: readonly Surface[], tendAdapters: boolean,
): Promise<WireReport> {
  const r: WireReport = {};
  if (wanted.includes("claude")) {
    r.claude = await attempt(() => wireClaudeHome(),
      (detail) => ({ settingsPath: "", backedUp: false, changed: false, steps: [{ item: "claude", action: "missing-script", detail }] }));
  }
  if (wanted.includes("codex")) {
    r.codex = await attempt(() => wireCodexHome(),
      (detail) => ({ configPath: "", changed: false, steps: [{ item: "codex", action: "missing-script", detail }] }));
  }
  if (wanted.includes("copilot")) {
    r.copilot = await attempt(() => wireCopilotHome(),
      (detail) => ({ home: "", changed: false, steps: [{ item: "copilot", action: "missing-script", detail }] }));
  }
  if (wanted.includes("vscode")) {
    r.vscode = await attempt(() => wireVscode(),
      (detail) => ({ changed: false, steps: [{ item: "vscode", action: "missing-script", detail }] }));
  }
  if (tendAdapters) r.adapters = tendRepoAdapters(repoRoot);
  return r;
}

/** Whether a report names anything this pass actually moved. */
export const wireChanged = (r: WireReport): boolean =>
  [r.claude, r.codex, r.copilot, r.vscode].some((x) => x?.changed === true)
  || (r.adapters ?? []).some((a) => a.action !== "present");

export async function cmdWire(args: ParsedArgs): Promise<number> {
  if (args.flags["help"] === true) return usage();

  const named = SURFACES.filter((s) => args.flags[s] === true);
  const wanted: readonly Surface[] = named.length > 0 ? named : SURFACES;
  // The repo's own adapters ride the whole-house pass alone: naming one harness says nothing about
  // where this checkout's own files point.
  const tendAdapters = named.length === 0;

  // OBSERVING NEVER WIRES. The reading and the act stay apart here for the same reason `stand` keeps
  // them apart: a caller asking what a wiring would do must not perform one by asking.
  if (args.flags["observe"] === true) {
    emit(args, {
      ok: true,
      data: { wouldTend: wanted, adapters: tendAdapters, repoRoot },
      human: () => {
        console.log("lares vessel wire --observe — nothing written");
        console.log(`  would tend:  ${wanted.join(" · ")}${tendAdapters ? " · repo adapters" : ""}`);
        console.log(`  repo:        ${repoRoot}`);
      },
    });
    return 0;
  }

  const r = await tendSurfaces(wanted, tendAdapters);
  const changed = wireChanged(r);

  emit(args, {
    ok: true,
    data: { ...r, changed },
    human: () => {
      console.log(changed ? "WIRED" : "already aimed here — nothing to change");
      const line = (name: string, res: { changed: boolean; steps: readonly { action: string; item: string; detail: string }[] } | undefined): void => {
        if (!res) return;
        console.log(`  ${name.padEnd(9)} ${res.changed ? "wired" : "already wired"}`);
        for (const s of res.steps) console.log(`    ${s.action.padEnd(9)} ${s.item}: ${s.detail}`);
      };
      line("claude",  r.claude);
      line("codex",   r.codex);
      line("copilot", r.copilot);
      line("vscode",  r.vscode);
      if (r.adapters) {
        console.log("  adapters  (this repo)");
        for (const a of r.adapters) console.log(`    ${a.action.padEnd(9)} ${a.item}: ${a.detail}`);
      }
    },
  });
  return 0;
}
