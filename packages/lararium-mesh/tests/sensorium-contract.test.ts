import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

import { composeSensoriumContract, declareSensoriumContract, hasSensoriumCap } from "../src/sensorium-contract.js";

const fixture = JSON.parse(readFileSync(
  fileURLToPath(new URL("./fixtures/sensorium-contract-parity.json", import.meta.url)), "utf8"),
) as {
  valid: Parameters<typeof declareSensoriumContract>[0];
  normalized: ReturnType<typeof declareSensoriumContract>;
  invalid: readonly { contract: Parameters<typeof declareSensoriumContract>[0]; error: string }[];
  composition: {
    fragments: readonly Parameters<typeof declareSensoriumContract>[0][];
    normalized: ReturnType<typeof declareSensoriumContract>;
    conflicts: readonly {
      fragments: readonly Parameters<typeof declareSensoriumContract>[0][];
      error: string;
    }[];
  };
};

describe("sensorium-contract", () => {
  test("keeps an open #has stack while preserving order and aperture distinction", () => {
    const contract = declareSensoriumContract({
      has: ["content", "form", "content", "telemetry"],
      order: { projector: "stream", basis: "observed:connection-sequence" },
      apertures: { measure: "boundary-changepoint" },
    });
    expect(contract).toEqual({
      has: ["content", "form", "telemetry"],
      order: { projector: "stream", basis: "observed:connection-sequence" },
      apertures: { measure: "boundary-changepoint" },
    });
    expect(hasSensoriumCap(contract, "telemetry")).toBe(true);
  });

  test("refuses incomplete ordering evidence", () => {
    expect(() => declareSensoriumContract({
      has: ["content"], order: { projector: "stream", basis: "" },
    })).toThrow("order needs");
  });

  test("holds the Python-shared conformance fixture", () => {
    expect(declareSensoriumContract(fixture.valid)).toEqual(fixture.normalized);
    for (const invalid of fixture.invalid) {
      expect(() => declareSensoriumContract(invalid.contract)).toThrow(invalid.error);
    }
  });

  test("composes only the cap fragments an entity currently carries", () => {
    expect(composeSensoriumContract(fixture.composition.fragments)).toEqual(fixture.composition.normalized);
  });

  test("refuses contradictory ordering witnesses from composed caps", () => {
    for (const conflict of fixture.composition.conflicts) {
      expect(() => composeSensoriumContract(conflict.fragments)).toThrow(conflict.error);
    }
  });
});
