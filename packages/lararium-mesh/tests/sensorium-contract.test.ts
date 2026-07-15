import { describe, expect, test } from "vitest";

import { declareSensoriumContract, hasSensoriumCap } from "../src/sensorium-contract.js";

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
});
