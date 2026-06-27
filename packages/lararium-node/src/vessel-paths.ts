/**
 * vessel-paths — the ONE resolver for the operator's runtime vessel state, rooted in the home.
 *
 * The corpus + code live in the repo (versioned); the vessel's RUNTIME STATE — storage · identity ·
 * projection · genesis · harvest · the UDS socket — lives in the operator's HOME (~/.lares). This is
 * the @daemon ontology made filesystem: the bound-operator's vessel-only worker belongs to the
 * operator, not to a checkout.
 *
 * `LAR_ROOT` overrides the home root for ISOLATED instances (the test harness / staged pairs): each
 * pair gets its own tree, the subdir layout unchanged. Both the CLI (local-connector) and the node
 * daemon (uds-channel) resolve through HERE, so the UDS socket path always agrees.
 *
 * The `.lararium*` subdir NAMES are kept (only the root moved from <repo> → ~/.lares), so every
 * existing derivation holds: identity = `dirname(dataDir)/.lararium-identity`, the reset wipe-zone,
 * the watch filter. Reset wipes `larDataDir` (.lararium); `larIdentityDir` is a sibling, preserved.
 */

import { homedir } from "node:os";
import { join } from "node:path";

/** The vessel home — `LAR_ROOT` (isolated instance) or `~/.lares` (the operator default). */
export function larHome(): string {
  return process.env["LAR_ROOT"] ?? join(homedir(), ".lares");
}

/** Storage dir — the Automerge Repo, vessel key, and UDS socket. WIPED by `reset`. */
export function larDataDir(): string {
  return join(larHome(), ".lararium");
}

/** Vessel identity dir — the keypair, PRESERVED across `reset` (sibling of the wipe-zone). */
export function larIdentityDir(): string {
  return join(larHome(), ".lararium-identity");
}

/** Disk-projection state dir (the synced-tree watermark). */
export function larProjectionDir(): string {
  return join(larHome(), ".lararium-projection");
}

// NOTE: genesis/ (the baked island.bin seed + social-bootstrap.json) stays CORPUS-relative
// (larRoot / the repo), NOT here — it is tracked seed, not runtime state. See env.ts larBootstrapPath.

/** Harvest watermark (lar_hv idempotency state). */
export function larHarvestDir(): string {
  return join(larHome(), "harvest");
}

/** Harvest stage (normalized transcript copies). */
export function larHarvestStageDir(): string {
  return join(larHome(), "harvest-stage");
}
