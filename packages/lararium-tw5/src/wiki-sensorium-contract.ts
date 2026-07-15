/**
 * wiki-sensorium-contract — portable declaration for a wiki island's `#has`
 * cap stack. Storage, holder, and transport stay outside this declaration.
 */

import { declareSensoriumContract, type SensoriumContract } from "@lararium/mesh/sensorium-contract";

/** The cap vocabulary shared by the composite hull and the TW5 worker. */
export const WIKI_SENSORIUM_CONTRACT: SensoriumContract = declareSensoriumContract({
  has: ["content", "structure", "form", "coupling"],
});
