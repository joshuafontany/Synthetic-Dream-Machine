/**
 * lares doctor — the read-only vessel health sweep (L6, the `git fsck` role). Probes every
 * doc in the vessel store through the L1 disposable boundary and charts MOUNTED vs
 * CONDEMNED. Mutates nothing; a condemned doc points the operator at `lares repair` (the
 * consent-gated actuator). Exits non-zero when the store carries a tear, so a boot/CI gate
 * can read the health off the exit code.
 */

import { larDataDir } from "../env.js";
import { runDoctor, formatDoctorReport } from "@lararium/node";
import { emit } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

export async function cmdDoctor(args: ParsedArgs): Promise<number> {
  const storageDir = larDataDir();
  const report = await runDoctor(storageDir);
  emit(args, {
    ok: true,
    data: {
      storageDir,
      total: report.total,
      healthy: report.healthy,
      condemned: report.condemned,
      degraded: report.degraded,
      entries: report.entries,
    },
    human: () => console.log(formatDoctorReport(report, storageDir)),
  });
  // Non-zero on a tear — the fsck idiom (a health gate reads the exit code).
  return report.degraded ? 1 : 0;
}
