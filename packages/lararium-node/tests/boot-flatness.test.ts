/**
 * CIV-2 boot-flatness — the civic invariant: a vessel's boot cost tracks its OWN self surface,
 * NEVER the count of held/foreign principals it carries. On public civic infrastructure a node may
 * hold N citizens' islands; if boot replayed all N eagerly, boot time would grow with the citizen
 * roll — an O(N) tax that bites exactly when the node matters most. The cut: `hydrateFromEventStore`
 * loads only the self slice eagerly (the vessel's own sentinel islands PLUS the cross-cutting events
 * every island co-loads); a held island's events DEFER to lazy first-access. The island IS the CGKA
 * ratchet boundary (CIV-3), so deferring a foreign island stays decryptability-safe for the self one.
 *
 * SAFETY of the synthetic foreign events: a deferred event is filtered out BEFORE `ingestEventsBytes`,
 * so it never reaches keyhive's WASM — the foreign records here carry arbitrary bytes with zero
 * panic-abort risk. Only the (real, well-formed) self events ever reach ingest.
 *
 * The harness sweeps the held-principal count N and asserts: `deferred` grows linearly with N while
 * the eager attempt count stays FLAT (independent of N). Drop the filter and both assertions fail —
 * deferred collapses to 0 and the eager cost climbs with N. That is the regression this pins.
 */
import { describe, test, expect } from "vitest";
import { KeyhiveProvider, InMemoryEventStore, inSelfSlice, type EventRecord } from "@lararium/keyhive";

/** A self island the harness routes its real events to (a stand-in sentinel doc-id hex). */
const SELF_ISLAND = "5e1f5e1f5e1f5e1f5e1f5e1f5e1f5e1f";
/** Held-principal events per foreign island — a fixed cadence so `deferred === N * PER`. */
const PER = 3;

/** Emit real, ingestable keyhive events by minting a couple of documents in a throwaway vessel;
 *  return their raw bytes. These form the EAGER (self + cross-cutting) slice — the only bytes that
 *  ever reach ingest, so they MUST be well-formed. */
async function gatherRealSelfEvents(): Promise<Uint8Array[]> {
  const store = new InMemoryEventStore();
  const src = new KeyhiveProvider();
  await src.init({ seed: new Uint8Array(32).fill(1), eventStore: store });
  await src.registerBag("lar:///ha.ka.ba/bags/@daemon/flatness-a");
  await src.registerBag("lar:///ha.ka.ba/bags/@daemon/flatness-b");
  const bytes = (await store.list()).map((r) => r.bytes);
  await src.dispose();
  return bytes;
}

describe("CIV-2 boot-flatness — eager cost ⊥ held-principal count", () => {
  test("inSelfSlice: the eager slice is (self islands ∪ cross-cutting); a held island defers", () => {
    const rec = (island?: string): EventRecord =>
      ({ hash: "h", variant: "CGKA_OPERATION", bytes: new Uint8Array(), ...(island ? { island } : {}) });
    const SELF = ["aa", "bb"];
    expect(inSelfSlice(rec("aa"), SELF)).toBe(true);        // a self island — eager
    expect(inSelfSlice(rec("bb"), SELF)).toBe(true);        // another self island — eager
    expect(inSelfSlice(rec(undefined), SELF)).toBe(true);   // cross-cutting (per-principal) co-loads
    expect(inSelfSlice(rec("ff"), SELF)).toBe(false);       // a held/foreign island — defers
    expect(inSelfSlice(rec("ff"), undefined)).toBe(true);   // no self set → all eager (N=1 default)
    expect(inSelfSlice(rec("ff"), [])).toBe(false);         // empty self set → only cross-cutting eager
  });

  test("synthetic-N sweep: deferred grows with N; the eager attempt count stays FLAT", async () => {
    const realBytes = await gatherRealSelfEvents();
    expect(realBytes.length).toBeGreaterThan(0);

    let flatBaseline: number | null = null;
    for (const N of [0, 1, 5, 25]) {
      const store = new InMemoryEventStore();
      // The eager slice: real events, the first cross-cutting (island undefined), the rest self-island.
      for (let i = 0; i < realBytes.length; i++) {
        await store.put({
          hash: `real-${i}`, variant: "CGKA_OPERATION", bytes: realBytes[i],
          ...(i === 0 ? {} : { island: SELF_ISLAND }),
        });
      }
      // N held principals, each a distinct foreign island with PER events — all DEFERRED (never
      // reach ingest, so the arbitrary bytes are safe).
      for (let p = 0; p < N; p++) {
        const foreignIsland = `f0f0${p.toString(16).padStart(28, "0")}`;
        for (let e = 0; e < PER; e++) {
          await store.put({
            hash: `foreign-${p}-${e}`, variant: "CGKA_OPERATION",
            bytes: new Uint8Array([p & 0xff, e & 0xff, 0xde, 0xad]), island: foreignIsland,
          });
        }
      }

      const boot = new KeyhiveProvider();
      await boot.init({ seed: new Uint8Array(32).fill(9), eventStore: store });
      const { ingested, skipped, deferred } = await boot.hydrateFromEventStore([SELF_ISLAND]);
      await boot.dispose();

      // Held events defer, growing linearly with the citizen roll.
      expect(deferred).toBe(N * PER);
      // The eager cost — what boot actually replays — never grows with N.
      const eagerAttempts = ingested + skipped;
      if (flatBaseline === null) flatBaseline = eagerAttempts;
      else expect(eagerAttempts).toBe(flatBaseline);
    }
  });

  test("CIV-2b: a boot-deferred foreign island materializes on first access, then noops", async () => {
    // A causally-closed real event set (well-formed — it reaches ingest, unlike the synthetic-N garbage).
    const realBytes = await gatherRealSelfEvents();
    expect(realBytes.length).toBeGreaterThan(1);
    const FOREIGN = "abcdabcdabcdabcdabcdabcdabcdabcd";

    const store = new InMemoryEventStore();
    // Event 0 rides cross-cutting (eager, so its causal root is resident before the lazy slice loads);
    // the rest tag to FOREIGN and DEFER past the self-only boot.
    for (let i = 0; i < realBytes.length; i++) {
      await store.put({ hash: `r-${i}`, variant: "CGKA_OPERATION", bytes: realBytes[i], ...(i === 0 ? {} : { island: FOREIGN }) });
    }

    const boot = new KeyhiveProvider();
    await boot.init({ seed: new Uint8Array(32).fill(3), eventStore: store });
    const { deferred } = await boot.hydrateFromEventStore([SELF_ISLAND]);   // FOREIGN ∉ self → deferred
    expect(deferred).toBe(realBytes.length - 1);

    // First access pulls EXACTLY FOREIGN's own slice (not the cross-cutting event, already resident).
    const first = await boot.materializeIsland(FOREIGN);
    expect(first.ingested + first.skipped).toBe(realBytes.length - 1);
    // Second access noops — the island is now resident.
    const second = await boot.materializeIsland(FOREIGN);
    expect(second.ingested + second.skipped).toBe(0);
    // An island with no stored slice noops too (nothing to pull).
    const none = await boot.materializeIsland("00000000000000000000000000000000");
    expect(none.ingested + none.skipped).toBe(0);
    await boot.dispose();
  });

  test("CIV-2b: the N=1 default (allEager) makes materializeIsland a pure noop", async () => {
    const realBytes = await gatherRealSelfEvents();
    const HELD = "beadbeadbeadbeadbeadbeadbeadbead";
    const store = new InMemoryEventStore();
    for (let i = 0; i < realBytes.length; i++) {
      await store.put({ hash: `d-${i}`, variant: "CGKA_OPERATION", bytes: realBytes[i], ...(i === 0 ? {} : { island: HELD }) });
    }
    const boot = new KeyhiveProvider();
    await boot.init({ seed: new Uint8Array(32).fill(4), eventStore: store });
    await boot.hydrateFromEventStore();   // no self set → allEager, every event already loaded
    // Nothing defers in the N=1 path, so a lazy-load has nothing to do — a pure noop.
    const r = await boot.materializeIsland(HELD);
    expect(r.ingested + r.skipped).toBe(0);
    await boot.dispose();
  });

  test("default path (no selfIslands) loads every event eagerly — the N=1 daemon, unchanged", async () => {
    const realBytes = await gatherRealSelfEvents();
    const store = new InMemoryEventStore();
    for (let i = 0; i < realBytes.length; i++) {
      await store.put({ hash: `r-${i}`, variant: "CGKA_OPERATION", bytes: realBytes[i] });
    }
    const boot = new KeyhiveProvider();
    await boot.init({ seed: new Uint8Array(32).fill(7), eventStore: store });
    const { ingested, skipped, deferred } = await boot.hydrateFromEventStore();
    await boot.dispose();

    expect(deferred).toBe(0);                              // nothing deferred without a self set
    expect(ingested + skipped).toBe(realBytes.length);     // all eager, byte-for-byte the old behaviour
  });
});
