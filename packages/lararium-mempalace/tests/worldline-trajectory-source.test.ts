/**
 * The LIVE content-graph trajectory source. The worldline-trajectory verb's production turn
 * source is the CONTENT graph: a handle's drawers (WHERE lar_agent_handle = handle), each carrying its
 * EXACT capture `lar_verbatim_sha` (full fidelity, not a transcript-text re-hash). This proves:
 *   - the thin app-layer metadata where-filter (drawersWhere / turnsForHandle) over the read-only
 *     sidecar (paged list_drawers + client-side metadata equality), against a fake NDJSON sidecar;
 *   - the pure order→stubs functor (orderHandleTurnsToStubs) — the within-handle happened-before;
 *   - graceful empty when a handle has no drawers.
 */
import { describe, it, expect, afterEach } from "vitest";
import { fileURLToPath } from "node:url";
import { MempalaceClient, orderHandleTurnsToStubs, type HandleTurn } from "../src/mempalace-client.js";

const FAKE = fileURLToPath(new URL("./fixtures/fake-sidecar-handle.mjs", import.meta.url));

function newClient(): MempalaceClient {
  return new MempalaceClient({ submoduleRoot: process.cwd(), command: "node", args: [FAKE] });
}

describe("orderHandleTurnsToStubs — the pure order→stubs functor", () => {
  it("sorts by filed_at then assigns a monotonic tickCounter (out-of-order in → ordered out)", () => {
    const turns: HandleTurn[] = [
      { drawerId: "d2", verbatimSha: "sha-ccc", filedAt: "2026-06-29T00:02:00Z", chunkIndex: 0 },
      { drawerId: "d0", verbatimSha: "sha-aaa", filedAt: "2026-06-29T00:00:00Z", chunkIndex: 0 },
      { drawerId: "d1", verbatimSha: "sha-bbb", filedAt: "2026-06-29T00:01:00Z", chunkIndex: 0 },
    ];
    expect(orderHandleTurnsToStubs(turns)).toEqual([
      { verbatimSha: "sha-aaa", tickCounter: 0 },
      { verbatimSha: "sha-bbb", tickCounter: 1 },
      { verbatimSha: "sha-ccc", tickCounter: 2 },
    ]);
  });

  it("lar_ffz address (when stamped) outranks filed_at; chunk_index breaks a filed_at tie", () => {
    const turns: HandleTurn[] = [
      { drawerId: "dB", verbatimSha: "sha-2", filedAt: "2026-06-29T00:00:00Z", chunkIndex: 1 },
      { drawerId: "dA", verbatimSha: "sha-1", filedAt: "2026-06-29T00:00:00Z", chunkIndex: 0 },
      { drawerId: "dFfz", verbatimSha: "sha-ffz", ffz: "aaa", filedAt: "2026-06-29T09:00:00Z" },
    ];
    // ffz="aaa" sorts before the empty-ffz rows; the two same-filed_at rows order by chunk_index.
    expect(orderHandleTurnsToStubs(turns).map((s) => s.verbatimSha)).toEqual(["sha-ffz", "sha-1", "sha-2"]);
  });

  it("drops turns with no verbatim sha (no cross-graph join key)", () => {
    const turns: HandleTurn[] = [
      { drawerId: "d0", verbatimSha: "", filedAt: "2026-06-29T00:00:00Z" },
      { drawerId: "d1", verbatimSha: "sha-x", filedAt: "2026-06-29T00:01:00Z" },
    ];
    expect(orderHandleTurnsToStubs(turns)).toEqual([{ verbatimSha: "sha-x", tickCounter: 0 }]);
  });
});

describe("turnsForHandle — the live content-graph where-filter (fake NDJSON sidecar)", () => {
  let client: MempalaceClient;
  afterEach(async () => { await client?.stop(); });

  it("a handle → its drawers WHERE lar_agent_handle = handle, full-fidelity verbatim_sha (paged)", async () => {
    client = newClient();
    await client.start();
    // pageSize:2 forces the pagination loop; wing scopes the scan.
    const turns = await client.turnsForHandle("sessABC.xyz", { wing: "wing_code__spirits", pageSize: 2 });
    // Three drawers for this handle; the fourth (sessABC.other) is excluded by the where-filter.
    expect(turns).toHaveLength(3);
    expect(new Set(turns.map((t) => t.verbatimSha))).toEqual(new Set(["sha-aaa", "sha-bbb", "sha-ccc"]));
    // The stubs ride the EXACT content-graph shas (not transcript text) in worldline order.
    const stubs = orderHandleTurnsToStubs(turns);
    expect(stubs).toEqual([
      { verbatimSha: "sha-aaa", tickCounter: 0 },
      { verbatimSha: "sha-bbb", tickCounter: 1 },
      { verbatimSha: "sha-ccc", tickCounter: 2 },
    ]);
  });

  it("drawersWhere filters by an arbitrary flat metadata clause", async () => {
    client = newClient();
    await client.start();
    const rows = await client.drawersWhere({ lar_agent_handle: "sessABC.other" }, { wing: "wing_code__spirits" });
    expect(rows.map((d) => d.drawer_id)).toEqual(["d_other"]);
  });

  it("a handle with no drawers → empty (graceful, an empty trajectory)", async () => {
    client = newClient();
    await client.start();
    const turns = await client.turnsForHandle("sessABC.ghost", { wing: "wing_code__spirits" });
    expect(turns).toEqual([]);
    expect(orderHandleTurnsToStubs(turns)).toEqual([]);
  });
});
