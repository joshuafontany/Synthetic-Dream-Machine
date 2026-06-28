/**
 * DreamNet founding ceremonies — device-admit, invite-send, invite-receive.
 *
 * These commands implement the two-level identity lattice:
 *   device-admit   — admit a new vessel (browser/phone) into the operator's PersonaGroup
 *   invite-send    — send an invitation for another operator to join the Nexus MeshCabal
 *   invite-receive — receive and apply an invitation from another operator
 *
 * Transport layer (QR, NFC, local LAN broadcast) and full Keyhive contact-card
 * exchange not yet implemented. These stubs mark the gap with clear operator
 * guidance rather than silent crashes.
 *
 * Design spec: lar:///ha.ka.ba/@lares/docs/lares/mesh-governance
 * (pending — will carry the full ceremony protocol once transport lands)
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

export async function cmdInviteSend(_args: ParsedArgs): Promise<number> {
  console.error(
    `[lares invite-send] not yet implemented.\n` +
    `\n` +
    `This command will invite another operator's PersonaGroup into the Nexus MeshCabal.\n` +
    `Both parties exchange Keyhive contact cards; you sign a delegation granting\n` +
    `their PersonaGroup Admin access in the MeshCabal sentinel document.\n` +
    `\n` +
    `What lands here:\n` +
    `  1. Receive the other operator's contact card (out-of-band)\n` +
    `  2. keyhive.receiveContactCard() → their Individual\n` +
    `  3. keyhive.addSentinelMember(theirPersonaGroupAgentId, meshCabalDocId)\n` +
    `  4. Package: MeshCabalDocId + DELEGATED event bytes + shared-bag list\n` +
    `  5. Transmit invitation payload to the other operator\n` +
    `\n` +
    `Also creates community bags (catalog, reputation, ledger) with both\n` +
    `PersonaGroups as co-admins at first co-operator join.\n` +
    `\n` +
    `Transport layer design: lar:///ha.ka.ba/@lares/docs/lares/mesh-governance`,
  );
  return 1;
}

export async function cmdInviteReceive(_args: ParsedArgs): Promise<number> {
  console.error(
    `[lares invite-receive] not yet implemented.\n` +
    `\n` +
    `This command applies an invitation payload from a Nexus operator,\n` +
    `granting your PersonaGroup membership in their Nexus MeshCabal.\n` +
    `After running this, your vessel passes Gate C on next boot.\n` +
    `\n` +
    `What lands here:\n` +
    `  1. Receive invitation payload (MeshCabalDocId + DELEGATED events)\n` +
    `  2. keyhive.ingestEventsBytes([delegation events])\n` +
    `  3. Write MeshCabalDocId to daemon oracle tiddler\n` +
    `  4. Your PersonaGroup now passes verifySentinelMembership at Gate C\n` +
    `\n` +
    `Contact the founding operator to initiate: \`lares invite-send\` runs on their node.\n` +
    `\n` +
    `Transport layer design: lar:///ha.ka.ba/@lares/docs/lares/mesh-governance`,
  );
  return 1;
}
