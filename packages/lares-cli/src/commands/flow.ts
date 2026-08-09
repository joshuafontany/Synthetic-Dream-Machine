/** `lares sense flow` — the truthful, read-only capture topology. */

import { larPort } from "../env.js";
import { livePalaceProcs, type PalaceProc } from "../palace-procs.js";
import { udsAlive } from "../local-connector.js";
import { portHolderPids } from "../port-control.js";
import { emit } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

/** The live palace process topology, grouped for the compact human surface. */
function palaceTopology(port: number): { procs: PalaceProc[]; line: string } {
  let vesselPids: number[] = [];
  try { vesselPids = portHolderPids(port); } catch { /* advisory */ }
  const procs = livePalaceProcs({ vesselPids, vesselPort: port });
  if (!procs.length) return { procs, line: "quiet — no live palace process" };
  const byKind = new Map<string, number>();
  for (const p of procs) byKind.set(p.kind, (byKind.get(p.kind) ?? 0) + 1);
  return { procs, line: [...byKind.entries()].sort().map(([k, n]) => `${n} ${k}`).join(" · ") };
}

export async function cmdFlow(args: ParsedArgs): Promise<number> {
  const port = larPort();
  const { procs, line: palaceLine } = palaceTopology(port);
  const daemonOpen = await udsAlive();

  emit(args, {
    ok: true,
    data: {
      capture: {
        route: "source-pointer → daemon verb socket → serialized Python holder → sensorium",
        daemonOpen,
      },
      palace: procs.map((p) => ({ pid: p.pid, kind: p.kind, uptimeSec: p.uptimeSec })),
      port,
    },
    human: () => {
      console.log("lares sense flow — the capture topology (read-only)\n");
      console.log("  capture:     source-pointer → Python holder (serialized, native-source read)");
      console.log(`  daemon:      sock ${daemonOpen ? "OPEN (route available)" : "closed (route unavailable)"}`);
      console.log(`  palace:      ${palaceLine}`);
    },
  });
  return 0;
}
