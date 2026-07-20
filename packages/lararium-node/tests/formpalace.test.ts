/**
 * formpalace — the living-grammar FORM store (the two-planes form-capture's CONTINUOUS plane,
 * encoded). End-to-end over a REAL temp-dir form palace reached through the python `form_encoder.py`
 * holder: a turn flows harvest → emitMoveSkeleton (P1) → buildConstructiconBasis (P0) → serialize →
 * the form-encoder sidecar (encode, P2) → a sparse form-vector densified + STORED in the "form"
 * collection keyed by verbatim_sha; the collection is queryable BY form-similarity AND by a metadata
 * where-filter; the verbatim_sha rides as the cross-graph join to the content drawer.
 *
 * These tests need the venv python + chromadb; each opens its own temp palace and closes it
 * (killing the holder) so vitest exits clean. The first encode per holder pays a one-time scorer
 * probe, so timeouts are generous.
 */

import { EventEmitter } from "node:events";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { harvestTurnGradient } from "@lararium/mesh";
import { emitMoveSkeleton, buildConstructiconBasis } from "@lararium/tw5/form-layer";
import { afterEach, describe, expect, test } from "vitest";

import {
  makeFormPalace, _liveFormHolderCount,
  type FormPalace, type FormHolderSpawn, type SerializedBasis,
} from "../src/sensorium.js";

const TEST_TIMEOUT = 90_000;

/** A realistic, frame-complete turn — voices/wards/phases bind to canon basis axes. */
const TURN = [
  "<<~ lares aim lar://m:o@x/operator.intent.lands -> lar://c:a@x/council.options.cuts >>",
  "<<~ hud Aperture(10) OODA-HA(3) >>",
  "<<~ ward * L-Prime >>",
  "",
  "Lares (Council): the verb leads, the way holds.",
  "<<~ confidence Synthesis 11/20 >> the fork holds.",
  "",
  "<<~ oracle ↯11 ✲ ⚃ (3) ⁂:⬡◈⟁ >>",
  "<<~ ward ! · ↻ L-Prime >>",
  "<<~ hud Aperture(10 -> 12) OODA-HA(0◇:fork) >>",
  "<<~ lares yield lar://c:a@x/council.fork.named -> ? >>",
].join("\n");

function buildInputs(turn = TURN): { skeleton: ReturnType<typeof emitMoveSkeleton>; basis: SerializedBasis } {
  const harvest = harvestTurnGradient(turn);
  const skeleton = emitMoveSkeleton(harvest, []);
  const b = buildConstructiconBasis();
  return { skeleton, basis: { axes: b.axes, dimension: b.dimension } };
}

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);

const opened: FormPalace[] = [];
function openPalace(dir: string, opts?: Parameters<typeof makeFormPalace>[1]): FormPalace {
  const pal = makeFormPalace(dir, opts);
  opened.push(pal);
  return pal;
}
async function palaceDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "formpalace-"));
}
afterEach(async () => {
  await Promise.all(opened.splice(0).map((p) => p.close()));
});

describe("makeFormPalace — the form-graph wired end-to-end (live python + chroma)", () => {
  test("a turn flows skeleton → sidecar → form-vector → stored, queryable, verbatim_sha-joined", async () => {
    const pal = openPalace(await palaceDir());
    const { skeleton, basis } = buildInputs();

    const res = await pal.encodeStore({
      skeleton, basis, key: SHA_A,
      metadata: { register: "synthesis", grammar_layer: "x-memetic", struct_hash: "sh1", verbatim_sha: SHA_A },
    });
    expect(res.key).toBe(SHA_A);
    expect(res.dimension).toBe(basis.dimension); // densified to basis.dimension
    expect(res.count).toBe(1);
    expect(res.conformance).toBeGreaterThan(0);
    expect(res.form_vector.indices.length).toBeGreaterThan(0); // the vector never collapses

    // Queryable BY form-similarity: the nearest hit to the same skeleton is itself.
    const matches = await pal.query({ skeleton, basis, nResults: 3 });
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]!.key).toBe(SHA_A);

    // The verbatim_sha rides as the cross-graph join key (form-drawer.id == content's lar_verbatim_sha).
    const entry = await pal.get(SHA_A);
    expect(entry).not.toBeNull();
    expect(entry!.metadata["lar_verbatim_sha"]).toBe(SHA_A);
    expect(entry!.metadata["register"]).toBe("synthesis");
  }, TEST_TIMEOUT);

  test("queryable BY a metadata where-filter (the register facet narrows the search)", async () => {
    const pal = openPalace(await palaceDir());
    const { skeleton, basis } = buildInputs();
    await pal.encodeStore({ skeleton, basis, key: SHA_A,
      metadata: { register: "synthesis", grammar_layer: "x-memetic", struct_hash: "s", verbatim_sha: SHA_A } });
    await pal.encodeStore({ skeleton, basis, key: SHA_B,
      metadata: { register: "provisional", grammar_layer: "x-memetic", struct_hash: "s", verbatim_sha: SHA_B } });

    const provisional = await pal.query({ skeleton, basis, nResults: 5, where: { register: "provisional" } });
    expect(provisional.map((m) => m.key)).toEqual([SHA_B]); // the where-filter excludes the synthesis entry
  }, TEST_TIMEOUT);

  test("the bearing facets persist + filter recalls BY bearing root (no vector)", async () => {
    const pal = openPalace(await palaceDir());
    const { skeleton, basis } = buildInputs();
    // Store two turns under different bearing roots (bearing facets stamped on the metadata).
    await pal.encodeStore({ skeleton, basis, key: SHA_A,
      metadata: { register: "synthesis", grammar_layer: "x-memetic", struct_hash: "s", verbatim_sha: SHA_A,
        bearing_w1: "breach", bearing_w3: "fires", bearing_root: "breach.watch.fires", bearing_grade: "canon" } });
    await pal.encodeStore({ skeleton, basis, key: SHA_B,
      metadata: { register: "synthesis", grammar_layer: "x-memetic", struct_hash: "s", verbatim_sha: SHA_B,
        bearing_root: "council.fork.named", bearing_grade: "canon" } });

    // The facet round-trips through chroma metadata.
    const entry = await pal.get(SHA_A);
    expect(entry!.metadata["bearing_root"]).toBe("breach.watch.fires");
    expect(entry!.metadata["bearing_w1"]).toBe("breach");

    // The metadata-only filter (NO vector) recalls exactly the breach-rooted turn.
    const hits = await pal.filter({ where: { bearing_root: "breach.watch.fires" }, nResults: 5 });
    expect(hits.map((m) => m.key)).toEqual([SHA_A]);
    expect(hits[0]!.distance).toBeNull(); // a where-match carries no similarity ranking
  }, TEST_TIMEOUT);

  test("the reap-don't-pile invariant — two facades on ONE dir share ONE holder", async () => {
    const dir = await palaceDir();
    const before = _liveFormHolderCount();
    const a = openPalace(dir);
    const b = openPalace(dir);
    // `get` opens the store (chroma) without a scorer load — concurrent first calls through both facades.
    const [ra, rb] = await Promise.all([a.get(SHA_A), b.get(SHA_B)]);
    expect(ra).toBeNull();
    expect(rb).toBeNull();
    expect(_liveFormHolderCount()).toBe(before + 1); // exactly one holder, not two — no pile

    await a.close();
    expect(_liveFormHolderCount()).toBe(before + 1); // b still holds it
    await b.close();
    expect(_liveFormHolderCount()).toBe(before);
    opened.length = 0; // both already closed
  }, TEST_TIMEOUT);
});

describe("a sick holder SURFACES its stderr (the ChromaDB-error footgun)", () => {
  const sickSpawn = (stderr: string, exitCode = 1): FormHolderSpawn => () => {
    const stdout = new EventEmitter() as EventEmitter & { setEncoding(): void };
    stdout.setEncoding = () => {};
    const stderrStream = new EventEmitter() as EventEmitter & { setEncoding(): void };
    stderrStream.setEncoding = () => {};
    const events = new EventEmitter();
    setTimeout(() => {
      stderrStream.emit("data", stderr);
      events.emit("exit", exitCode);
    }, 5);
    return {
      stdin: { write: () => true, end: () => {} } as unknown as NodeJS.WritableStream,
      stdout: stdout as unknown as NodeJS.ReadableStream,
      stderr: stderrStream as unknown as NodeJS.ReadableStream,
      on: (ev: "exit" | "error", cb: (arg: never) => void) => { events.on(ev, cb); },
      kill: () => {},
    };
  };

  test("an encodeStore against a holder that dies rejects WITH the stderr fault", async () => {
    const dir = await mkdtemp(join(tmpdir(), "formpalace-sick-"));
    const fault = "chromadb PermissionError: [Errno 13] could not open .formpalace/chroma.sqlite3";
    const pal = makeFormPalace(dir, { spawn: sickSpawn(fault) });
    const { skeleton, basis } = buildInputs();
    await expect(
      pal.encodeStore({ skeleton, basis, key: SHA_A, metadata: { verbatim_sha: SHA_A } }),
    ).rejects.toThrow(/PermissionError/);
    await pal.close();
  }, TEST_TIMEOUT);
});
