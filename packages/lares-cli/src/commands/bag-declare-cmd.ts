/**
 * `lares bag {list | show | declare | home | repo}` — the bag LIFECYCLE surface.
 *
 * WHAT THE SURVEY FOUND, and why these exist. `lares bag` carried five verbs and every one of them answered a
 * RUNTIME question — pin, unpin, stats, register-cold, epoch — all of the shape //is this doc in RAM//.
 * Nothing answered what a bag IS, who may read it, where it belongs, or how to move it. Meanwhile three
 * self-describing axes stood defined and unspoken: `CapTier` shipped a reader interface only tests ever
 * implemented, `BagHome` had no way for a bag to name its own, and residency lived purely at runtime. A bag
 * knew nothing about itself, so every answer came from whichever call site asked — which is exactly how a
 * Nexus seal came to rest inside a repository nobody chose.
 *
 *   list                          every bag, its declared tier + home, and whether it sits where it says
 *   show <bag>                    one bag's declaration and where it resolves ON THIS VESSEL
 *   declare <bag> --tier <t>      write (or amend) a bag's own declaration
 *   home <bag> --to <home> [--repo <id>] --approve
 *                                 MOVE the bytes and re-anchor the declaration, together
 *   repo <list|add|drop>          the operator's repo registry — IDs, never paths
 *
 * ── NO MAGIC STRINGS ─────────────────────────────────────────────────────────────────────────────
 * A bag naming a `repository` home names a REGISTERED ID. The operator maps ids to roots once, on their own
 * vessel; the bag carries the id and never a directory, so a declaration stays portable and the path stays
 * local. An unregistered id REFUSES rather than resolving somewhere convenient.
 *
 * ── THE MOVE IS HITL, AND EARNS IT ───────────────────────────────────────────────────────────────
 * `home` relocates an operator's bytes across a boundary that matters — into a tracked history, or out of
 * one. It plans before it touches anything, refuses an occupied destination rather than merging, and never
 * runs a source-control verb: writing into a working tree is this command's business, deciding what enters a
 * history belongs to the hand that answers for it.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/cap-tier
 */

import {
  bagHomeRoots, surveyBags, readBagManifest, writeBagManifest, moveBagHome,
  readRepoRegistry, registerRepo, unregisterRepo, repoRegistryPath,
} from "@lararium/node";
import {
  parseCapTier, isBagHome, placeBag, BAG_HOMES, bagHomeTravelsWithAClone,
  type BagHome, type BagManifest,
} from "@lararium/mesh";
import { larBagsDir } from "../env.js";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

class BagUsageError extends Error {}

/** Where a bag's bytes are LOOKED FOR. A survey reads what stands; the declaration says where it belongs. */
function surveyDir(args: ParsedArgs): string {
  return args.options["dir"] ?? larBagsDir();
}

function bagArg(args: ParsedArgs, verb: string): string {
  const raw = (args.positional[1] ?? "").trim();
  if (!raw) throw new BagUsageError(`\`bag ${verb}\` wants a bag name (e.g. @lares)`);
  return raw.startsWith("@") ? raw : `@${raw}`;
}

/** One line per bag: what it declares, and whether its bytes sit where the declaration points. */
export async function cmdBagList(args: ParsedArgs): Promise<number> {
  const roots = bagHomeRoots();
  const rows  = surveyBags(surveyDir(args), roots).map((s) => ({
    bag: s.bag, tier: s.manifest.tier, home: s.manifest.home,
    repository: s.manifest.repository ?? null,
    declares: existsDeclaration(s.dir, s.bag),
    adrift: s.adrift, dir: s.dir,
  }));
  emit(args, {
    ok: true,
    data: { dir: surveyDir(args), bags: rows },
    human: () => {
      if (rows.length === 0) { console.log(`no bags under ${surveyDir(args)}`); return; }
      console.log(`bags under ${surveyDir(args)}:`);
      for (const r of rows) {
        const home = r.repository ? `${r.home}:${r.repository}` : r.home;
        const marks = [r.declares ? "" : "undeclared", r.adrift ? "ADRIFT" : ""].filter(Boolean).join(" ");
        console.log(`  ${r.bag.padEnd(18)} ${r.tier.padEnd(13)} ${home.padEnd(22)} ${marks}`);
      }
      console.log("");
      console.log("  undeclared = carries no iam.mem; it reads at the fail-closed default (veil / hearth).");
      console.log("  ADRIFT     = its bytes sit somewhere its own declaration does not point at.");
    },
  });
  return 0;
}

function existsDeclaration(dir: string, bag: string): boolean {
  // A bag whose read-back manifest carries a role or a non-default pair almost certainly declared; the
  // honest check reads whether the file itself stands, which readBagManifest hides. Re-read shallowly.
  const m = readBagManifest(dir, bag);
  return m.tier !== "veil" || m.home !== "hearth" || m.role !== undefined || m.repository !== undefined;
}

/** One bag in full: its declaration, and where that resolves on THIS vessel. */
export async function cmdBagShow(args: ParsedArgs): Promise<number> {
  const bag   = bagArg(args, "show");
  const roots = bagHomeRoots();
  const found = surveyBags(surveyDir(args), roots).find((s) => s.bag === bag);
  if (!found) throw new BagUsageError(`no bag "${bag}" stands under ${surveyDir(args)}`);
  const place = placeBag(found.manifest, roots);

  emit(args, {
    ok: true,
    data: {
      bag, dir: found.dir, manifest: found.manifest, adrift: found.adrift,
      resolves: place.resolution.ok ? place.resolution.dir : null,
      why: place.resolution.ok ? null : place.resolution.why,
      travelsWithAClone: bagHomeTravelsWithAClone(found.manifest.home),
    },
    human: () => {
      console.log(`${bag}`);
      console.log(`  cap-tier:  ${found.manifest.tier}   (only ever TIGHTENS against the structural floor)`);
      console.log(`  home:      ${found.manifest.home}${found.manifest.repository ? ` → repo "${found.manifest.repository}"` : ""}`);
      console.log(`  a clone of the repo carries it: ${bagHomeTravelsWithAClone(found.manifest.home) ? "YES" : "no"}`);
      console.log(`  bytes sit:  ${found.dir}`);
      if (place.resolution.ok) {
        console.log(`  declares:   ${place.resolution.dir}`);
        if (found.adrift) console.log(`  ⚠ ADRIFT — re-anchor with: lares bag home ${bag} --to ${found.manifest.home} --approve`);
      } else {
        console.log(`  declares:   (unresolvable here) ${place.resolution.why}`);
      }
    },
  });
  return 0;
}

/** Write or amend a bag's own declaration. It moves no bytes — `bag home` does that. */
export async function cmdBagDeclare(args: ParsedArgs): Promise<number> {
  const bag   = bagArg(args, "declare");
  const roots = bagHomeRoots();
  const found = surveyBags(surveyDir(args), roots).find((s) => s.bag === bag);
  if (!found) throw new BagUsageError(`no bag "${bag}" stands under ${surveyDir(args)}`);

  const tierRaw = args.options["tier"];
  const homeRaw = args.options["home"];
  const repo    = args.options["repo"];
  if (tierRaw === undefined && homeRaw === undefined && repo === undefined && args.options["role"] === undefined) {
    throw new BagUsageError("declare wants something to declare: --tier · --home · --repo · --role");
  }
  if (homeRaw !== undefined && !isBagHome(homeRaw.trim().toLowerCase())) {
    throw new BagUsageError(`--home expects one of ${BAG_HOMES.join(" | ")}, got "${homeRaw}"`);
  }
  const home = (homeRaw !== undefined ? homeRaw.trim().toLowerCase() : found.manifest.home) as BagHome;
  const next: BagManifest = {
    bag,
    tier: tierRaw !== undefined ? parseCapTier(tierRaw) : found.manifest.tier,
    home,
    ...(home === "repository" && (repo ?? found.manifest.repository) ? { repository: (repo ?? found.manifest.repository)! } : {}),
    ...(args.options["role"] ?? found.manifest.role ? { role: (args.options["role"] ?? found.manifest.role)! } : {}),
  };
  // DECLARING NEVER MOVES BYTES. A declaration that relocated a bag as a side effect would make a
  // documentation edit into a filesystem act, and the two want different consent.
  const path  = writeBagManifest(found.dir, next);
  const place = placeBag(next, roots);
  const adrift = place.resolution.ok && `${place.resolution.dir}/${bag}` !== found.dir;

  emit(args, {
    ok: true,
    data: { bag, path, manifest: next, adrift },
    human: () => {
      console.log(`${bag} declares: cap-tier ${next.tier} · home ${next.home}${next.repository ? ` → "${next.repository}"` : ""}`);
      console.log(`  written: ${path}`);
      console.log(`  (a declaration moves no bytes — relocate with: lares bag home ${bag} --to ${next.home} --approve)`);
      if (adrift) console.log(`  ⚠ this bag now sits ADRIFT of its own declaration until you move it.`);
    },
  });
  return 0;
}

/** MOVE a bag to a declared home — the act, gated on an explicit approval. */
export async function cmdBagHome(args: ParsedArgs): Promise<number> {
  const bag   = bagArg(args, "home");
  const toRaw = (args.options["to"] ?? "").trim().toLowerCase();
  if (!isBagHome(toRaw)) throw new BagUsageError(`--to expects one of ${BAG_HOMES.join(" | ")}, got "${args.options["to"] ?? ""}"`);
  const roots = bagHomeRoots();
  const found = surveyBags(surveyDir(args), roots).find((s) => s.bag === bag);
  if (!found) throw new BagUsageError(`no bag "${bag}" stands under ${surveyDir(args)}`);

  const next = { home: toRaw as BagHome, ...(args.options["repo"] ? { repository: args.options["repo"] } : {}) };
  if (args.flags["approve"] !== true) {
    // DRY-RUN BY DEFAULT. A verb that relocates bytes should show its plan and wait; an operator who meant it
    // types one more word, and an operator who did not keeps their bag.
    const plan = placeBag({ ...found.manifest, ...next }, roots);
    emit(args, {
      ok: true,
      data: { bag, planned: next, from: found.dir, to: plan.resolution.ok ? `${plan.resolution.dir}/${bag}` : null,
              why: plan.resolution.ok ? null : plan.resolution.why, approved: false },
      human: () => {
        console.log(`PLAN — ${bag} would move to home "${toRaw}"${next.repository ? ` (repo "${next.repository}")` : ""}`);
        console.log(`  from: ${found.dir}`);
        console.log(plan.resolution.ok ? `  to:   ${plan.resolution.dir}/${bag}` : `  REFUSED: ${plan.resolution.why}`);
        if (plan.resolution.ok) console.log(`  run it: lares bag home ${bag} --to ${toRaw}${next.repository ? ` --repo ${next.repository}` : ""} --approve`);
      },
    });
    return plan.resolution.ok ? 0 : exitFor("error");
  }

  const outcome = moveBagHome(found, next, roots);
  if (!outcome.ok) {
    emit(args, { ok: false, error: { code: "error", message: outcome.why },
                 human: () => console.error(`lares bag home ${bag}: REFUSED — ${outcome.why}`) });
    return exitFor("error");
  }
  emit(args, {
    ok: true,
    data: outcome,
    human: () => {
      console.log(`${bag} MOVED`);
      console.log(`  from: ${outcome.from}`);
      console.log(`  to:   ${outcome.to}`);
      console.log(`  declaration re-anchored inside the moved directory.`);
      if (outcome.manifest.home === "repository") {
        console.log(`  the bytes now sit in a WORKING TREE — nothing was committed. What enters a history is your act.`);
      }
    },
  });
  return 0;
}

/** The operator's repo registry — ids the bags name, roots only this vessel knows. */
export async function cmdBagRepo(args: ParsedArgs): Promise<number> {
  const op = (args.positional[1] ?? "list").trim();
  if (op === "list") {
    const repos = [...readRepoRegistry().values()];
    emit(args, {
      ok: true, data: { path: repoRegistryPath(), repos },
      human: () => {
        if (repos.length === 0) {
          console.log("no repos registered — a bag homing at a repository will refuse until one is.");
          console.log("  register: lares bag repo add <id> --root <path> [--vcs git|other]");
          return;
        }
        console.log("registered repos (a bag names the ID; the root never leaves this vessel):");
        for (const r of repos) console.log(`  ${r.id.padEnd(16)} ${r.vcs.padEnd(6)} ${r.root}`);
      },
    });
    return 0;
  }
  if (op === "add") {
    const id   = (args.positional[2] ?? "").trim();
    const root = args.options["root"];
    if (!id || !root) throw new BagUsageError("usage: lares bag repo add <id> --root <path> [--vcs git|other]");
    const vcs  = args.options["vcs"] === "other" ? "other" : "git";
    const all  = registerRepo({ id, root, vcs });
    emit(args, { ok: true, data: { id, root, vcs, count: all.size },
                 human: () => console.log(`registered repo "${id}" (${vcs}) → ${root}`) });
    return 0;
  }
  if (op === "drop") {
    const id = (args.positional[2] ?? "").trim();
    if (!id) throw new BagUsageError("usage: lares bag repo drop <id>");
    const all = unregisterRepo(id);
    emit(args, { ok: true, data: { id, count: all.size },
                 human: () => {
                   console.log(`dropped repo "${id}"`);
                   console.log("  bags naming it keep their declaration — they simply stop resolving HERE.");
                 } });
    return 0;
  }
  throw new BagUsageError(`unknown repo op "${op}" (expected list | add | drop)`);
}

/** Wrap a bag-lifecycle handler so a usage slip reads as usage, never as a crash. */
export function bagLifecycle(handler: (a: ParsedArgs) => Promise<number>): (a: ParsedArgs) => Promise<number> {
  return async (args) => {
    try { return await handler(args); }
    catch (err) {
      const msg  = err instanceof Error ? err.message : String(err);
      const code = err instanceof BagUsageError ? "usage" : "error";
      emit(args, { ok: false, error: { code, message: msg }, human: () => console.error(`lares bag: ${msg}`) });
      return exitFor(code);
    }
  };
}
