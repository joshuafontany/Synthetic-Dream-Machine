/**
 * node-persona-admit-store.test.ts — the PER-VESSEL multitude-view (never fleet-syncs) + the consume-once
 * airgapped pending state.
 *
 * Proven:
 *   · NEVER-SYNCS (structural) — the view rides a LOCAL 0o600 file under the identity home; the module imports
 *     no Repo / bag / board shore, so nothing it writes can reach the wire,
 *   · record → list round-trips; a re-admission at a LATER expiry supersedes, a STALE one never rolls it back,
 *   · CONSUME-ONCE — a stashed enrollment secret / sent memo is returned exactly once, then dropped (a secret
 *     never lingers past the one hop it enables); a second take reads null.
 */
import { PERSONA_GRANT_DOMAIN, PERSONA_JOIN_DOMAIN } from "@lararium/mesh";
import { afterEach, beforeEach, describe, test, expect } from "vitest";
import { mkdtempSync, rmSync, readFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  recordAdmittedPersona, listAdmittedPersonas, isPersonaAdmitted,
  stashEnrollmentSecret, takeEnrollmentSecret, stashSentMemo, takeSentMemo, clearPersonaAdmitPending,
} from "../src/node-persona-admit-store.js";
import type { JoinRecord, EnrollmentSecret, SentGrantMemo } from "@lararium/mesh";

function joinRec(prefix: string, expiry: number): JoinRecord {
  return {
    kind: PERSONA_JOIN_DOMAIN,
    personaRef: { prefix, verifyingKey: "aa".repeat(32) },
    targetVesselId: "bb".repeat(32),
    granterKey: "aa".repeat(32),
    nonceA: "01".repeat(16), nonceB: "02".repeat(16),
    expiry, grantSig: "cc".repeat(64),
  };
}

describe("node-persona-admit-store — the per-vessel multitude-view", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "lares-persona-admit-")); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  test("record → list round-trips; a later-expiry re-admission supersedes, a stale one does not", () => {
    expect(listAdmittedPersonas(dir)).toEqual([]);
    recordAdmittedPersona(joinRec("Epersona_A", 1000), dir);
    recordAdmittedPersona(joinRec("Epersona_B", 2000), dir);
    expect(listAdmittedPersonas(dir).map((j) => j.personaRef.prefix)).toEqual(["Epersona_A", "Epersona_B"]);
    expect(isPersonaAdmitted("Epersona_A", dir)).toBe(true);
    expect(isPersonaAdmitted("Epersona_Z", dir)).toBe(false);

    // A re-admission with a LATER expiry supersedes.
    recordAdmittedPersona(joinRec("Epersona_A", 5000), dir);
    expect(listAdmittedPersonas(dir).find((j) => j.personaRef.prefix === "Epersona_A")!.expiry).toBe(5000);
    // A STALE (earlier-expiry) re-admission never rolls the view back.
    recordAdmittedPersona(joinRec("Epersona_A", 3000), dir);
    expect(listAdmittedPersonas(dir).find((j) => j.personaRef.prefix === "Epersona_A")!.expiry).toBe(5000);
  });

  test("the view is a LOCAL 0o600 file — never a bag/board (never-syncs, structural)", () => {
    recordAdmittedPersona(joinRec("Epersona_A", 1000), dir);
    const files = readdirSync(dir);
    expect(files).toContain(".persona-admissions.json");
    // POSIX perms: owner-only (best-effort assert; a non-POSIX fs skips the chmod).
    const mode = statSync(join(dir, ".persona-admissions.json")).mode & 0o777;
    if (process.platform !== "win32") expect(mode).toBe(0o600);
    // The file holds ONLY the local view — no automerge url, no bag id, no board key.
    const raw = readFileSync(join(dir, ".persona-admissions.json"), "utf8");
    expect(raw).not.toContain("automerge:");
    expect(raw).not.toContain("crossroads");
  });

  test("CONSUME-ONCE: a stashed enrollment secret is returned once, then dropped", () => {
    const secret: EnrollmentSecret = {
      ephemeralSecret: new Uint8Array(32).fill(4),
      targetVesselId: "bb".repeat(32), nonceB: "02".repeat(16), expiry: 9999,
    };
    stashEnrollmentSecret("ephpub01", secret, dir);
    const taken = takeEnrollmentSecret("ephpub01", dir);
    expect(taken).not.toBeNull();
    expect([...taken!.ephemeralSecret]).toEqual([...secret.ephemeralSecret]);   // hex round-trip intact
    expect(taken!.nonceB).toBe(secret.nonceB);
    // A SECOND take reads null — the secret is gone (never lingers past its one hop).
    expect(takeEnrollmentSecret("ephpub01", dir)).toBeNull();
  });

  test("CONSUME-ONCE: a stashed sent memo is returned once, then dropped; reset clears pending", () => {
    const memo: SentGrantMemo = {
      transcript: {
        kind: PERSONA_GRANT_DOMAIN,
        personaRef: { prefix: "Epersona_A", verifyingKey: "aa".repeat(32) },
        targetVesselId: "bb".repeat(32), nonceB: "02".repeat(16), nonceA: "0a".repeat(16), expiry: 9999,
      },
      grantSig: "cc".repeat(64),
    };
    stashSentMemo(memo, dir);
    expect(takeSentMemo("0a".repeat(16), dir)?.grantSig).toBe("cc".repeat(64));
    expect(takeSentMemo("0a".repeat(16), dir)).toBeNull();

    // reset drops any in-flight pending secrets/memos.
    stashSentMemo(memo, dir);
    clearPersonaAdmitPending(dir);
    expect(takeSentMemo("0a".repeat(16), dir)).toBeNull();
  });
});
