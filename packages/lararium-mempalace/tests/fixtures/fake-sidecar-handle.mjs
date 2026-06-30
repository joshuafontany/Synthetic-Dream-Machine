// Fake mempalace MCP sidecar for SEAM A — serves a small drawer set with FLAT lar_* metadata so the
// content-graph where-filter (turnsForHandle / drawersWhere) is witnessed end-to-end without the
// Python deps. `mempalace_list_drawers` honors wing + offset/limit pagination (the client pages it).
let buf = "";

// Two worldlines share the palace; one carries three turns (out of order on the wire so the client's
// ordering must sort them), the other a single turn that the where-filter MUST exclude.
const DRAWERS = [
  { drawer_id: "d_h1_t1", wing: "wing_code__spirits", room: "sess",
    metadata: { wing: "wing_code__spirits", lar_agent_handle: "sessABC.xyz", lar_verbatim_sha: "sha-bbb",
      filed_at: "2026-06-29T00:01:00Z", chunk_index: 0, source_file: "Mapper__agent-xyz__run-sessABC.jsonl" } },
  { drawer_id: "d_h1_t2", wing: "wing_code__spirits", room: "sess",
    metadata: { wing: "wing_code__spirits", lar_agent_handle: "sessABC.xyz", lar_verbatim_sha: "sha-ccc",
      filed_at: "2026-06-29T00:02:00Z", chunk_index: 0, source_file: "Mapper__agent-xyz__run-sessABC.jsonl" } },
  { drawer_id: "d_h1_t0", wing: "wing_code__spirits", room: "sess",
    metadata: { wing: "wing_code__spirits", lar_agent_handle: "sessABC.xyz", lar_verbatim_sha: "sha-aaa",
      filed_at: "2026-06-29T00:00:00Z", chunk_index: 0, source_file: "Mapper__agent-xyz__run-sessABC.jsonl" } },
  { drawer_id: "d_other", wing: "wing_code__spirits", room: "sess",
    metadata: { wing: "wing_code__spirits", lar_agent_handle: "sessABC.other", lar_verbatim_sha: "sha-zzz",
      filed_at: "2026-06-29T00:00:30Z", chunk_index: 0 } },
];

process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    handle(msg);
  }
});

function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}

function handle(msg) {
  if (msg.method === "initialize") {
    respond(msg.id, { protocolVersion: "2025-11-25", capabilities: { tools: {} }, serverInfo: { name: "mempalace", version: "fake-handle" } });
  } else if (msg.method === "notifications/initialized") {
    // no reply
  } else if (msg.method === "tools/call") {
    const name = msg.params?.name;
    const a = msg.params?.arguments ?? {};
    let payload;
    if (name === "mempalace_list_drawers") {
      const wing = a.wing;
      const all = wing ? DRAWERS.filter((d) => d.wing === wing) : DRAWERS;
      const offset = a.offset ?? 0;
      const limit = a.limit ?? 20;
      const page = all.slice(offset, offset + limit);
      payload = { drawers: page, total: all.length, count: page.length, offset, limit };
    } else {
      payload = { error: "unknown tool" };
    }
    respond(msg.id, { content: [{ type: "text", text: JSON.stringify(payload) }] });
  }
}
