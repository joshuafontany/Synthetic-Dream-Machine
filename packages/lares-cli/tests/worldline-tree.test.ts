/**
 * worldline tree — the braid builder (pure) + the read-only KG row reader.
 *
 * The ∥ mark must be a CAUSAL verdict (ITC re-projection from the edge-DAG),
 * never a timestamp guess: a spirit spawned AFTER another's handback reads
 * sequential (the parent merged the child's stamp at the join), while two
 * overlapping spirits read concurrent.
 */
import { describe, test, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  buildWorldlineTree,
  readWorldlineRows,
  renderWorldlineTree,
  type WorldlineKgRow,
} from "../src/commands/worldline.js";

const RUN = "run-1";
const A = `${RUN}.agent-a`;
const B = `${RUN}.agent-b`;
const C = `${RUN}.agent-c`;

/** a: 10:00→10:05 · b: 10:01→10:04 (overlaps a) · c: 10:06→10:07 (after both handbacks). */
const ROWS: WorldlineKgRow[] = [
  { subject: RUN, predicate: "prov:delegation", object: A, valid_from: "2026-06-30T10:00:00Z", valid_to: "2026-06-30T10:05:00Z", turn_key: "uuid-a" },
  { subject: RUN, predicate: "prov:delegation", object: B, valid_from: "2026-06-30T10:01:00Z", valid_to: "2026-06-30T10:04:00Z", turn_key: "uuid-b" },
  { subject: RUN, predicate: "prov:delegation", object: C, valid_from: "2026-06-30T10:06:00Z", valid_to: null, turn_key: "uuid-c" },
];

const BEARINGS = [
  { session: RUN, agentId: null, aim: "lar:///operator.intent.lands/x", yieldUri: "lar:///work.settled.yields/z", wing: "w" },
  { session: RUN, agentId: null, aim: null, yieldUri: null, wing: "w" },
  { session: RUN, agentId: "agent-a", aim: "lar:///spirit.task.opens/a", yieldUri: "lar:///spirit.finding.lands/a", wing: "w" },
  { session: RUN, agentId: "agent-a", aim: null, yieldUri: null, wing: "w" },
  { session: "other-run", agentId: "agent-a", aim: null, yieldUri: null, wing: "w" }, // must NOT join
];

describe("buildWorldlineTree", () => {
  test("builds the braid: 3 spirits under the run-root, one open", () => {
    const t = buildWorldlineTree(RUN, ROWS, BEARINGS);
    expect(t.spirits).toBe(3);
    expect(t.openSpirits).toBe(1);
    expect(t.root.children.map((c) => c.agentId)).toEqual(["agent-a", "agent-b", "agent-c"]);
    expect(t.root.children[2]?.open).toBe(true);
    expect(t.root.children[0]?.turnKey).toBe("uuid-a");
  });

  test("∥ is the ITC verdict: overlapping b reads concurrent, post-handback c reads sequential", () => {
    const t = buildWorldlineTree(RUN, ROWS, []);
    const [a, b, c] = t.root.children;
    expect(a?.concurrentWithPreviousSibling).toBe(false); // first sibling — nothing before it
    expect(b?.concurrentWithPreviousSibling).toBe(true);  // spawned inside a's open interval
    expect(c?.concurrentWithPreviousSibling).toBe(false); // spawned after b's handback merged home
  });

  test("bearing join: per-agent turn counts + first aim / last yield; other runs stay out", () => {
    const t = buildWorldlineTree(RUN, ROWS, BEARINGS);
    expect(t.bearingTurns).toBe(4);
    expect(t.root.turns).toBe(2);
    expect(t.root.aim).toBe("lar:///operator.intent.lands/x");
    expect(t.root.yield).toBe("lar:///work.settled.yields/z");
    const a = t.root.children[0]!;
    expect(a.turns).toBe(2);
    expect(a.yield).toBe("lar:///spirit.finding.lands/a");
    expect(t.root.children[1]?.turns).toBe(0); // un-harvested spirit — honest zero, never invented
  });

  test("renders the braid with the ∥ mark and the OPEN interval", () => {
    const text = renderWorldlineTree(buildWorldlineTree(RUN, ROWS, BEARINGS));
    expect(text).toContain("3 spirits (1 open)");
    expect(text).toContain("∥ agent-b");
    expect(text).toContain("→ OPEN");
    expect(text).not.toContain("∥ agent-c");
  });
});

describe("readWorldlineRows (read-only sqlite)", () => {
  test("reads lares-worldline rows by run prefix; foreign adapters stay out", () => {
    const dir = mkdtempSync(join(tmpdir(), "lar-worldline-test-"));
    const kg = join(dir, "knowledge_graph.sqlite3");
    const db = new DatabaseSync(kg);
    db.exec(`CREATE TABLE triples (
      id TEXT PRIMARY KEY, subject TEXT, predicate TEXT, object TEXT,
      valid_from TEXT, valid_to TEXT, confidence REAL, source_closet TEXT,
      source_file TEXT, source_drawer_id TEXT, adapter_name TEXT, extracted_at TEXT)`);
    const ins = db.prepare("INSERT INTO triples (id,subject,predicate,object,valid_from,valid_to,source_drawer_id,adapter_name) VALUES (?,?,?,?,?,?,?,?)");
    ins.run("1", RUN, "prov:delegation", A, "2026-06-30T10:00:00Z", null, "uuid-a", "lares-worldline");
    ins.run("2", RUN, "prov:communication", A, "2026-06-30T10:02:00Z", null, null, "lares-worldline");
    ins.run("3", "max", "child_of", "alice", null, null, null, null); // a foreign row — never ours
    db.close();

    const { rows, runs } = readWorldlineRows(kg, "run-");
    expect(rows).toHaveLength(2);
    expect(runs).toEqual([RUN]);
    expect(rows[0]?.turn_key).toBe("uuid-a");
    const tree = buildWorldlineTree(RUN, rows, []);
    expect(tree.spirits).toBe(1);
    expect(tree.root.children[0]?.injects).toBe(1);
  });
});
