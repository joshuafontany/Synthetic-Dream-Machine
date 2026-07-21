import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSensoriumManifest, writeManifest } from "../src/sensorium.js";
import { acceptPetName, attachPetName, listPetNames, proposePetName } from "../src/sensorium-petnames.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "lar-petnames-"));
  writeManifest(root, buildSensoriumManifest(root, {
    sensorium: "working-handle", lar: "lar:///test", caps: { content: { absDir: join(root, "content"), engine: "content" } },
  }));
});

afterEach(() => { rmSync(root, { recursive: true, force: true }); });

describe("sensorium pet-names", () => {
  test("an operator attaches a local accepted name without changing the manifest", () => {
    const name = attachPetName(root, { subject: "root", label: "memory" });
    expect(name.status).toBe("accepted");
    expect(name.origin).toEqual({ kind: "operator" });
    expect(name.basis.has).toEqual(["content"]);
    expect(listPetNames(root)).toEqual([name]);
  });

  test("a projection proposes a name and an operator accepts it without changing its evidence", () => {
    const proposal = proposePetName(root, {
      subject: "cid:abc", label: "the first turning", projection: "entity-graph", evidence: ["cid:abc", "cid:def"],
    });
    const accepted = acceptPetName(root, proposal.id);
    expect(accepted).toMatchObject({ id: proposal.id, status: "accepted", origin: proposal.origin });
    expect(accepted!.accepted).toEqual(expect.any(String));
    expect(acceptPetName(root, proposal.id)).toEqual(accepted);
  });

  test("a pet-name refuses to attach to a bare directory", () => {
    const bare = mkdtempSync(join(tmpdir(), "lar-petnames-bare-"));
    try {
      expect(() => attachPetName(bare, { subject: "root", label: "nope" })).toThrow("no sensorium manifest");
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });
});
