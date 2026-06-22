/**
 * found — the idempotent founding orchestration behind `lares wake --install`.
 *
 * Stands up the whole shebang from a (mostly) fresh pull — node build, mempalace
 * integration, social-plane init, genesis — by COMPOSING the existing commands,
 * each FOUND-IF-ABSENT and a NO-OP-IF-PRESENT. Running it twice is a pure no-op.
 *
 * Safety law (the keypair-wipe lesson generalized):
 *  - the plan is computed by file PRESENCE alone (read-only); only absent steps run;
 *  - the operator keypair is load-or-create — never wiped (operator-key.ts);
 *  - `lares init` self-guards on the bootstrap (skips the ceremony if present);
 *  - genesis is BUILD-IF-ABSENT ONLY — a rebuild can shift the CID and diverge a
 *    founded identity, so re-founding stays an explicit operator act (reset), never
 *    a wake. `--install` never passes `--force`.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "@lararium/mesh/node";
import { runCommand } from "./spawn.js";
import { cmdInit } from "./commands/init.js";
import { cmdBuildGenesis } from "./commands/scripted.js";
import { checkMempalaceIntegration, installMempalaceIntegration } from "./integration-check.js";
import type { ParsedArgs } from "./parse-args.js";

const NODE_DIST_MAIN = join(repoRoot, "packages", "lararium-node", "dist", "src", "main.js");

export type FoundAction = "skip" | "ran" | "failed";

export interface FoundStep {
  readonly step: string;
  readonly action: FoundAction;
  readonly detail: string;
}

export interface FoundContext {
  /** Instance root (LAR_ROOT). */
  readonly root: string;
  /** genesis/social-bootstrap.json path under the root. */
  readonly bootstrap: string;
}

/** One planned step: whether its artifact is already present, and what running it would do. */
export interface PlanStep {
  readonly step: string;
  readonly present: boolean;
  readonly wouldRun: string;
}

/**
 * PLAN (read-only, safe to witness anywhere): which founding steps are already
 * satisfied vs would run, by file presence alone. No side effects.
 */
export function planFounding(ctx: FoundContext): PlanStep[] {
  const islandBin = join(ctx.root, "genesis", "island.bin");
  return [
    { step: "build", present: existsSync(NODE_DIST_MAIN), wouldRun: "pnpm install && pnpm -r build" },
    { step: "mempalace", present: checkMempalaceIntegration().ok, wouldRun: "git submodule update --init + pip install -e ./mempalace" },
    { step: "init", present: existsSync(ctx.bootstrap), wouldRun: "lares init (keypair load-or-create; founding ceremony only if absent)" },
    { step: "genesis", present: existsSync(islandBin), wouldRun: "build-genesis (BUILD-IF-ABSENT; never rebuilds a founded shrine)" },
  ];
}

/**
 * EXECUTE the founding: run only the absent steps, in dependency order, each a
 * no-op when already present. Thin glue over already-witnessed commands; the
 * safety (which steps run) lives in {@link planFounding}, which this honors.
 */
export async function foundIfAbsent(args: ParsedArgs, ctx: FoundContext): Promise<FoundStep[]> {
  const plan = planFounding(ctx);
  const present = (step: string): boolean => plan.find((p) => p.step === step)?.present ?? false;
  const steps: FoundStep[] = [];

  // 1. Build — the node dist must exist for serve. (The CLI itself is already built;
  //    it had to be, to run this. A truly cold pull bootstraps the CLI with one
  //    manual `pnpm install && pnpm -r build` first.)
  if (present("build")) {
    steps.push({ step: "build", action: "skip", detail: "node dist present" });
  } else {
    const inst = await runCommand("pnpm", ["install"], repoRoot);
    const built = inst === 0 ? await runCommand("pnpm", ["-r", "build"], repoRoot) : inst;
    steps.push({
      step: "build",
      action: built === 0 ? "ran" : "failed",
      detail: built === 0 ? "pnpm install && pnpm -r build" : `build exited ${built}`,
    });
    if (built !== 0) return steps; // nothing downstream can serve without dist
  }

  // 2. Mempalace integration (idempotent internally).
  if (present("mempalace")) {
    steps.push({ step: "mempalace", action: "skip", detail: "integration present" });
  } else {
    const r = installMempalaceIntegration();
    const ok = r.every((s) => s.ok);
    steps.push({ step: "mempalace", action: ok ? "ran" : "failed", detail: r.map((s) => `${s.step}:${s.ok ? "ok" : "fail"}`).join(" ") });
  }

  // 3. Init — keypair + bootstrap + ceremony. Self-guards on bootstrap; keypair never wiped.
  if (present("init")) {
    steps.push({ step: "init", action: "skip", detail: "bootstrap present — keypair + ceremony intact" });
  } else {
    const code = await cmdInit(args);
    steps.push({ step: "init", action: code === 0 ? "ran" : "failed", detail: code === 0 ? "lares init (founded)" : `init exited ${code}` });
    if (code !== 0) return steps;
  }

  // 4. Genesis — BUILD-IF-ABSENT ONLY. The identity-safety line: never rebuild.
  if (present("genesis")) {
    steps.push({ step: "genesis", action: "skip", detail: "genesis present — NOT rebuilt (CID/identity preserved)" });
  } else {
    const code = await cmdBuildGenesis(args);
    steps.push({ step: "genesis", action: code === 0 ? "ran" : "failed", detail: code === 0 ? "build-genesis (founded)" : `build-genesis exited ${code}` });
  }

  return steps;
}
