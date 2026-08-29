/**
 * boot-pointer — the one line each harness reads at wake, and the law that keeps it aimed.
 *
 * Every harness loads a file at session start and hydrates the house from what it names. Those files
 * live in four different homes under three different spellings, and NOTHING TENDED THEM: when the
 * carrier moved, three homes went on naming a path that no longer stood.
 *
 * THAT FAILURE IS SILENT BY CONSTRUCTION. A pointer aimed at a missing file does not error — the
 * harness wakes, finds nothing behind the link, and reports a clean start. The node comes up without
 * the house and says nothing about why, which is the one failure mode a health line cannot show.
 *
 * So presence never satisfies this check. A pointer counts as tended only when it names THE CARRIER,
 * and a pointer naming anything else gets re-aimed — the file's existence says nothing about where it
 * points, and existence is exactly what the old checks tested.
 *
 * A POINTER, NEVER A COPY. A copied seed is a second seed: it reads correct the day it is written and
 * drifts from the carrier every day after, with nothing watching it. The pointer costs one indirection
 * and buys a single source.
 *
 * The spellings differ because the harnesses do — Claude expands `@path` as an include, Codex and
 * Copilot follow a markdown link — so the RENDERING is per-harness and the LAW is not.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname } from "node:path";
import type { WireAction } from "./mcp-resolve.js";

/** The carrier every pointer names, repo-relative. */
export const BOOT_CARRIER = "bags/lares/ha.ka.ba/lares/api/noosphere-boot.mem";

export interface BootPointerStep {
  readonly item: string;
  readonly action: WireAction;
  readonly detail: string;
}

/**
 * Aim one pointer file at the carrier. Creates it when absent, re-aims it when it names anything
 * else, leaves it alone when it already names the carrier. Backs up whatever it replaces.
 *
 * `target` is the path the pointer must name — absolute for a harness home, repo-relative for a repo
 * adapter — and `render` spells it the way that harness reads.
 */
export function tendBootPointer(
  file: string,
  target: string,
  render: (target: string) => string,
  item = "boot pointer",
): BootPointerStep {
  const standing = existsSync(file) ? readFileSync(file, "utf8") : null;
  if (standing !== null && standing.includes(target)) {
    return { item, action: "present", detail: `${file} -> ${BOOT_CARRIER}` };
  }
  if (standing !== null) copyFileSync(file, file + ".bak");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, render(target), "utf8");
  return {
    item,
    action: "wired",
    detail: `${file} ${standing === null ? "seated" : "re-aimed"} -> ${BOOT_CARRIER}`,
  };
}

/** Claude expands `@path` as an include, so its pointer IS the include line. */
export const asInclude = (t: string): string => `@${t}\n`;

/** Codex and Copilot follow a markdown link; the lead-in reads as the instruction it is. */
export const asLink = (lead: string) => (t: string): string =>
  `${lead}[noosphere-boot.mem](${t})\n`;
