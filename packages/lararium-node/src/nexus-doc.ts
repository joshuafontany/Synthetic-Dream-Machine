/**
 * nexus-doc — the DISK adapter for the Nexus SEAL FILE, which carries THREE joints at three cadences.
 *
 * THE JOINTS, and why they ride separate blocks. One word once covered six entities, separated not by
 * content but by different ceremony, threshold, RATE and authority (canon `cabal-realm#six-joints`). Three
 * of them live here, and their amendment costs differ by orders:
 *
 *   · SEAL     — the pre-rotated key-epoch lineage. A rotation ceremony over a k-of-n of current keys. Rare.
 *   · KAHU     — the founding roster + its threshold. Moves when a steward seat moves.
 *   · PRACTICE — federation posture · join policy · admission dials. An ordinary governance act, fast and
 *                reversible, and the one a single hand may turn.
 *
 * WHY THREE BLOCKS RATHER THAN ONE. A single block forced every writer through a whole-doc rewrite, so a
 * posture flip re-emitted the seal lineage's bytes on its way past, and two hands touching different joints
 * clobbered each other last-writer-wins. Each narrow writer below re-reads the carrier at write time and
 * swaps ONLY its own fence, carrying the other joints through as OPAQUE TEXT it never deserializes. That
 * makes the corruption inexpressible rather than merely discouraged: a practice write holds no parsed seal
 * to get wrong.
 *
 * The composed `readNexusDoc` still folds all three into one `NexusDoc`, because a reader legitimately wants
 * the whole view — the WRITE must stay narrow, never the read.
 *
 * FAILS CLOSED on the read: an absent file, a missing seal or kahu block, torn JSON, or a wrong-kind payload
 * all read `null` — the roster then folds empty and the antigen stays inert. The parser never guesses a
 * partial doc into authority. A torn PRACTICE block never closes the doc, so the fastest-cadence joint can
 * never take the slower ones down with it.
 *
 * The seal home rides in as a parameter (the CLI supplies `larSealHome()`), so this module keeps no env
 * coupling and tests against any temp tree.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { CARRIER_TYPE } from "@lararium/mesh/carrier-type";
import { join, dirname } from "node:path";
import {
  NEXUS_DOC_DOMAIN, NEXUS_CHARTER_URI, NEXUS_CHARTER_URI_PATH,
  type NexusDoc, type NexusCharterKahu, type SealEpoch,
  type FederationPosture, type CabalJoinPolicy, type AdmissionDials,
} from "@lararium/mesh";

/** The seal file's name inside the seal home — one file, read by an operator's own eyes. */
export function nexusCharterDocRelPath(): string {
  return "founding-roster.mem";
}

/**
 * The seal file's absolute path under a SEAL HOME (`larSealHome()` — `<lares>/nexus`, per-operator).
 *
 * It takes a home rather than reading one, so this module keeps no env dependency and a test stands the
 * seal wherever it likes. The home rides per-operator state rather than the corpus tree: a Nexus belongs
 * to the operators who founded it, never to whoever cloned the code.
 */
export function nexusCharterDocPath(sealHome: string): string {
  // FAIL LOUD on an absent home. The alternative is `join(undefined, …)` dying as a TypeError about a "path
  // argument" — an error that names the filesystem primitive and hides the wiring fault, costing a reader the
  // whole trail back to the caller that forgot to designate a home. One guard here covers every read and
  // write path, so no caller has to remember its own.
  if (typeof sealHome !== "string" || sealHome.length === 0) {
    throw new Error("nexusCharterDocPath: no seal home supplied — a caller must NAME one (the CLI passes `larSealHome()`).");
  }
  return join(sealHome, nexusCharterDocRelPath());
}

// ── the three fences ──────────────────────────────────────────────────────────────────────────────

/** One joint per fence — a narrow writer swaps its own and never parses its neighbours. */
export const SEAL_BLOCK     = "nexus-seal"     as const;
export const KAHU_BLOCK     = "nexus-kahu"     as const;
export const PRACTICE_BLOCK = "nexus-practice" as const;

/** The SEAL joint on disk — the epoch head plus the pre-rotated lineage behind it. */
export interface NexusSealBlock {
  readonly kind:         typeof NEXUS_DOC_DOMAIN;
  readonly sealEpochCid: string | null;
  readonly sealLineage?: readonly SealEpoch[];
}

/** The KAHU joint on disk — the founding roster and the quorum it answers at. */
export interface NexusKahuBlock {
  readonly threshold: number;
  readonly kahu:      readonly NexusCharterKahu[];
}

/** The PRACTICE joint on disk — the dials one steward hand may turn, at their own fast cadence. */
export interface NexusPracticeBlock {
  readonly federationPosture?: FederationPosture;
  readonly joinPolicy?:        CabalJoinPolicy;
  readonly admissionDials?:    AdmissionDials;
}

function fenceRe(name: string): RegExp {
  return new RegExp("```json " + name + "\\r?\\n([\\s\\S]*?)\\r?\\n```");
}

/** Pull one fence's payload, or null when the fence stands absent or its JSON reads torn. */
function readFence(body: string, name: string): unknown | null {
  const m = fenceRe(name).exec(body);
  if (!m) return null;
  try { return JSON.parse(m[1]!); } catch { return null; }
}

/**
 * Swap ONE fence's payload inside a body, leaving every other byte untouched.
 *
 * The neighbours ride through as opaque text — this never parses them, so a writer cannot corrupt a joint it
 * does not own. A body missing the named fence gains it, so a carrier written before a joint existed grows
 * that joint rather than failing.
 */
function swapFence(body: string, name: string, payload: unknown): string {
  const block = "```json " + name + "\n" + JSON.stringify(payload, null, 2) + "\n```";
  return fenceRe(name).test(body) ? body.replace(fenceRe(name), block) : `${body.trimEnd()}\n\n${block}\n`;
}

// ── coercion ──────────────────────────────────────────────────────────────────────────────────────

/**
 * Coerce a parsed seal-lineage payload: `undefined` when absent (a genesis-inception doc with no lineage
 * yet), the sentinel `"torn"` when malformed (which reads the WHOLE doc closed — the parser never guesses a
 * partial pre-rotation lineage into authority), or the typed `SealEpoch[]` when every epoch's shape holds.
 */
function coerceSealLineage(raw: unknown): SealEpoch[] | "torn" | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) return "torn";
  const lineage: SealEpoch[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) return "torn";
    const e = item as Record<string, unknown>;
    if (!Number.isInteger(e["epoch"]))             return "torn";
    if (typeof e["epochCid"]      !== "string")    return "torn";
    if (typeof e["keySetHash"]    !== "string")    return "torn";
    if (typeof e["nextKeyCommit"] !== "string")    return "torn";
    const prev = e["prevEpochCid"];
    if (prev !== null && typeof prev !== "string") return "torn";
    lineage.push({
      epoch:         e["epoch"] as number,
      epochCid:      e["epochCid"] as string,
      keySetHash:    e["keySetHash"] as string,
      nextKeyCommit: e["nextKeyCommit"] as string,
      prevEpochCid:  (prev ?? null) as string | null,
    });
  }
  return lineage;
}

/** Fold the three read blocks into one composed `NexusDoc`, or null when seal or kahu fails its guards. */
function composeDoc(seal: unknown, kahu: unknown, practice: unknown): NexusDoc | null {
  if (typeof seal !== "object" || seal === null) return null;
  const s = seal as Record<string, unknown>;
  if (s["kind"] !== NEXUS_DOC_DOMAIN) return null;
  const epoch = s["sealEpochCid"];
  const sealEpochCid = typeof epoch === "string" && epoch.length > 0 ? epoch : null;
  const lineage = coerceSealLineage(s["sealLineage"]);
  if (lineage === "torn") return null;                            // a torn lineage reads the whole doc closed

  if (typeof kahu !== "object" || kahu === null) return null;
  const k = kahu as Record<string, unknown>;
  if (!Number.isInteger(k["threshold"]) || (k["threshold"] as number) < 1) return null;
  if (!Array.isArray(k["kahu"])) return null;
  const seats: NexusCharterKahu[] = [];
  for (const raw of k["kahu"]) {
    if (typeof raw !== "object" || raw === null) return null;     // a torn seat reads the whole doc closed
    const seat = raw as Record<string, unknown>;
    if (typeof seat["displayName"] !== "string") return null;
    const vk = seat["verifyingKey"];
    seats.push({
      displayName:  seat["displayName"] as string,
      verifyingKey: typeof vk === "string" && vk.length > 0 ? vk : null,
    });
  }

  // PRACTICE never closes the doc — a torn dial folds to its fail-closed default downstream, so the
  // fastest-cadence joint can never take the slow-cadence joints with it. The posture reads only the exact
  // literal "open"; anything else folds PRIVATE via `federationPostureFromDoc`, because a torn posture must
  // never silently open the mesh.
  const p = (typeof practice === "object" && practice !== null ? practice : {}) as Record<string, unknown>;
  const posture = p["federationPosture"] === "open" ? ("open" as const) : undefined;

  const base: NexusDoc = { kind: NEXUS_DOC_DOMAIN, threshold: k["threshold"] as number, sealEpochCid, kahu: seats };
  const withLineage = lineage === undefined ? base : { ...base, sealLineage: lineage };
  return posture === undefined ? withLineage : { ...withLineage, federationPosture: posture };
}

// ── read ──────────────────────────────────────────────────────────────────────────────────────────

/** The raw carrier body, or null when nothing stands on disk. */
function readBody(bagsDir: string): string | null {
  const path = nexusCharterDocPath(bagsDir);
  if (!existsSync(path)) return null;
  try { return readFileSync(path, "utf8"); } catch { return null; }
}

/**
 * Read the `nexus` doc into a composed `NexusDoc`, or null (FAIL CLOSED) when it stands absent, carries no
 * seal or kahu block, or either reads torn. The caller folds a null through `foundingRoster(null)` to the
 * empty (inert) roster — never a guess.
 */
export function readNexusDoc(bagsDir: string): NexusDoc | null {
  const body = readBody(bagsDir);
  if (body === null) return null;
  return composeDoc(readFence(body, SEAL_BLOCK), readFence(body, KAHU_BLOCK), readFence(body, PRACTICE_BLOCK));
}

// ── render ────────────────────────────────────────────────────────────────────────────────────────

/** Render the whole carrier in house form — the meta frame, the prose, and one fenced block per joint. */
export function renderNexusDoc(doc: NexusDoc): string {
  const seated = doc.kahu.filter((k) => k.verifyingKey).length;
  const depth  = doc.sealLineage?.length ?? 0;
  const lineageLine = depth > 0 ? ` · pre-rotated lineage: ${depth} epoch(s), head at seq ${depth - 1}` : "";
  const seal: NexusSealBlock = doc.sealLineage === undefined
    ? { kind: NEXUS_DOC_DOMAIN, sealEpochCid: doc.sealEpochCid }
    : { kind: NEXUS_DOC_DOMAIN, sealEpochCid: doc.sealEpochCid, sealLineage: doc.sealLineage };
  const kahu: NexusKahuBlock = { threshold: doc.threshold, kahu: doc.kahu };
  const practice: NexusPracticeBlock =
    doc.federationPosture === undefined ? {} : { federationPosture: doc.federationPosture };

  return `<<~ ? -> ${NEXUS_CHARTER_URI} >>
\`\`\`toml meta
uri-path  = "${NEXUS_CHARTER_URI_PATH}"
file-path = "<lares>/nexus/${nexusCharterDocRelPath()}"
type      = ${JSON.stringify(CARRIER_TYPE)}
register  = "Canon"
mana      = 19
cacheable = true
retain    = true
role      = "the nexus doc — three joints at three cadences: the SEAL lineage (rare, a rotation ceremony), the KAHU roster (steward seats), and the PRACTICE dials (fast, one hand). Each rides its own block and its own narrow writer."
\`\`\`

<<~ ahu #the-three-joints >>

! The nexus Doc — seal · kahu · practice

Three joints ride here at three cadences, each in its own block, because a single block forced every writer through a whole-doc rewrite: a posture flip re-emitted the seal lineage on its way past, and two hands touching different joints clobbered each other. Each narrow writer swaps ONLY its own fence and carries the rest through as opaque text.

The KAHU block holds the APPROVED roster the Kapae immune antigen reads. A ban/lift act carries ${doc.threshold}-of-${doc.kahu.length} founding-kahu signatures, rooted on the seal epoch below. Each kahu's key reads that PersonaGroup's own root-derived verifying key, seated from the vault by \`lares nexus seal seat\` — never invented. An unseated key reads null, and the antigen stays inert until a quorum stands.

Seated: ${seated}/${doc.kahu.length} · threshold ${doc.threshold} · epoch ${doc.sealEpochCid ?? "(unestablished — seat a quorum)"}${lineageLine}

\`\`\`json ${SEAL_BLOCK}
${JSON.stringify(seal, null, 2)}
\`\`\`

\`\`\`json ${KAHU_BLOCK}
${JSON.stringify(kahu, null, 2)}
\`\`\`

\`\`\`json ${PRACTICE_BLOCK}
${JSON.stringify(practice, null, 2)}
\`\`\`

<<~/ahu >>
`;
}

// ── write ─────────────────────────────────────────────────────────────────────────────────────────

function writeBody(bagsDir: string, body: string): string {
  const path = nexusCharterDocPath(bagsDir);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, "utf8");
  return path;
}

/**
 * Write the WHOLE carrier — the founding act's own writer, and the only one that legitimately touches every
 * joint at once. A field-level change MUST route through a narrow writer below instead.
 */
export function writeNexusDoc(bagsDir: string, doc: NexusDoc): string {
  return writeBody(bagsDir, renderNexusDoc(doc));
}

/**
 * Swap ONE joint's block, re-reading the carrier at write time so a concurrent write to a DIFFERENT joint
 * survives. The neighbours never get parsed, so this cannot corrupt them; `seed` renders a fresh carrier when
 * nothing stands on disk yet.
 */
function writeJoint(bagsDir: string, block: string, payload: unknown, seed: NexusDoc): string {
  const body = readBody(bagsDir) ?? renderNexusDoc(seed);
  return writeBody(bagsDir, swapFence(body, block, payload));
}

/** Write the SEAL joint alone — a rotation ceremony's reach, touching no roster and no dial. */
export function writeNexusSeal(bagsDir: string, seal: NexusSealBlock, seed: NexusDoc): string {
  return writeJoint(bagsDir, SEAL_BLOCK, seal, seed);
}

/** Write the KAHU joint alone — a steward seat's reach, touching no lineage and no dial. */
export function writeNexusKahu(bagsDir: string, kahu: NexusKahuBlock, seed: NexusDoc): string {
  return writeJoint(bagsDir, KAHU_BLOCK, kahu, seed);
}

/**
 * Write the PRACTICE joint alone — the fast-cadence dials one hand may turn.
 *
 * This one carries the sharpest reason for the split: the cheapest act in the house MUST NOT reach the
 * dearest joint. A posture flip that re-emitted the seal lineage's bytes would rewrite it; this writer
 * cannot reach it.
 */
export function writeNexusPractice(bagsDir: string, practice: NexusPracticeBlock, seed: NexusDoc): string {
  return writeJoint(bagsDir, PRACTICE_BLOCK, practice, seed);
}
