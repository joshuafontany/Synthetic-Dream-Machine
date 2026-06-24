/**
 * operator-prerotation.test.ts — the KERI-style pre-rotation commitment hook.
 *
 * Proves the load-bearing, can't-retrofit property: at key GENERATION (before the key
 * ever signs), generateOrLoadOperatorKeypair commits the DIGEST of a freshly-minted next
 * root key (KEL inception, n[0] = sha256(nextKey)). And the no-retrofit guard: loading a
 * key that has no KEL never fakes one (an already-signed key can't gain the guarantee).
 */

import { describe, it, expect } from "vitest";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { generateOrLoadOperatorKeypair } from "../src/operator-key.js";

const freshDataDir = (): string => join(mkdtempSync(join(tmpdir(), "lares-prerot-")), ".lararium");
const idDirOf = (dataDir: string): string => join(dirname(dataDir), ".lararium-identity");
const find = (idDir: string, prefix: string): string | undefined =>
  readdirSync(idDir).find((f) => f.startsWith(prefix));

describe("operator-key pre-rotation commitment (KERI n hook)", () => {
  it("commits the next-key digest at GENERATION (before first use)", async () => {
    const dataDir = freshDataDir();
    try {
      const { verifyingKey } = await generateOrLoadOperatorKeypair(dataDir);
      const idDir = idDirOf(dataDir);

      const kelName  = find(idDir, ".operator-kel");
      const nextName = find(idDir, ".operator-next");
      expect(kelName, "KEL inception written at generation").toBeTruthy();
      expect(nextName, "next-seed written at generation").toBeTruthy();

      const kel  = JSON.parse(readFileSync(join(idDir, kelName!), "utf8"));
      const next = JSON.parse(readFileSync(join(idDir, nextName!), "utf8"));
      expect(kel.t).toBe("icp");
      expect(kel.s).toBe("0");
      expect(kel.k[0]).toBe(verifyingKey);          // current key revealed
      expect(kel.n[0]).toMatch(/^[0-9a-f]{64}$/);   // a sha256 digest

      // The commitment holds: n[0] is the digest of the (hidden) next key — the pre-image
      // exists but is never revealed until a rotation event, which is what defeats a thief.
      const recomputed = createHash("sha256").update(Buffer.from(next.nextVerifyingKey, "hex")).digest("hex");
      expect(kel.n[0]).toBe(recomputed);
      expect(next.nextVerifyingKey).not.toBe(verifyingKey); // next ≠ current
    } finally {
      rmSync(dirname(dataDir), { recursive: true, force: true });
    }
  });

  it("does NOT retrofit a KEL onto a key that lacks one (no-retrofit guard)", async () => {
    const dataDir = freshDataDir();
    try {
      await generateOrLoadOperatorKeypair(dataDir);            // mints key + KEL
      const idDir = idDirOf(dataDir);
      rmSync(join(idDir, find(idDir, ".operator-kel")!));      // simulate a pre-pre-rotation key
      expect(find(idDir, ".operator-kel")).toBeUndefined();

      await expect(generateOrLoadOperatorKeypair(dataDir)).resolves.toBeTruthy(); // load: no throw
      expect(find(idDir, ".operator-kel"), "no KEL retrofitted").toBeUndefined();  // no fake
    } finally {
      rmSync(dirname(dataDir), { recursive: true, force: true });
    }
  });
});
