/**
 * bag-copy-plan — the bag-grain COPY, planned before anything executes.
 *
 * ── WHAT THE VERB GRANTS ────────────────────────────────────────────────────────────────────────
 * Residency canon approves two bag-grain verbs. CREATE mints a coordinate; bag-grain COPY grants every
 * title in a source its residency in the destination, "`change-id` preserved per title; one
 * `transfer-id` family audits the batch". Together they carry the wiki-level crossing, and the
 * registration lands as a holdings accession in the union catalog.
 *
 * ── WHY A PLAN, AHEAD OF THE RAIL ───────────────────────────────────────────────────────────────
 * Execution rides the sovereign-worker rail — VERB → SUMMONS → OUTCOME, inside the admin island — and
 * a crossing grants residency across a plane boundary where canon holds the reverse crossing does not
 * exist: new residency gets granted outward instead. A batch that reads before it runs costs nothing;
 * one that reads afterwards costs a crossing nobody can walk back.
 *
 * So this shapes and refuses, and it touches no store.
 *
 * ── THE TWO LAWS A BATCH HOLDS ──────────────────────────────────────────────────────────────────
 * ONE TRANSFER FAMILY. The batch names a single transfer-id, so the ledger reads one crossing rather
 * than N unrelated grants — an accession and its deaccession find each other by it, and an auditor
 * asking what crossed gets the whole batch. It sits on the PLAN rather than on each action, because a
 * residency action grants and an effect record audits; only the second carries a family.
 *
 * EACH TITLE KEEPS ITS OWN CHANGE-ID. A change-id names one title's lineage. Folding a batch onto a
 * single id would erase which version of each title crossed, and residency grants a title where it
 * already stands rather than re-minting it.
 */
import type { CopyAction } from "./residency-actions.js";

/** One title's residency, as the source holds it. */
export interface TitleAtRest {
  readonly title:    string;
  readonly changeId: string;
}

export interface BagCopyPlan {
  /** Whether the batch may run. A refusing plan carries no actions. */
  readonly ok:         boolean;
  /** The title-grain grants this crossing performs, in source order. */
  readonly actions:    readonly CopyAction[];
  /** The one family the whole batch audits under. */
  readonly transferId: string;
  /** What this batch would do, or why it refuses. */
  readonly reading:    string;
}

const refuse = (transferId: string, reading: string): BagCopyPlan =>
  ({ ok: false, actions: [], transferId, reading });

/**
 * Plan a bag-grain COPY.
 *
 * Refuses rather than trimming. A batch that silently dropped a duplicate or a lineage-less title
 * would land a crossing whose ledger disagrees with the operator's intent, and a crossing reads
 * outward-only — so the cheap moment to disagree arrives here.
 */
export function bagCopyPlan(
  at:  { fromBag: string; toBag: string; titles: readonly TitleAtRest[] },
  by:  { requestId: string; requestedBy: string; transferId: string },
): BagCopyPlan {
  const from = at.fromBag.trim();
  const to   = at.toBag.trim();

  if (from.length === 0 || to.length === 0) {
    return refuse(by.transferId, "a crossing needs both coordinates named, and one of them arrived empty.");
  }
  if (from === to) {
    return refuse(by.transferId,
      `source and destination name one bag (${from}), and a title cannot cross to where it already `
      + "stands. A grant here would land an accession for residency the bag holds already.");
  }

  const seen = new Set<string>();
  for (const t of at.titles) {
    if (t.changeId.trim().length === 0) {
      return refuse(by.transferId,
        `the title ${JSON.stringify(t.title)} carries no change-id, so a grant would name no version of `
        + "it. Residency grants a title where it stands rather than re-minting it, and a lineage-less "
        + "grant leaves the destination unable to say what it received.");
    }
    if (seen.has(t.title)) {
      return refuse(by.transferId,
        `the title ${JSON.stringify(t.title)} appears more than once, and one crossing must not grant one `
        + "title twice: the batch would land two accessions in one transfer family, and the ledger could "
        + "not say which lineage the destination holds.");
    }
    seen.add(t.title);
  }

  if (at.titles.length === 0) {
    return { ok: true, actions: [], transferId: by.transferId,
             reading: `${from} holds no titles, so this crossing grants nothing and lands no accession. An `
                    + "empty bag crosses cleanly — a source with nothing in it names a state rather than a fault." };
  }

  // THE FAMILY RIDES THE LEDGER, NOT THE GRANT. A residency action carries no transfer-id, and the
  // effect record does: an accession and its deaccession find each other there. So the batch names its
  // family once, on the plan, and every action stays the ordinary title-grain COPY the rail executes.
  const actions: CopyAction[] = at.titles.map((t) => ({
    verb:        "COPY",
    title:       t.title,
    fromBag:     from,
    toBag:       to,
    changeId:    t.changeId,
    requestId:   by.requestId,
    requestedBy: by.requestedBy,
  }));

  return { ok: true, actions, transferId: by.transferId,
           reading: `${at.titles.length} title(s) cross from ${from} to ${to} under one transfer family `
                  + `(${by.transferId}), each keeping its own change-id. The destination gains residency; the `
                  + "source keeps its own, because COPY grants rather than moves." };
}
