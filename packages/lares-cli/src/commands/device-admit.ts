/**
 * `lares device-admit` — admit a new vessel into the operator's own PersonaGroup.
 *
 * THE JOINEE MINTS FIRST, and the order carries the property. Admission SIGNS a key the joining vessel
 * already holds; it never issues one. So the private seed is born on the joining device and stays there,
 * only the PUBLIC verifying key crosses, and this call refuses without it. That ordering is what keeps a
 * QR ceremony photograph-inert: the payload names a key whose holder already proved it holds it.
 *
 * ONE OPERATOR'S OWN FLEET, and no further. A second OPERATOR joins a Nexus by carriage contract
 * (`lares nexus accept-carriage` · `lares nexus contract`), which is a different axis entirely — this
 * door binds devices to one persona root, never people to each other.
 *
 * Transport (QR · NFC · LAN) rides whatever channel the operator already trusts; the payload is a file.
 */

import type { ParsedArgs } from "../parse-args.js";
import { runDeviceAdmit } from "@lararium/node";

export async function cmdDeviceAdmit(args: ParsedArgs): Promise<number> {
  const joineeKey = args.options["joinee-key"];
  if (!joineeKey) {
    console.error("[lares device-admit] --joinee-key <hex> required — the joining vessel's PUBLIC verifying key.");
    return 2;
  }
  const opts: Parameters<typeof runDeviceAdmit>[0] = { joineeVerifyingKey: joineeKey };
  if (args.options["out"])      Object.assign(opts, { outPath: args.options["out"] });
  if (args.options["sync-url"]) Object.assign(opts, { syncUrl: args.options["sync-url"] });
  await runDeviceAdmit(opts);
  return 0;
}
