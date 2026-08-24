/**
 * holdings-witness — what a vessel HOLDS on disk against what it has DECLARED, and the pono correction.
 *
 * ── THE GAP THIS WATCHES ────────────────────────────────────────────────────────────────────────
 * Bytes on disk publish nothing. A file under a bag's mirror is a thing this operator keeps; an entry on the
 * Nexus crossroads is a thing this operator has DECLARED to that Nexus. Canon draws the same line for names
 * — "the declaring act, never the characters, makes a name public" — and it holds identically for content:
 * a book in the mirror is private until an act carries it across.
 *
 * So the two sides drift apart in both directions, silently, and neither drift throws:
 *   · a text sits in the mirror that nobody ever admitted → the operator believes it published; no stranger
 *     mounting the floor can see it.
 *   · an index entry names a body whose bytes no longer rest in the CAS → a stranger reads a name that
 *     resolves to nothing, and learns only that something was once there.
 *
 * ── WHY IT WARNS AND NEVER REPAIRS ──────────────────────────────────────────────────────────────
 * Admitting is a DECLARING ACT, and an act performed on the operator's behalf without their hand is exactly
 * the un-deliberate publication the declaring-act law exists to prevent. A witness that quietly admitted
 * every unadmitted file would publish, in one boot, whatever happened to sit in a directory. So this reports
 * and names the correction; the operator's hand runs it.
 *
 * The same reasoning bars a "fix all" convenience. Each crossing is one decision.
 *
 * ── AND IT NAMES ONLY VERBS THAT STAND ──────────────────────────────────────────────────────────
 * A correction naming a command that does not exist wastes the reader's trust the first time they type it.
 * Where the act has no verb yet, the finding says so plainly rather than inventing one.
 *
 * ── ▶ SUSPENDED, AND ON WHAT ──────────────────────────────────────────────────────────────────
 * This fold stands complete and NOTHING CALLS IT, which reads as an unwired module and is not one. The
 * `declared` reading has no producer: `bodyIndexBagUri` is exported and called by nobody, because the
 * cad index SITER is designed and unbuilt. Wired today, every held file would report UNDECLARED — true
 * of each file and useless as a report, since the correction below already says the crossing has no verb.
 *
 * So the blocker sits OUTSIDE this module and gets named rather than left for the next reader to
 * re-derive: the DECLARING ACT needs a verb, and the body index needs a writer. When one lands, the
 * three readings are ready — `mirror-paths` projects `onDisk`, the index gives `declared`, and
 * `readCasBlobFromFs` answers `casHolds`.
 *
 * Meme: lar:///ha.ka.ba/lararium/docs/crossroads
 */

import { CROSSROADS_DOC_URI, BAGS_SEGMENT } from "./lar-uris.js";

/** What a vessel keeps, what it has declared, and what its content store actually holds. */
export interface HoldingsReading {
  /** Bag-relative paths present in this vessel's on-disk mirror, per bag id. */
  readonly onDisk: ReadonlyMap<string, readonly string[]>;
  /** The body-index entries a bag DECLARES: the logical name each entry posts, and the cid it points at. */
  readonly declared: ReadonlyMap<string, readonly { readonly name: string; readonly cid: string }[]>;
  /** Whether a cid's bytes rest in this vessel's content store. */
  readonly casHolds: (cid: string) => boolean;
}

/** One drift, and the act that closes it. */
export interface HoldingFinding {
  readonly bagId: string;
  /** `undeclared` — held, never crossed. `dangling` — declared, body absent. */
  readonly kind: "undeclared" | "dangling";
  /** The path (undeclared) or the declared name (dangling). */
  readonly subject: string;
  /** What a reader should understand, in one line. */
  readonly reading: string;
  /** The command that closes it, or a plain statement where no verb stands yet. */
  readonly correction: string;
}

/** The crossroads tail, DERIVED from the one address that mints it — root-tolerant, so a foreign three-term
 *  root still reads, and spelled in exactly one place so a rename moves both halves together. */
const CROSSROADS_TAIL = CROSSROADS_DOC_URI.slice(CROSSROADS_DOC_URI.indexOf(`/${BAGS_SEGMENT}/`));

/** Whether a bag id names the Nexus crossroads — the one bag whose entries are DECLARATIONS to a Nexus. */
function isCrossroads(bagId: string): boolean {
  return bagId.endsWith(CROSSROADS_TAIL);
}

/**
 * Compare what a vessel holds against what it has declared.
 *
 * Order stays stable — bag by bag, then subject — so two runs on an unchanged vessel read identically and a
 * reader can see what changed between them rather than re-reading the whole list.
 */
export function witnessHoldings(reading: HoldingsReading): HoldingFinding[] {
  const out: HoldingFinding[] = [];

  for (const bagId of [...reading.onDisk.keys()].sort()) {
    const declaredNames = new Set((reading.declared.get(bagId) ?? []).map((d) => d.name));
    for (const path of [...(reading.onDisk.get(bagId) ?? [])].sort()) {
      if (declaredNames.has(path)) continue;
      out.push({
        bagId, kind: "undeclared", subject: path,
        reading: isCrossroads(bagId)
          ? "held on this vessel, declared to no Nexus — a stranger mounting the floor cannot see it"
          : "held on this vessel, absent from the bag's own index",
        correction: isCrossroads(bagId)
          ? "no verb stands for admitting content to a Nexus crossroads yet — the crossing is a declaring act and waits on one"
          : `lares ingest --bag ${bagId}`,
      });
    }
  }

  for (const bagId of [...reading.declared.keys()].sort()) {
    for (const entry of [...(reading.declared.get(bagId) ?? [])].sort((a, b) => a.name.localeCompare(b.name))) {
      if (reading.casHolds(entry.cid)) continue;
      out.push({
        bagId, kind: "dangling", subject: entry.name,
        reading: "declared here, and its bytes rest in no content store this vessel can reach",
        correction: `lares ingest --bag ${bagId} — or withdraw the entry; a name that resolves to nothing tells a reader only that something once stood there`,
      });
    }
  }

  return out;
}

/** The lines a founding or a boot prints. Empty findings print nothing — silence means agreement. */
export function holdingsWitnessLines(findings: readonly HoldingFinding[]): string[] {
  if (findings.length === 0) return [];
  const lines = [`[holdings] ${findings.length} drift(s) between what this vessel holds and what it declares:`];
  for (const f of findings) {
    lines.push(`  ${f.kind === "undeclared" ? "held, undeclared" : "declared, bodiless"}  ${f.subject}`);
    lines.push(`      ${f.reading}`);
    lines.push(`      → ${f.correction}`);
  }
  return lines;
}
