/**
 * crossroads-cry — what stands on a Nexus crossroads, and what takes it down.
 *
 * ── ONE SHAPE, THREE CONTENTS, TWO AUTHORITIES ──────────────────────────────────────────────────
 * Everything that reaches a crossroads arrives as a KŪKALA — a public cry pinned to the board. Nothing is
 * ever removed from it; the board only grows, and what a reader sees is a FOLD over everything cried.
 *
 *   · a NOTICE      — "this name stands here", the ordinary posting (a Handle, a heraldry, a body index).
 *   · a TOMBSTONE   — "I take mine down", the author withdrawing their own cry. Still a cry: withdrawal is
 *                     as public as posting, because a board where things vanish quietly cannot be read.
 *   · a KĀPAE       — "this does not stand here", the Nexus refusing. Remove-wins, and it shadows the
 *                     SUBJECT rather than one cry, so re-pinning does not resurrect it.
 *
 * The two authorities never blur. An author governs only their OWN cries — a tombstone over someone else's
 * notice does nothing at all, and the fold says so by ignoring it rather than by trusting the writer. The
 * Nexus governs the board: a kāpae outranks any cry, before or after.
 *
 * ── WHY KĀPAE MUST DEFEAT A LATER CRY ───────────────────────────────────────────────────────────
 * Two islands with no shared now cannot agree on which act came first. If a later cry could outlive a
 * kāpae, anyone refused at the Gate re-pins from a partition and stands again — the refusal would hold only
 * against people who accept it. Remove-wins is what makes a Gate a Gate rather than a request, and canon
 * already rules it this way for membership (kāpae: remove-wins, and re-linking a cut reads irreversible).
 *
 * ── WHAT THIS DELIBERATELY LEAVES OUT ───────────────────────────────────────────────────────────
 * No act is performed here and no authority is checked against a key — this folds a board that has already
 * been written. Who may sign a Nexus kāpae is the charter quorum's business, and a cry's signature is the
 * board writer's; the fold reads the record and reports what stands.
 *
 * Meme: lar:///ha.ka.ba/lararium/docs/crossroads
 */

/** One cry on the board. The board holds these and nothing else; the reading is a fold over them. */
export type CrossroadsCry =
  /** A notice: this author cries this subject here. */
  | { readonly kind: "notice"; readonly cryId: string; readonly subject: string; readonly author: string }
  /** A withdrawal: this author takes down a cry of THEIR OWN, named by its id. */
  | { readonly kind: "tombstone"; readonly cryId: string; readonly withdraws: string; readonly author: string }
  /** A refusal: the Nexus shadows a SUBJECT, whatever cries it now or later. */
  | { readonly kind: "kapae"; readonly cryId: string; readonly subject: string };

/** A notice that survives the fold, and what a reader may say about it. */
export interface StandingNotice {
  readonly cryId: string;
  readonly subject: string;
  readonly author: string;
}

/**
 * What stands on the board, read from everything ever cried to it.
 *
 * Order-independent: the same cries in any order fold to the same reading, because no rule here consults
 * which arrived first. Two islands that have seen the same cries agree without having agreed on a clock.
 */
export function standingNotices(cries: readonly CrossroadsCry[]): StandingNotice[] {
  const refused = new Set<string>();
  for (const c of cries) if (c.kind === "kapae") refused.add(c.subject);

  // A withdrawal counts only over its author's own cry, so the pairing carries the author, never the id alone.
  const withdrawn = new Set<string>();
  const authorOf = new Map<string, string>();
  for (const c of cries) if (c.kind === "notice") authorOf.set(c.cryId, c.author);
  for (const c of cries) {
    if (c.kind !== "tombstone") continue;
    if (authorOf.get(c.withdraws) === c.author) withdrawn.add(c.withdraws);
  }

  return cries
    .filter((c): c is Extract<CrossroadsCry, { kind: "notice" }> => c.kind === "notice")
    .filter((c) => !refused.has(c.subject) && !withdrawn.has(c.cryId))
    .map((c) => ({ cryId: c.cryId, subject: c.subject, author: c.author }));
}

/** Whether a subject stands refused at this Nexus — asked before crying, so a refused cry is not wasted. */
export function subjectRefused(cries: readonly CrossroadsCry[], subject: string): boolean {
  return cries.some((c) => c.kind === "kapae" && c.subject === subject);
}
