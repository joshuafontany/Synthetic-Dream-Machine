/**
 * test-wiki — one door to a booted TiddlyWiki, for every suite that asks the wiki rather than a module.
 *
 * ── WHY ONE DOOR ────────────────────────────────────────────────────────────────────────────────
 * The suites that ask a real wiki each re-derived the same three things: where the vendored core blob
 * sits, what to do when it is absent, and which plugins the grammar needs. Three facts in six
 * spellings drift the way every such set drifts — a plugin added to five of them reads correct in each
 * file while the sixth quietly tests an older grammar.
 *
 * Constructing a `TW5Engine` does NOT make a suite one of them. `vm-grammar-boundary` builds an engine
 * and never boots it, driving a fake wiki to prove the host delegates decomposition to the VM rather
 * than deciding it — the engine there is a stand-in, and routing it through this door would replace the
 * fake it exists to hold. A suite belongs here when it needs a wiki to ANSWER, not to exist.
 *
 * The SKIP is the half worth naming. The core blob is a gitignored build artifact, so a fresh clone —
 * and CI's `test` job, which runs `pnpm -r test` with no build step — sees it absent. An anonymous
 * `skipIf` there drops a suite at exit 0, indistinguishable from a green run. Every skip this helper
 * hands back names itself and its cure in the reporter line.
 *
 * ── DRIVEN FROM OUTSIDE THE LIVE VESSEL ─────────────────────────────────────────────────────────
 * This stands its own engine and never reaches for a running @daemon. A suite that asked the live
 * vessel would measure whatever that vessel happens to hold — its bags, its edits, its uptime — and
 * report the operator's state as the grammar's behaviour. The wiki here boots from the same core and
 * plugins a vessel does and holds nothing else, so what a test reads, the grammar put there.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/memetic-wikitext
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { TW5Engine } from "../src/tw5-vm.js";
import LARES_MEMETIC_WIKITEXT_PLUGIN from "../plugins/lares-memetic-wikitext.json" with { type: "json" };
import { TW5_CORE_DIR, TW5_CORE_SCRIPT_FILENAME } from "../src/generated-tw5-version.js";

/** Where the vendored core blob stands. */
export const CORE_PATH = path.join(TW5_CORE_DIR, TW5_CORE_SCRIPT_FILENAME);

/** The repository root, for a suite reading real carriers off disk. */
export const REPO = new URL("../../..", import.meta.url).pathname;

/**
 * False when a wiki can boot; otherwise the reason AND its cure, ready to read in the reporter line.
 * Pass to `describe.skipIf` and interpolate into the describe title.
 */
export const wikiSkip: false | string = existsSync(CORE_PATH)
  ? false
  : `TW5 core blob absent at ${CORE_PATH} — run: pnpm --filter @lararium/tw5 build:tw5-vendor`;

/** Suffix for a describe title, so a skipped suite says why in the reporter rather than vanishing. */
export const skipNote = wikiSkip ? ` [SKIPPED: ${wikiSkip}]` : "";

/**
 * Boot a wiki holding the grammar and nothing else.
 *
 * `extraPlugins` rides for a suite needing more than the grammar; `tiddlers` seeds records the suite
 * authors itself. Both stay empty by default, so the plain call yields the same wiki every time.
 */
export async function bootTestWiki(opts: {
  extraPlugins?: Array<Record<string, unknown>>;
  tiddlers?: Array<Record<string, string | string[]>>;
} = {}): Promise<TW5Engine> {
  const engine = new TW5Engine();
  await engine.boot(new Uint8Array(readFileSync(CORE_PATH)), [
    LARES_MEMETIC_WIKITEXT_PLUGIN as unknown as Record<string, unknown>,
    ...(opts.extraPlugins ?? []),
  ]);
  for (const t of opts.tiddlers ?? []) engine.setTiddler(t);
  return engine;
}
