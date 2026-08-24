/**
 * setup-sensorium — `lares vessel stand --init`: stand up the SOVEREIGN sensorium organs. Idempotent. A thin
 * CLI wrapper: the logic lives ONCE in @lararium/node's palace-organ registry (`setupPalaceOrgans`),
 * the SAME enumerator `lares sense teardown` reads — so setup and teardown can never drift over
 * which organs exist.
 *
 * SOVEREIGN ONLY. The guest `~/.mempalace` stands in its own lane (`lares mempalace setup`), raised
 * by a deliberate operator act — the boot never writes the comparator it measures against.
 *
 * The registry stands, in dependency order:
 *   1. contentpalace   <memory>/content   — the LARARIUM-OWNED verbatim ground (li/sheaf). FIRST:
 *      recall reads it, and the other planes key against its cids.
 *   2. structurepalace / 3. formpalace — ChromaDB instances; the collection is created lazily on first
 *      `put`, so standing them up only ensures the store directory exists.
 *   4. persistencepalace — the Testimony/witness store (the cosheaf cap every sensorium #has).
 *   5. meshpalace — stood LAST (it couples to a live node); the directory wiring is all we do here,
 *      the meshpalace doc's feed/federation logic lives in the mesh domain.
 *
 * Per-project mining + the lar_* harvest are NOT done here (kept fast + idempotent); they accumulate
 * live via the ingest hook, or run on demand via `lares sense pour`.
 */

export { setupPalaceOrgans as setupSensorium } from "@lararium/node";
export type { PalaceSetupStep } from "@lararium/node";
