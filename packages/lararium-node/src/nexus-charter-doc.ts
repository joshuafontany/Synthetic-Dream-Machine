/**
 * nexus-charter-doc — the DISK adapter for the `bags/@nexus` charter DOC (the antigen's authority home).
 *
 * The founding-kahu roster lives as data-as-authority: a `.mem` carrier in the `@nexus` residency whose
 * body carries a machine-readable `json nexus-charter` fenced block. This adapter READS that block back
 * into the platform-blind `NexusCharterDoc` (which `nexus-charter-seed.foundingRoster` folds into the
 * antigen roster) and WRITES it in house form. The disk read/write is the node concern; the fold/verify
 * stays in mesh.
 *
 * FAILS CLOSED on the read: an absent file, a missing block, torn JSON, or a wrong-kind payload all read
 * `null` — the roster then folds empty and the antigen stays inert. The parser never guesses a partial doc
 * into authority.
 *
 * The bags dir rides in as a parameter (the CLI supplies `larBagsDir()`), so this module keeps no env
 * coupling and tests against any temp tree.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import {
  NEXUS_CHARTER_DOC_KIND, NEXUS_CHARTER_URI, NEXUS_CHARTER_URI_PATH,
  type NexusCharterDoc, type NexusCharterKahu, type CharterEpoch,
} from "@lararium/mesh";

/** The `@nexus` residency-bag name — the holding slot the charter doc sites under. */
export const NEXUS_BAG = "@nexus" as const;

/** The charter doc's mirror-relative path (holding bag + full uri-path + `.mem` extension). */
export function nexusCharterDocRelPath(): string {
  return join(NEXUS_BAG, `${NEXUS_CHARTER_URI_PATH}.mem`);
}

/** The charter doc's absolute path under a given bags dir. */
export function nexusCharterDocPath(bagsDir: string): string {
  return join(bagsDir, nexusCharterDocRelPath());
}

/** The fenced machine-readable roster block the body carries — extracted whole on read, re-emitted on write. */
const CHARTER_BLOCK_RE = /```json nexus-charter\r?\n([\s\S]*?)\r?\n```/;

/**
 * Coerce a parsed charter-chain payload: `undefined` when absent (a genesis-inception doc without a charter chain), the
 * sentinel `"torn"` when malformed (which reads the WHOLE doc closed — the parser never guesses a partial
 * pre-rotation lineage into authority), or the typed `CharterEpoch[]` when every epoch's shape holds.
 */
function coerceCharterChain(raw: unknown): CharterEpoch[] | "torn" | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) return "torn";
  const chain: CharterEpoch[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) return "torn";
    const e = item as Record<string, unknown>;
    if (!Number.isInteger(e["epoch"]))            return "torn";
    if (typeof e["epochCid"]      !== "string")   return "torn";
    if (typeof e["keySetHash"]    !== "string")   return "torn";
    if (typeof e["nextKeyCommit"] !== "string")   return "torn";
    const prev = e["prevEpochCid"];
    if (prev !== null && typeof prev !== "string") return "torn";
    chain.push({
      epoch:         e["epoch"] as number,
      epochCid:      e["epochCid"] as string,
      keySetHash:    e["keySetHash"] as string,
      nextKeyCommit: e["nextKeyCommit"] as string,
      prevEpochCid:  (prev ?? null) as string | null,
    });
  }
  return chain;
}

/** Coerce an unknown parsed payload into a `NexusCharterDoc`, or null when it fails the shape/kind guards. */
function coerceCharterDoc(parsed: unknown): NexusCharterDoc | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const p = parsed as Record<string, unknown>;
  if (p["kind"] !== NEXUS_CHARTER_DOC_KIND) return null;
  if (!Number.isInteger(p["threshold"]) || (p["threshold"] as number) < 1) return null;
  if (!Array.isArray(p["kahu"])) return null;
  const epoch = p["charterEpochCid"];
  const charterEpochCid = typeof epoch === "string" && epoch.length > 0 ? epoch : null;
  const chain = coerceCharterChain(p["charterChain"]);
  if (chain === "torn") return null;                                // a torn chain reads the whole doc closed
  const kahu: NexusCharterKahu[] = [];
  for (const raw of p["kahu"]) {
    if (typeof raw !== "object" || raw === null) return null;      // a torn member reads the whole doc closed
    const k = raw as Record<string, unknown>;
    if (typeof k["displayName"] !== "string") return null;
    const vk = k["verifyingKey"];
    kahu.push({
      displayName:  k["displayName"],
      verifyingKey: typeof vk === "string" && vk.length > 0 ? vk : null,
    });
  }
  const base: NexusCharterDoc = { kind: NEXUS_CHARTER_DOC_KIND, threshold: p["threshold"] as number, charterEpochCid, kahu };
  return chain === undefined ? base : { ...base, charterChain: chain };
}

/**
 * Read the charter doc under `bagsDir` into a `NexusCharterDoc`, or null (FAIL CLOSED) when it is absent,
 * carries no roster block, or the block is torn / wrong-kind. The caller folds a null through
 * `foundingRoster(null)` to the empty (inert) roster — never a guess.
 */
export function readNexusCharterDoc(bagsDir: string): NexusCharterDoc | null {
  const path = nexusCharterDocPath(bagsDir);
  if (!existsSync(path)) return null;
  let body: string;
  try { body = readFileSync(path, "utf8"); } catch { return null; }
  const m = CHARTER_BLOCK_RE.exec(body);
  if (!m) return null;
  try { return coerceCharterDoc(JSON.parse(m[1]!)); } catch { return null; }
}

/** Render the charter doc as a house-form `.mem` carrier — iam frame + prose + the machine-readable block. */
export function renderNexusCharterDoc(doc: NexusCharterDoc): string {
  const seated = doc.kahu.filter((k) => k.verifyingKey).length;
  const chainDepth = doc.charterChain?.length ?? 0;
  const chainLine = chainDepth > 0 ? ` · pre-rotated chain: ${chainDepth} epoch(s), head at seq ${chainDepth - 1}` : "";
  const block = JSON.stringify(doc, null, 2);
  return `<<~ ? -> ${NEXUS_CHARTER_URI} >>
\`\`\`toml iam
uri-path  = "${NEXUS_CHARTER_URI_PATH}"
file-path = "bags/${nexusCharterDocRelPath()}"
type      = "text/x-memetic-wikitext"
register  = "Canon"
mana      = 19
cacheable = true
retain    = true
role      = "the APPROVED founding-kahu roster — data-as-authority for the Kapae immune antigen"
\`\`\`

<<~ ahu #the-founding-roster >>

! Nexus Charter — the Founding Kahu Roster

The APPROVED roster the Kapae immune antigen reads. A ban/lift act carries ${doc.threshold}-of-${doc.kahu.length} founding-kahu signatures, rooted on the charter epoch below. Each kahu's key is that PersonaGroup's own root-derived verifying key, seated from the vault by \`lares nexus charter seat\` — never invented. An unseated key reads null, and the antigen stays inert until a quorum stands.

Seated: ${seated}/${doc.kahu.length} · threshold ${doc.threshold} · epoch ${doc.charterEpochCid ?? "(unestablished — seat a quorum)"}${chainLine}

\`\`\`json nexus-charter
${block}
\`\`\`

<<~/ahu >>
`;
}

/** Write the charter doc under `bagsDir` in house form (mkdir -p the residency path first). */
export function writeNexusCharterDoc(bagsDir: string, doc: NexusCharterDoc): string {
  const path = nexusCharterDocPath(bagsDir);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, renderNexusCharterDoc(doc), "utf8");
  return path;
}
