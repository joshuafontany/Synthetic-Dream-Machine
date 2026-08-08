/**
 * ingest-declaration-guard — a bag's OWN declaration is DISK-OWNED and never becomes a record.
 *
 * Seeded, `iam.mem` would land in the bag's document and then round-trip through the projection — after
 * which a wiki edit could re-home the bag or loosen its cap-tier. A declaration a rendered surface can move
 * is a declaration nothing holds, so the authority stays on disk where `lares bag declare` writes it.
 *
 * The exclusion is ROOT-SCOPED on purpose: a meme deeper in a bag's tree may legitimately carry that name,
 * and excluding it everywhere would silently swallow authored content.
 */
import { afterEach, beforeEach, describe, test, expect } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listCarriers } from "../src/ingest-core.js";
import { BAG_MANIFEST_FILE } from "@lararium/mesh";

describe("a bag's declaration never enters the store", () => {
  let bag: string;
  beforeEach(() => {
    bag = mkdtempSync(join(tmpdir(), "lares-decl-guard-"));
    writeFileSync(join(bag, BAG_MANIFEST_FILE), "the declaration", "utf8");
    writeFileSync(join(bag, "a-meme.mem"), "authored", "utf8");
    mkdirSync(join(bag, "nested"), { recursive: true });
    writeFileSync(join(bag, "nested", BAG_MANIFEST_FILE), "a meme that happens to share the name", "utf8");
    writeFileSync(join(bag, "body.txt"), "x", "utf8");
    writeFileSync(join(bag, "body.txt.meta"), "_lar_cas: yes", "utf8");
  });
  afterEach(() => rmSync(bag, { recursive: true, force: true }));

  test("★ the ROOT declaration is excluded — a wiki edit can never re-home a bag ★", () => {
    const carriers = listCarriers(bag) ?? [];
    expect(carriers).not.toContain(join(bag, BAG_MANIFEST_FILE));
  });

  test("★ a NESTED file of the same name still carries — the exclusion is root-scoped, never a blanket ★", () => {
    const carriers = listCarriers(bag) ?? [];
    expect(carriers).toContain(join(bag, "nested", BAG_MANIFEST_FILE));
  });

  test("authored memes still carry, and a .meta sidecar still rides with its body", () => {
    const carriers = listCarriers(bag) ?? [];
    expect(carriers).toContain(join(bag, "a-meme.mem"));
    expect(carriers).toContain(join(bag, "body.txt"));
    expect(carriers).not.toContain(join(bag, "body.txt.meta"));
  });
});
