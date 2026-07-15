/**
 * L6 doctor — the read-only sweep enumerates a store's docs and tallies the probe verdicts
 * without mutating anything. The mock probe pins the classification + report shape.
 */
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { sweepDocs, type DocLoadProbe, type ProbeResult } from "@lararium/mesh";
import { describe, expect, test } from "vitest";

import { enumerateStoreDocs, formatDoctorReport } from "../src/doctor.js";

function seedDoc(root: string, documentId: string): void {
  const base = join(root, documentId.slice(0, 2), documentId.slice(2));
  mkdirSync(join(base, "snapshot"), { recursive: true });
  writeFileSync(join(base, "snapshot", "head0"), Uint8Array.from([0x85, 0x6f, 0x4a, 0x83]));
}

describe("enumerateStoreDocs", () => {
  test("finds sharded docs, skips aux dirs", () => {
    const root = mkdtempSync(join(tmpdir(), "lares-doctor-"));
    seedDoc(root, "44u4T4NwgkkCoBdze4gyY8pFSNQC");
    seedDoc(root, "ofJubP6fZHdGgKcAtYjsMwtZk95");
    // aux dirs that must NOT read as docs
    mkdirSync(join(root, "cas"), { recursive: true });
    mkdirSync(join(root, "daemon", "44", "sub"), { recursive: true });
    writeFileSync(join(root, "catalog-url"), "automerge:xyz");

    const ids = enumerateStoreDocs(root).sort();
    expect(ids).toEqual(["44u4T4NwgkkCoBdze4gyY8pFSNQC", "ofJubP6fZHdGgKcAtYjsMwtZk95"]);
  });
});

describe("sweepDocs", () => {
  const mockProbe = (verdicts: Record<string, ProbeResult["status"]>): DocLoadProbe => ({
    probe: async (documentId) => {
      const status = verdicts[documentId] ?? "ok";
      return status === "ok"
        ? { documentId, status }
        : { documentId, status, reason: "mock condemn" };
    },
  });

  test("tallies healthy vs condemned and marks degraded", async () => {
    const report = await sweepDocs(
      ["aaa1", "bbb2", "ccc3"],
      mockProbe({ bbb2: "aborted" }),
      { concurrency: 2 },
    );
    expect(report.total).toBe(3);
    expect(report.healthy).toBe(2);
    expect(report.condemned).toBe(1);
    expect(report.degraded).toBe(true);
  });

  test("all-clean store reports not degraded", async () => {
    const report = await sweepDocs(["aaa1", "bbb2"], mockProbe({}));
    expect(report.degraded).toBe(false);
    const text = formatDoctorReport(report, "/tmp/store");
    expect(text).toMatch(/all clean/);
  });
});
