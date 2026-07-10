/**
 * hnsw-repair — the divergence-gated, idempotent HNSW-rebuild core (the harvest tail).
 *
 * After a mine, the mempalace vector index (HNSW) can drift from its sqlite ground truth: rows
 * accrete in `chroma.sqlite3` while the HNSW segment freezes at a stale `max_elements` (mempalace
 * #1222). A large enough gap segfaults every vector search. `mempalace repair --mode from-sqlite`
 * rebuilds the index from sqlite (the rows are intact there) — but it needs EXCLUSIVE palace access,
 * so every holder's file handles must be OFF the palace during the swap, and the swap is heavy.
 *
 * This core makes the rebuild a SAFE, IDEMPOTENT tail:
 *   - DIVERGENCE-GATED: it reads `mempalace repair-status` (pure sqlite, ~100ms, never opens the
 *     broken HNSW) and runs the rebuild ONLY when the drawers index reads DIVERGED. Aligned → SKIP
 *     (a no-op, so re-running `lares harvest` never re-rebuilds).
 *   - FAIL-SOFT: a repair (or a status read) that throws NEVER fails the harvest — it records the
 *     failure and returns. The tail is an optimization; the mine already landed.
 *
 * The IO is fully injected (checkStatus / quiesce / repair), so the orchestration is unit-testable
 * without touching a palace; `harvest.ts` wires the real commands (repair-status, the `fuser` FD
 * quiesce, `repair --mode from-sqlite`). The MCP's stale handle re-opens out-of-band — the harness
 * respawns the MCP on its next tool-call and `mempalace_reconnect` refreshes it; lares cannot
 * restart the harness-owned MCP, only quiesce + rely on respawn.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/lar-telemetry
 */

/** A parsed divergence reading off `mempalace repair-status` text. */
export interface HnswDivergence {
  /** the drawers index reads DIVERGED (the rebuild gate) */
  readonly diverged: boolean;
  /** sqlite_count − hnsw_count for the drawers index, or null when unreadable */
  readonly divergence: number | null;
}

/**
 * Parse `mempalace repair-status` text → the DRAWERS-index divergence. The closets index reports
 * UNKNOWN on a fresh palace (no embeddings yet) — never read as divergence; only the drawers block's
 * `status: DIVERGED` marker gates the rebuild. Returns `diverged=false` when the block is absent or
 * the text is unparseable (fail-safe: an unreadable status never triggers a destructive rebuild).
 */
export function parseHnswDivergence(repairStatusText: string): HnswDivergence {
  // Isolate the [drawers] block — up to the next bracketed label or end-of-text.
  const m = /\[drawers\]([\s\S]*?)(?:\n\s*\[|$)/.exec(repairStatusText);
  if (!m || !m[1]) return { diverged: false, divergence: null };
  const block = m[1];
  const diverged = /status:\s*DIVERGED/i.test(block);
  const dm = /divergence:\s*([\d,]+)/i.exec(block);
  const divergence = dm && dm[1] ? Number(dm[1].replace(/,/g, "")) : null;
  return { diverged, divergence };
}

/** What the repair tail did (mirrors the dual TTY/JSON emit the CLI wraps). */
export interface HnswRepairResult {
  /** skip = aligned (idempotent) · repaired = diverged then rebuilt · repair-failed = rebuild threw
   *  · check-failed = the status read threw (fail-soft, harvest still ok) */
  readonly action: "skip" | "repaired" | "repair-failed" | "check-failed";
  /** the divergence read before acting (null when the status read failed) */
  readonly divergence: number | null;
  /** the post-rebuild divergence (only on the repaired path, when a re-verify ran) */
  readonly afterDivergence?: number | null;
  /** a human note (the error message on a failure path) */
  readonly note?: string;
}

/** The injected substrate the orchestrator drives (real commands in harvest.ts; mocks in tests). */
export interface HnswRepairIo {
  /** read `mempalace repair-status` → its raw text (pure sqlite, ~100ms). */
  readonly checkStatus: () => Promise<string>;
  /** drop every holder's FD off the palace (the `fuser … | xargs -r kill -TERM` resource-quiesce). */
  readonly quiesce: () => Promise<void>;
  /** run `mempalace repair --mode from-sqlite` (EXCLUSIVE access, the temp-collection swap). */
  readonly repair: () => Promise<void>;
}

/**
 * The idempotent, divergence-gated, fail-soft rebuild tail. Reads status; if the drawers index is
 * aligned, SKIPS (no-op). If diverged: quiesce the holders → repair → re-verify. A throw anywhere
 * after the gate records the failure and returns — the rebuild NEVER fails the harvest that called it.
 */
export async function repairHnswIfDiverged(io: HnswRepairIo): Promise<HnswRepairResult> {
  let before: HnswDivergence;
  try {
    before = parseHnswDivergence(await io.checkStatus());
  } catch (e) {
    return { action: "check-failed", divergence: null, note: errText(e) };
  }

  if (!before.diverged) return { action: "skip", divergence: before.divergence };

  try {
    // The rebuild needs the palace to itself: drop every holder's FD first, then swap.
    await io.quiesce();
    await io.repair();
  } catch (e) {
    return { action: "repair-failed", divergence: before.divergence, note: errText(e) };
  }

  // Re-verify — best effort. A failed re-read does not unwind a completed rebuild.
  let after: number | null = null;
  try {
    after = parseHnswDivergence(await io.checkStatus()).divergence;
  } catch { /* re-verify is informational; the rebuild already ran */ }
  return { action: "repaired", divergence: before.divergence, afterDivergence: after };
}

function errText(e: unknown): string {
  return String((e as Error)?.message ?? e).trim().slice(0, 200);
}
