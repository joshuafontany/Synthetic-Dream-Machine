/**
 * setup-mempalace — `lares wake --init`: stand up ALL the palace organs (not just the integration
 * deps). Idempotent. Thin CLI wrapper now: the logic lives ONCE in @lararium/node's palace-organ
 * registry (`setupPalaceOrgans`), the SAME enumerator `lares palace-teardown` reads — so setup and
 * teardown can never drift over which organs exist.
 *
 * The registry stands, in dependency order:
 *   1. mempalace   — `mempalace init <repo> --yes --no-llm` when no config exists (non-interactive,
 *      heuristics-only), then pin `hooks.auto_save = false` — THE re-pollution gate (a fresh init
 *      defaults it true and the plugin hooks fire independent of settings.json, so without this the
 *      `sessions` mega-wing returns on the first turn). The worldline-KG sqlite lives INSIDE it.
 *   2. astpalace / 3. formpalace — ChromaDB instances; the collection is created lazily on first
 *      `put`, so standing them up only ensures the store directory exists.
 *   4. meshpalace — stood LAST (it couples to a live node); the directory wiring is all we do here,
 *      the @meshpalace feed/federation logic lives in the mesh domain.
 *
 * Per-project mining + the lar_* harvest are NOT done here (kept fast + idempotent); they accumulate
 * live via the ingest hook, or run on demand via `lares harvest`.
 */

export { setupPalaceOrgans as setupMempalacePalace } from "@lararium/node";
export type { PalaceSetupStep } from "@lararium/node";
