/**
 * `lares surface [<surface>] [--executable] [--json]` — read what a projection exposes, from the one table.
 *
 * THIS EXISTS SO A SECOND SURFACE NEVER KEEPS A SECOND CATALOGUE. An agent face that hand-listed its tools
 * would drift from the plane it claims to expose, and that drift stays invisible until it bites: a verb an
 * agent reaches and a human cannot, or the reverse. Emitting the projection as data lets every other face —
 * the MCP surface, a wiki face, whatever comes — READ what stands rather than restate it.
 *
 * `--executable` drops the key-holding verbs. An agent surface builds from THAT list, so it cannot reach a
 * signing act by accident; reaching one takes the full projection plus a deliberate compose-only path, where
 * the agent renders the artifact and the operator's hand signs it.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/composable-keel
 */

import { projectCommands } from "../bin/lares.js";
import type { ParsedArgs } from "../parse-args.js";

export async function cmdSurface(args: ParsedArgs): Promise<number> {
  const surface    = args.positional[0] ?? "cli";
  const executable = args.flags["executable"] === true;
  const entries    = projectCommands(surface, executable);

  if (args.flags["json"] === true) {
    // The shape another surface consumes. `signs` rides even in the executable view (where it always reads
    // false) so a reader never has to infer the flag's absence from a filter it did not run.
    console.log(JSON.stringify({ ok: true, data: { surface, executable, entries } }));
    return 0;
  }

  if (entries.length === 0) {
    console.log(`no verbs project onto "${surface}" — a surface exposes what asked to be exposed.`);
    return 0;
  }
  console.log(`${entries.length} verb${entries.length === 1 ? "" : "s"} project onto "${surface}"${executable ? " (executable)" : ""}:`);
  for (const e of entries) {
    console.log(`  ${e.signs ? "✍ " : "  "}${e.name.padEnd(16)}${e.summary.split(".")[0]}`);
  }
  if (!executable && entries.some((e) => e.signs)) {
    console.log("");
    console.log("  ✍ = holds a key. An agent surface may compose these and MUST NOT execute them.");
  }
  return 0;
}
