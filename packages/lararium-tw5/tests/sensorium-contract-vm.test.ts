import { describe, expect, it } from "vitest";
import { WIKI_SENSORIUM_CONTRACT } from "../src/wiki-sensorium-contract.js";
import { installSensoriumContract } from "../src/sensorium-contract-vm.js";

describe("sensorium-contract-vm", () => {
  it("publishes the shared declaration without opening a sensorium", () => {
    const worker: { lares?: Record<string, unknown> } = {};

    installSensoriumContract(worker);

    expect(worker.lares?.sensoriumContract).toEqual(WIKI_SENSORIUM_CONTRACT);
  });
});
