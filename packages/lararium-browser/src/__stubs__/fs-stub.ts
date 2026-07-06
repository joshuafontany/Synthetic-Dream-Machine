/**
 * Browser stub for Node's `fs` module.
 *
 * The `@lararium/mesh` barrel re-exports several host-only source adapters
 * (claude-code / codex / copilot-cli / copilot-chat) that carry a top-level
 * `import { readFileSync } from "node:fs"`. In a browser test substrate that
 * binding externalizes and throws at module-eval, blocking the platform-blind
 * hull the browser tier shares with node. None of those adapters RUN in the
 * browser tests — only their module graph loads — so a binding that satisfies
 * evaluation and refuses at call-time keeps the hull loadable while surfacing
 * any accidental browser use loudly.
 */

export function readFileSync(): never {
  throw new Error("[fs-stub] readFileSync is unavailable in the browser test substrate");
}
