// Fake mempalace MCP holder — speaks the NDJSON JSON-RPC subset the client
// uses, so the read leg is witnessed end-to-end without mempalace's Python deps.
// One verbatim drawer carries a real lares aim/yield frame, so the harvest path
// is exercised against a true-shaped payload.
let buf = "";

const DRAWER_CONTENT =
  "<<~ lares aim lar:///operator.weighs.deps -> lar:///council.options.cuts >>\n" +
  "Lares (Council): the work.\n" +
  "<<~ lares yield lar:///council.fork.named -> ? >>";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    handle(msg);
  }
});

function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}

function handle(msg) {
  if (msg.method === "initialize") {
    respond(msg.id, {
      protocolVersion: "2025-11-25",
      capabilities: { tools: {} },
      serverInfo: { name: "mempalace", version: "fake" },
    });
  } else if (msg.method === "notifications/initialized") {
    // no reply, by spec
  } else if (msg.method === "tools/call") {
    const name = msg.params?.name;
    let payload;
    if (name === "mempalace_list_drawers") {
      payload = { drawers: [{ drawer_id: "sweep_s1_m1" }], total: 1, count: 1, offset: 0, limit: 20 };
    } else if (name === "mempalace_get_drawer") {
      payload = {
        drawer_id: msg.params.arguments.drawer_id,
        content: DRAWER_CONTENT,
        wing: "wing_code",
        room: "sess",
      };
    } else {
      payload = { error: "unknown tool" };
    }
    respond(msg.id, { content: [{ type: "text", text: JSON.stringify(payload) }] });
  }
}
