/**
 * doctor-sweep — L6 read-only half, isomorphic. Runs the L1 `DocLoadProbe` over a set of
 * documentIds and tallies the verdicts into a report. Pure orchestration over the probe
 * contract — a platform enumerates its own store (nodefs shards / IndexedDB keys) and
 * feeds the ids here; both read back the same chart. Mutates nothing (the `git fsck`
 * role); the `repair` actuator stays a separate, consent-gated verb.
 */

import { isCondemned, type DocLoadProbe, type ProbeResult, type ProbeStatus } from "./doc-load-probe-contract.js";

/** One doc's line in the doctor chart. */
export interface DoctorEntry {
  readonly documentId: string;
  readonly status: ProbeStatus;
  readonly reason?: string;
  readonly chunks?: number;
}

/** The whole-store health chart. */
export interface DoctorReport {
  readonly entries: readonly DoctorEntry[];
  readonly total: number;
  readonly healthy: number;
  readonly condemned: number;
  /** true once any doc comes back condemned — the store carries a tear. */
  readonly degraded: boolean;
}

function toEntry(r: ProbeResult): DoctorEntry {
  return {
    documentId: r.documentId,
    status: r.status,
    ...(r.reason !== undefined ? { reason: r.reason } : {}),
    ...(r.chunks !== undefined ? { chunks: r.chunks } : {}),
  };
}

/**
 * Probe every documentId (bounded concurrency, so a large store does not spawn a
 * boundary per doc all at once) and tally the chart. Order of `entries` follows
 * completion, never input — the caller sorts for display.
 */
export async function sweepDocs(
  documentIds: readonly string[],
  probe: DocLoadProbe,
  opts: { concurrency?: number } = {},
): Promise<DoctorReport> {
  const concurrency = Math.max(1, opts.concurrency ?? 4);
  const entries: DoctorEntry[] = [];
  let next = 0;

  async function worker(): Promise<void> {
    while (next < documentIds.length) {
      const i = next++;
      const documentId = documentIds[i];
      if (documentId === undefined) continue;
      const verdict = await probe.probe(documentId);
      entries.push(toEntry(verdict));
    }
  }

  const lanes = Array.from({ length: Math.min(concurrency, documentIds.length) }, () => worker());
  await Promise.all(lanes);

  const condemned = entries.filter((e) => isCondemned({ documentId: e.documentId, status: e.status })).length;
  return {
    entries,
    total: entries.length,
    healthy: entries.length - condemned,
    condemned,
    degraded: condemned > 0,
  };
}
