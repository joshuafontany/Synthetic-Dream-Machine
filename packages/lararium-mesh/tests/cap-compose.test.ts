/**
 * cap-compose — the composable-keel engine's laws: a #has-cap-stack (declare) wires topologically
 * (build-or-refuse), each module reaches only its declared deps (POLA), teardown runs in reverse.
 * Canon: lar:///ha.ka.ba/@lararium/api/composable-keel
 */

import { describe, test, expect } from "vitest";
import { composeVessel, type CapModule } from "../src/cap-compose.js";

const cap = (id: string, requires: string[], build: CapModule["build"], extra?: Partial<CapModule>): CapModule =>
  ({ id, requires, build, ...extra });

describe("composeVessel — declare ⊥ wire, the composable keel", () => {
  test("wires in dependency order; each module resolves its declared deps", async () => {
    const seen: string[] = [];
    const stack: CapModule[] = [
      // declared out of order — the composer topo-sorts: repo → daemon → readface
      cap("readface", ["daemon"], (resolve) => { seen.push("readface"); return { daemon: resolve("daemon") }; }),
      cap("repo", [], () => { seen.push("repo"); return { kind: "repo" }; }),
      cap("daemon", ["repo"], (resolve) => { seen.push("daemon"); return { repo: resolve("repo") }; }),
    ];
    const v = await composeVessel(stack);
    expect(v.order).toEqual(["repo", "daemon", "readface"]);           // dependency order, not stack order
    expect(seen).toEqual(["repo", "daemon", "readface"]);
    expect((v.get("daemon") as { repo: { kind: string } }).repo.kind).toBe("repo"); // daemon got the repo
  });

  test("REFUSES to boot when a mandatory dep is absent from the stack (loud, not a flag)", async () => {
    // a Herm-ish stack that names a cap requiring 'wiki', but never declares the wiki cap
    const stack: CapModule[] = [cap("readface", ["wiki"], () => ({}))];
    await expect(composeVessel(stack)).rejects.toThrow(/refuses to boot.*requires "wiki"/);
  });

  test("REFUSES on a dependency cycle", async () => {
    const stack: CapModule[] = [
      cap("a", ["b"], () => ({})),
      cap("b", ["a"], () => ({})),
    ];
    await expect(composeVessel(stack)).rejects.toThrow(/refuses to boot: dependency cycle/);
  });

  test("POLA: a module reaching an UNDECLARED dep throws (capability-routing, default-deny)", async () => {
    const stack: CapModule[] = [
      cap("repo", [], () => ({ kind: "repo" })),
      cap("secret", [], () => ({ kind: "secret" })),
      // 'sneaky' declares only repo but tries to reach 'secret' — un-routed authority
      cap("sneaky", ["repo"], (resolve) => resolve("secret")),
    ];
    await expect(composeVessel(stack)).rejects.toThrow(/reached undeclared dep "secret" \(POLA/);
  });

  test("optional deps resolve undefined when absent (cardinality 0..1)", async () => {
    const stack: CapModule[] = [
      { id: "consumer", requires: [], optional: ["meshpalace"], build: (resolve) => ({ mp: resolve("meshpalace") }) },
    ];
    const v = await composeVessel(stack);
    expect((v.get("consumer") as { mp: unknown }).mp).toBeUndefined();   // absent optional → undefined, no refusal
  });

  test("optional dep present is wired + ordered before its consumer", async () => {
    const stack: CapModule[] = [
      { id: "consumer", requires: [], optional: ["meshpalace"], build: (resolve) => ({ mp: resolve("meshpalace") }) },
      cap("meshpalace", [], () => ({ kind: "meshpalace" })),
    ];
    const v = await composeVessel(stack);
    expect(v.order.indexOf("meshpalace")).toBeLessThan(v.order.indexOf("consumer"));
    expect((v.get("consumer") as { mp: { kind: string } }).mp.kind).toBe("meshpalace");
  });

  test("disposes in REVERSE build order", async () => {
    const torn: string[] = [];
    const stack: CapModule[] = [
      cap("repo", [], () => ({}), { dispose: () => { torn.push("repo"); } }),
      cap("daemon", ["repo"], () => ({}), { dispose: () => { torn.push("daemon"); } }),
    ];
    const v = await composeVessel(stack);
    await v.dispose();
    expect(torn).toEqual(["daemon", "repo"]);                            // reverse of build order
  });

  test("REFUSES a duplicate cap id in the stack", async () => {
    const stack: CapModule[] = [cap("repo", [], () => ({})), cap("repo", [], () => ({}))];
    await expect(composeVessel(stack)).rejects.toThrow(/duplicate cap "repo"/);
  });
});
