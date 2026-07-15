/**
 * sensorium-contract — portable declarations for a nameless `#has` cap stack.
 *
 * A contract names capabilities without binding them to directories, holders, or
 * a platform. Node derives one from a rooted manifest; browser and TW5 workers
 * carry one beside their in-memory caps. Order evidence and apertures stay
 * distinct: one grounds a sequence, the other names readings a projector may
 * earn. The open capability list admits new sensorium kinds without a central
 * role enum.
 */

/** Evidence a projector may use to order durable readings. */
export interface SensoriumOrderEvidence {
  readonly projector: string;
  readonly basis: string;
}

/** The platform-blind declaration shared by Node, browser, and TW5 workers. */
export interface SensoriumContract {
  /** Open `#has` capability names. A capability owns its own platform adapter. */
  readonly has: readonly string[];
  /** Sequence evidence; absence refuses a derived ordering claim. */
  readonly order?: SensoriumOrderEvidence;
  /** Readings a projector may earn; distinct from ordering evidence. */
  readonly apertures?: Readonly<Record<string, string>>;
}

/** Build a normalized contract and refuse malformed evidence at the shared seam. */
export function declareSensoriumContract(input: SensoriumContract): SensoriumContract {
  const has = [...new Set(input.has)];
  if (has.some((cap) => typeof cap !== "string" || !cap)) {
    throw new Error("sensorium contract: every #has capability needs a non-empty name");
  }
  if (input.order && (!input.order.projector || !input.order.basis)) {
    throw new Error("sensorium contract: order needs non-empty projector and basis");
  }
  if (input.apertures && Object.entries(input.apertures).some(([cell, provider]) => !cell || !provider)) {
    throw new Error("sensorium contract: apertures need non-empty cells and providers");
  }
  return {
    has,
    ...(input.order ? { order: { projector: input.order.projector, basis: input.order.basis } } : {}),
    ...(input.apertures ? { apertures: { ...input.apertures } } : {}),
  };
}

/** Whether a declared capability belongs to this open stack. */
export function hasSensoriumCap(contract: SensoriumContract, cap: string): boolean {
  return contract.has.includes(cap);
}
