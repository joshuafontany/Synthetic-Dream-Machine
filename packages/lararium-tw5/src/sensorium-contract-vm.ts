/*\
title: lar:///ha.ka.ba/lararium/tw5/modules/sensorium-contract-vm
type: application/javascript
module-type: startup
\*/
/**
 * sensorium-contract-vm — publishes the platform-blind `#has` declaration
 * beside a TW5 worker's in-memory caps. It opens no store and sends no input.
 */

import { WIKI_SENSORIUM_CONTRACT } from "./wiki-sensorium-contract.js";

declare const $tw: { lares?: Record<string, unknown> } | undefined;

/** Install the declaration on a TW5-like worker global for startup and tests. */
export function installSensoriumContract(target: { lares?: Record<string, unknown> }): void {
  target.lares ??= {};
  target.lares.sensoriumContract = WIKI_SENSORIUM_CONTRACT;
}

export const name = "lararium-sensorium-contract-vm";

export function startup(): void {
  if ($tw) installSensoriumContract($tw);
}
