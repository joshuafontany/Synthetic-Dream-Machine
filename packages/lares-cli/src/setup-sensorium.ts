/**
 * setup-sensorium — `lares wake --init`: stand up the SOVEREIGN sensorium organs. Idempotent. A thin
 * CLI wrapper: the logic lives ONCE in @lararium/node's palace-organ registry (`setupPalaceOrgans`),
 * the SAME enumerator `lares palace-teardown` reads — so setup and teardown can never drift over
 * which organs exist.
 *
 * SOVEREIGN ONLY — the guest `~/.mempalace` is NOT stood here. It was, once, and that was the bug:
 * `wake --init` shelled `mempalace init` and pinned its config, writing the very store the S5
 * comparator ruling reserves as an untouched baseline (`RUN-ARC.md:14` — "the RUN never writes it").
 * The guest now rides `lares mempalace setup` (see commands/mempalace.ts), where an operator raises
 * it DELIBERATELY: as a standalone sanity-check sidecar, or as the source of the one-way import Act.
 *
 * The registry stands, in dependency order:
 *   1. contentpalace   <memory>/content   — the LARARIUM-OWNED verbatim ground (li/sheaf). FIRST:
 *      recall reads it, and the other planes key against its cids.
 *   2. structurepalace / 3. formpalace — ChromaDB instances; the collection is created lazily on first
 *      `put`, so standing them up only ensures the store directory exists.
 *   4. persistencepalace — the Testimony/witness store (the cosheaf cap every sensorium #has).
 *   5. meshpalace — stood LAST (it couples to a live node); the directory wiring is all we do here,
 *      the @meshpalace feed/federation logic lives in the mesh domain.
 *
 * Per-project mining + the lar_* harvest are NOT done here (kept fast + idempotent); they accumulate
 * live via the ingest hook, or run on demand via `lares harvest`.
 */

export { setupPalaceOrgans as setupSensorium } from "@lararium/node";
export type { PalaceSetupStep } from "@lararium/node";
