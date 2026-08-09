/**
 * bag-declare — the node-fs shore for a bag's own declaration, the operator's repo registry, and the MOVE.
 *
 * The pure half (what a bag declares, where that resolves, what a move would change) lives in
 * `@lararium/mesh`'s bag-manifest + bag-home. This is the disk: read the `iam.mem` a bag carries, read the
 * repo registry the operator configured, and — under an explicit approval — relocate the bytes and rewrite
 * the declaration together.
 *
 * ── THE REGISTRY IS THE CURE FOR MAGIC STRINGS ───────────────────────────────────────────────────
 * Every repo an operator uses gets an ID here, once, with its root. A bag then names the id and nothing else,
 * so no directory ever enters an artifact meant to travel. Registering is the operator's own act: the code
 * ships no repo, infers none from a checkout, and treats an unregistered id as a refusal rather than a hint.
 *
 * ── THE MOVE IS AN ACT, AND IT ADMITS IT ─────────────────────────────────────────────────────────
 * Relocating a bag moves an operator's bytes across a boundary that matters: into a tracked history, or out
 * of one. So it runs HITL (`--approve`), it PLANS before it touches anything (both ends resolve first), it
 * refuses to overwrite an occupied destination, and it moves the directory whole rather than merging into
 * whatever stands there. A move into a `repository` leaves the actual committing to the operator — this
 * writes files into a working tree and never runs a source-control verb, because deciding what enters a
 * history belongs to the hand that will answer for it.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/cap-tier
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  BAG_MANIFEST_FILE, bagManifestFromIam, defaultBagManifest, renderBagManifest, planBagMove,
  type BagHome, type BagHomeRoots, type BagManifest, type BagMove, type RepoRegistration,
} from "@lararium/mesh";
import { larDataHome } from "./vessel-paths.js";
import { atomicWriteFileSync } from "./fs-atomic.js";

/** Where the operator's repo registry rests — per-operator state, beside every other sovereign thing. */
export function repoRegistryPath(): string {
  return join(larDataHome(), "repos.json");
}

/**
 * Read the operator's registered repos, by id. An absent or torn registry reads EMPTY rather than throwing:
 * a vessel with no repos configured is an ordinary vessel, and every `repository` home then refuses with a
 * message naming the cure.
 */
export function readRepoRegistry(): Map<string, RepoRegistration> {
  const path = repoRegistryPath();
  const out  = new Map<string, RepoRegistration>();
  if (!existsSync(path)) return out;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as { repos?: unknown };
    if (!Array.isArray(raw.repos)) return out;
    for (const entry of raw.repos) {
      const r = entry as Partial<RepoRegistration>;
      if (typeof r.id !== "string" || typeof r.root !== "string" || !r.id || !r.root) continue;
      out.set(r.id, { id: r.id, root: r.root, vcs: r.vcs === "other" ? "other" : "git" });
    }
  } catch { /* a torn registry reads empty — a re-register re-records what the operator meant */ }
  return out;
}

/** Register (or re-point) one repo by id. The operator's own act; nothing infers a repo from a checkout. */
export function registerRepo(reg: RepoRegistration): Map<string, RepoRegistration> {
  const all = readRepoRegistry();
  all.set(reg.id, reg);
  mkdirSync(larDataHome(), { recursive: true });
  atomicWriteFileSync(repoRegistryPath(), JSON.stringify({ repos: [...all.values()] }, null, 2));
  return all;
}

/** Drop a repo id. Bags naming it keep their declaration and simply stop resolving HERE — never broken. */
export function unregisterRepo(id: string): Map<string, RepoRegistration> {
  const all = readRepoRegistry();
  all.delete(id);
  mkdirSync(larDataHome(), { recursive: true });
  atomicWriteFileSync(repoRegistryPath(), JSON.stringify({ repos: [...all.values()] }, null, 2));
  return all;
}

/** This vessel's roots — the registered repos plus the hearth every standing vessel has. */
export function bagHomeRoots(): BagHomeRoots {
  return { hearth: join(larDataHome(), "bags"), repositories: readRepoRegistry() };
}

/**
 * Pull the `toml iam` table out of a `.mem` body.
 *
 * DELIBERATELY SHALLOW. It reads flat `key = "value"` lines inside the fenced block and nothing else, because
 * a manifest carries only flat scalars and a fuller parser would invite fuller manifests. A key it cannot
 * read simply does not appear, and every field the caller wants already fail-closes on absence.
 */
export function iamTableFromBody(body: string): Record<string, unknown> {
  const fence = /```toml\s+iam\s*\n([\s\S]*?)\n```/.exec(body);
  const table: Record<string, unknown> = {};
  if (!fence?.[1]) return table;
  for (const line of fence[1].split("\n")) {
    const kv = /^\s*([A-Za-z0-9_-]+)\s*=\s*"(.*)"\s*$/.exec(line);
    if (kv?.[1] !== undefined && kv[2] !== undefined) table[kv[1]] = kv[2];
  }
  return table;
}

/** Read one bag's declaration off a directory, or the fail-closed default when it declares none. */
export function readBagManifest(bagDir: string, bag: string): BagManifest {
  const path = join(bagDir, BAG_MANIFEST_FILE);
  if (!existsSync(path)) return defaultBagManifest(bag);
  try {
    return bagManifestFromIam(bag, iamTableFromBody(readFileSync(path, "utf8")));
  } catch {
    return defaultBagManifest(bag);
  }
}

/** Write a bag's declaration into its directory, atomically. */
export function writeBagManifest(bagDir: string, manifest: BagManifest): string {
  mkdirSync(bagDir, { recursive: true });
  const path = join(bagDir, BAG_MANIFEST_FILE);
  atomicWriteFileSync(path, renderBagManifest(manifest));
  return path;
}

/** One bag as this vessel sees it: where its bytes actually sit, and what it declares. */
export interface BagSighting {
  readonly bag:      string;
  readonly dir:      string;
  readonly manifest: BagManifest;
  /** True when the bag sits somewhere its own declaration does NOT resolve to — a drift a reader should see. */
  readonly adrift:   boolean;
}

/**
 * Survey every bag under a directory — what stands there, and whether each sits where it says it belongs.
 *
 * `adrift` names the interesting row. A bag whose bytes sit somewhere its declaration does not point at is
 * exactly the condition that let a Nexus seal live in a repository: nothing was lying, nothing was checked,
 * and the mismatch had no surface. It has one now.
 */
export function surveyBags(dir: string, roots: BagHomeRoots = bagHomeRoots()): BagSighting[] {
  if (!existsSync(dir)) return [];
  const out: BagSighting[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (!name.startsWith("@")) continue;
    const bagDir = join(dir, name);
    if (!statSync(bagDir).isDirectory()) continue;
    const manifest = readBagManifest(bagDir, name);
    const plan     = planBagMove(manifest, { home: manifest.home, repository: manifest.repository }, roots);
    const declared = plan.to.resolution;
    out.push({
      bag: name, dir: bagDir, manifest,
      adrift: declared.ok ? join(declared.dir, name) !== bagDir : false,
    });
  }
  return out;
}

/** What a move did, or why it did not. */
export type BagMoveOutcome =
  | { readonly ok: true;  readonly bag: string; readonly from: string; readonly to: string; readonly manifest: BagManifest }
  | { readonly ok: false; readonly bag: string; readonly why: string };

/**
 * Move a bag to a declared home — the ACT, gated on a plan that already resolved both ends.
 *
 * REFUSALS, and each earns its place:
 *   · an unresolvable target (unregistered repo id, a `ley` home) never reaches the filesystem,
 *   · an OCCUPIED destination refuses rather than merging — two bags of one name are two bags, and a merge
 *     would silently interleave them,
 *   · a `ley` move refuses outright, because a plane that lives while the mesh carries it has nowhere to be
 *     put; reaching that state is a matter of ceasing to keep bytes, never of moving them somewhere.
 *
 * The declaration is rewritten INSIDE the moved directory, after the bytes land, so a crash between the two
 * leaves a bag that sits somewhere its declaration does not name — visible as `adrift` in a survey rather
 * than silently wrong.
 */
export function moveBagHome(
  sighting: BagSighting,
  next: { home: BagHome; repository?: string | undefined },
  roots: BagHomeRoots = bagHomeRoots(),
): BagMoveOutcome {
  const plan: BagMove = planBagMove(sighting.manifest, next, roots);
  if (!plan.to.resolution.ok) return { ok: false, bag: sighting.bag, why: plan.to.resolution.why };

  const destDir = join(plan.to.resolution.dir, sighting.bag);
  if (destDir === sighting.dir) {
    // Already there — rewrite the declaration so a drifted bag can be re-anchored without moving bytes.
    writeBagManifest(sighting.dir, plan.to.manifest);
    return { ok: true, bag: sighting.bag, from: sighting.dir, to: destDir, manifest: plan.to.manifest };
  }
  if (existsSync(destDir)) {
    return { ok: false, bag: sighting.bag, why: `${destDir} already stands — two bags of one name are two bags, and a merge would interleave them` };
  }

  mkdirSync(plan.to.resolution.dir, { recursive: true });
  renameSync(sighting.dir, destDir);
  writeBagManifest(destDir, plan.to.manifest);
  return { ok: true, bag: sighting.bag, from: sighting.dir, to: destDir, manifest: plan.to.manifest };
}
