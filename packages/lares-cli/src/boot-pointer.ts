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
import { dirname, join } from "node:path";
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
  mkdirSync(dirname(file), { recursive: true });
  if (standing === null) {
    writeFileSync(file, render(target), "utf8");
    return { item, action: "wired", detail: `${file} seated -> ${BOOT_CARRIER}` };
  }
  // A STANDING FILE KEEPS EVERYTHING THAT IS NOT THE POINTER. These files carry operator prose —
  // an adapter surface, personal instructions — and a re-aim that rewrote the file whole would take
  // that with it. The line naming the seed is the only line this law owns.
  copyFileSync(file, file + ".bak");
  writeFileSync(file, reaim(standing, render(target)), "utf8");
  return { item, action: "wired", detail: `${file} re-aimed -> ${BOOT_CARRIER}` };
}

/**
 * Swap the line that names the seed, and leave the rest of the file standing.
 *
 * A file with no such line gets the pointer at its head, because a pointer read after the prose it
 * governs has already missed its turn — the harness loads top-down.
 */
function reaim(standing: string, pointer: string): string {
  const line = pointer.replace(/\n+$/, "");
  const lines = standing.split("\n");
  const at = lines.findIndex((l) => l.includes("noosphere-boot"));
  if (at === -1) return line + "\n\n" + standing.replace(/^\n+/, "");
  lines[at] = line;
  return lines.join("\n");
}

/** Claude expands `@path` as an include, so its pointer IS the include line. */
export const asInclude = (t: string): string => `@${t}\n`;

/** Codex and Copilot follow a markdown link; the lead-in reads as the instruction it is. */
export const asLink = (lead: string) => (t: string): string =>
  `${lead}[noosphere-boot.mem](${t})\n`;

/**
 * The repo's own adapters — the files a harness reads when it opens THIS folder.
 *
 * VS Code names them in its own source table (`CLAUDE.md`, `AGENTS.md`, `copilot-instructions.md`),
 * and the Claude, Codex and Copilot CLIs each read their own. They sat correct and UNTENDED: nothing
 * re-aimed them when the carrier moved, which is the state all four harness homes were found in.
 *
 * The pointer here reads REPO-RELATIVE. An absolute path would break for every other clone of this
 * repository, and these files travel with it.
 */
const ADAPTERS: ReadonlyArray<{ file: string; render: (t: string) => string }> = [
  { file: "CLAUDE.md", render: (t) => `@${t}\n\n## Claude Adapter Surface\n\n- Keep this file thin.\n- Add only Claude-specific customizations here.\n` },
  { file: "AGENTS.md", render: (t) => `-> [noosphere-boot.mem](${t})\n\n## Codex Adapter Surface\n\n- Keep this file thin.\n- Add only Codex-specific customizations here.\n` },
  { file: "copilot-instructions.md", render: (t) => `-> [noosphere-boot.mem](${t})\n\n## Copilot Adapter Surface\n\n- Keep this file thin.\n- Add only Copilot-specific customizations here.\n` },
  { file: ".github/copilot-instructions.md", render: (t) => `Always load -> [noosphere-boot.mem](${t})\n` },
];

/** Aim every repo adapter at the carrier, creating any that do not stand. */
export function tendRepoAdapters(root: string): BootPointerStep[] {
  if (!existsSync(join(root, BOOT_CARRIER))) {
    return [{ item: "repo adapters", action: "missing-script", detail: `${BOOT_CARRIER} not found — the pointers would aim at nothing` }];
  }
  return ADAPTERS.map((a) => tendBootPointer(join(root, a.file), BOOT_CARRIER, a.render, a.file));
}
