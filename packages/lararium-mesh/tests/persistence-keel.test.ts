/**
 * persistence-keel — the collapsed lifecycle: born silent · one signed `witness` verb (Cut A) ·
 * standing/voice DERIVE at read · maturation mode = the half-life (witness ⊥ affinity) · the
 * merged `admit` gate (Cut B).
 */
import { describe, test, expect } from "vitest";
import * as ed25519 from "@noble/ed25519";
import {
  recordTestimony, witness, reentryPrior, admit, maturationMode, WITNESS_POLICY,
  emptyStoreCode, observeClaim, storeCodeFrom, prequentialBits,
  signWitness, verifyWitnessSig, witnessProofBytes, hex,
  STANDING_FLOOR, STANDING_CEILING, type PersistencePolicy, type Witness,
} from "../src/index.js";

const prov = { signer: "vessel-A", frontier: "f0" };
const born = () => recordTestimony("innovation", [1, 2, 3], prov);
// A well-formed PLACEHOLDER 128-hex signature. The standing law is pure distinct-signer arithmetic — it NEVER
// verifies a signature — so this constant only satisfies the now-mandatory `signature` field while the dial
// tests count distinct signers. REAL signatures (sign → verify) are exercised in the signature describe-block.
const PLACEHOLDER_SIG = "0".repeat(128);
const vouch = (signer: string, frontier: string, tick?: number) => ({ signer, frontier, polarity: 1 as const, signature: PLACEHOLDER_SIG, ...(tick !== undefined ? { tick } : {}) });
const beat = (signer: string, frontier: string) => ({ signer, frontier, polarity: -1 as const, signature: PLACEHOLDER_SIG });

describe("persistence-keel — the standing law (witness mode)", () => {
  test("born silent at the floor", () => {
    const p = reentryPrior(born());
    expect(p.voice).toBe("silent");
    expect(p.standing).toBe(STANDING_FLOOR);
    expect(p.value).toEqual([1, 2, 3]);
  });

  test("frequency-capture defense: the SAME signer 100× never speaks it", () => {
    let t = born();
    for (let i = 0; i < 100; i++) t = witness(t, vouch("vessel-A", `f${i}`));  // self-signer, weighs zero
    expect(reentryPrior(t).voice).toBe("silent");
    expect(t.witnesses).toHaveLength(100);
  });

  test("one distinct signer speaks it; repeats of that witness add nothing", () => {
    let t = witness(born(), vouch("vessel-B", "f1"));
    const s1 = reentryPrior(t).standing;
    expect(reentryPrior(t).voice).toBe("spoken");
    expect(s1).toBeGreaterThan(STANDING_FLOOR);
    for (let i = 0; i < 10; i++) t = witness(t, vouch("vessel-B", `f${i + 2}`));
    expect(reentryPrior(t).standing).toBe(s1);            // count buys nothing
  });

  test("many distinct signers grow standing but never past the ceiling (kapu is talk-story's)", () => {
    let t = born();
    for (let i = 0; i < 50; i++) t = witness(t, vouch(`vessel-W${i}`, `f${i}`));
    expect(reentryPrior(t).standing).toBe(STANDING_CEILING);
  });

  test("a defeat (−1) re-silences to the floor and deletes NOTHING", () => {
    let t = witness(born(), vouch("vessel-B", "f1"));
    t = witness(t, beat("vessel-C", "f2"));
    expect(reentryPrior(t).voice).toBe("silent");
    expect(reentryPrior(t).standing).toBe(STANDING_FLOOR);
    expect(t.witnesses).toHaveLength(2);                  // move-not-delete
  });

  test("re-speaking needs a witness FRESHER than the defeat", () => {
    let t = witness(born(), vouch("vessel-B", "f1"));
    t = witness(t, beat("vessel-C", "f2"));
    t = witness(t, vouch("vessel-B", "f3"));              // fresh, past the defeat
    expect(reentryPrior(t).voice).toBe("spoken");
  });

  test("witness is immutable — the prior record never mutates", () => {
    const t = born();
    witness(t, vouch("vessel-B", "f1"));
    expect(t.witnesses).toHaveLength(0);
  });

  test("the record is content + witness-log only — no stored standing/voice", () => {
    const t = witness(born(), vouch("vessel-B", "f1"));
    expect(Object.keys(t).sort()).toEqual(["assertion", "kind", "provenance", "pubinfo", "witnesses"]);
  });
});

describe("persistence-keel — maturation mode = the half-life", () => {
  test("mode derives from halfLife", () => {
    expect(maturationMode(WITNESS_POLICY)).toBe("witness");
    expect(maturationMode({ halfLife: 1000 })).toBe("affinity");
  });

  const affinity: PersistencePolicy = { halfLife: 100 };

  test("witness mode never cools; affinity mode cools an aged witness toward the floor", () => {
    const t = witness(born(), vouch("vessel-B", "f1", 0));   // vouched at tick 0
    // witness mode (or now===recording): full standing
    const fresh = reentryPrior(t, affinity, 0).standing;
    expect(fresh).toBeGreaterThan(STANDING_FLOOR);
    // affinity mode, long after the half-life: standing decays toward the floor
    const aged = reentryPrior(t, affinity, 1000).standing;   // 10 half-lives
    expect(aged).toBeLessThan(fresh);
    expect(aged).toBeCloseTo(STANDING_FLOOR, 1);
    // the SAME testimony under witness mode ignores age — never cools
    expect(reentryPrior(t, WITNESS_POLICY, 1000).standing).toBe(fresh);
  });

  test("re-vouching in affinity mode refreshes the decayed standing", () => {
    let t = witness(born(), vouch("vessel-B", "f1", 0));
    const aged = reentryPrior(t, affinity, 1000).standing;
    t = witness(t, vouch("vessel-B", "f2", 1000));           // same signer, re-vouched fresh
    const revived = reentryPrior(t, affinity, 1000).standing;
    expect(revived).toBeGreaterThan(aged);
  });
});

describe("persistence-keel — the witness signature (the string the log carries)", () => {
  const seed = new Uint8Array(32).fill(7);
  const claimCid = "claim-cid-abc123";                // the content-address of the testimony being attested
  let signerHex = "";
  const sign = async (bytes: Uint8Array) => hex(await ed25519.signAsync(bytes, seed));

  test("a signed edge round-trips: sign → verify TRUE against the attested testimony", async () => {
    signerHex = hex(await ed25519.getPublicKeyAsync(seed));
    const edge = await signWitness({ claimCid, signer: signerHex, frontier: "f1", polarity: 1, sign });
    expect(edge.signature).toMatch(/^[0-9a-f]{128}$/);              // the string is there now
    expect(await verifyWitnessSig(claimCid, edge)).toBe(true);       // defaults to edge.signer, verifies
  });

  test("a tampered edge FAILS — flipping polarity or frontier breaks the seal", async () => {
    signerHex = hex(await ed25519.getPublicKeyAsync(seed));
    const edge = await signWitness({ claimCid, signer: signerHex, frontier: "f1", polarity: 1, tick: 5, sign });
    expect(await verifyWitnessSig(claimCid, { ...edge, polarity: -1 })).toBe(false);   // vouch→defeat: caught
    expect(await verifyWitnessSig(claimCid, { ...edge, frontier: "f2" })).toBe(false); // moved frontier: caught
    expect(await verifyWitnessSig(claimCid, { ...edge, tick: 6 })).toBe(false);        // moved tick: caught
  });

  test("re-pointing the edge at a DIFFERENT testimony fails — the seal binds the claimCid", async () => {
    signerHex = hex(await ed25519.getPublicKeyAsync(seed));
    const edge = await signWitness({ claimCid, signer: signerHex, frontier: "f1", polarity: 1, sign });
    expect(await verifyWitnessSig("some-other-claim-cid", edge)).toBe(false);
  });

  test("FAIL-CLOSED: an unsigned edge, a bad signer key, and a wrong key all read false", async () => {
    signerHex = hex(await ed25519.getPublicKeyAsync(seed));
    const edge = await signWitness({ claimCid, signer: signerHex, frontier: "f1", polarity: 1, sign });
    // an unsigned edge is MALFORMED: verifyWitnessSig denies it deny-by-default, so it never enters the log
    expect(await verifyWitnessSig(claimCid, { signer: signerHex, frontier: "f1", polarity: 1 } as Witness)).toBe(false);
    // a signer field that is not raw verifying-key hex → shape guard denies (caller must supply a trusted key)
    expect(await verifyWitnessSig(claimCid, { ...edge, signer: "vessel-A" })).toBe(false);
    // a different, valid key that did not sign this edge
    const otherHex = hex(await ed25519.getPublicKeyAsync(new Uint8Array(32).fill(9)));
    expect(await verifyWitnessSig(claimCid, edge, otherHex)).toBe(false);
  });

  test("the proof binds every load-bearing field — same inputs, same bytes (deterministic)", () => {
    const a = witnessProofBytes(claimCid, { signer: "S", frontier: "F", polarity: 1, tick: 3 });
    const b = witnessProofBytes(claimCid, { signer: "S", frontier: "F", polarity: 1, tick: 3 });
    expect(hex(a)).toBe(hex(b));
    expect(hex(a)).not.toBe(hex(witnessProofBytes(claimCid, { signer: "S", frontier: "F", polarity: -1, tick: 3 })));
  });

  test("a signed edge still flows through the standing law unchanged — the signature is orthogonal", async () => {
    signerHex = hex(await ed25519.getPublicKeyAsync(seed));
    const edge = await signWitness({ claimCid, signer: signerHex, frontier: "f1", polarity: 1, sign });
    const t = witness(recordTestimony("innovation", [1, 2, 3], { signer: "vessel-A", frontier: "f0" }), edge);
    expect(reentryPrior(t).voice).toBe("spoken");                    // one distinct signer speaks it, signed or not
    expect(reentryPrior(t).standing).toBeGreaterThan(STANDING_FLOOR);
  });
});

describe("persistence-keel — the admit gate: the store's code against ignorance", () => {
  // A deterministic directional corpus. No clock, no Math.random — the gate is pure, so its tests are too.
  const rng = (seed: number) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; };
  const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
  const unit = (v: number[]) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
  const DIMS = 384;                                   // the real embedding width — 2-D toys hide the failure
  const r = rng(9);
  const topic = Array.from({ length: DIMS }, () => gauss(r));
  /** a claim that says roughly what `topic` says — the near-duplicate the gate exists to refuse. */
  const nearTopic = () => unit(Array.from({ length: DIMS }, (_, i) => topic[i]! + 0.35 * gauss(r)));
  /** a claim pointing somewhere the store has never looked. */
  const fresh = () => unit(Array.from({ length: DIMS }, () => gauss(r)));
  const corpus = (n: number) => Array.from({ length: n }, () => nearTopic());

  test("a near-duplicate is refused; a fresh direction admits — at the width the store actually runs", () => {
    const store = storeCodeFrom(corpus(120), DIMS);
    expect(admit(nearTopic(), store).admit).toBe(false);
    expect(admit(fresh(), store).admit).toBe(true);
  });

  test("first light admits — a store below two claims holds no direction to judge against", () => {
    expect(admit(fresh(), emptyStoreCode(DIMS)).admit).toBe(true);
    expect(admit(fresh(), [nearTopic()]).admit).toBe(true);
  });

  test("the verdict IS the arithmetic — bits against bits, and the cosine threshold is INFERRED", () => {
    const store = storeCodeFrom(corpus(120), DIMS);
    const dup = admit(nearTopic(), store);
    const nov = admit(fresh(), store);
    // bitsSaved = log2( vMF(c) / uniform(c) ): what the store's code saves over ignorance, in real bits.
    // The quantization step cancelled — both codes price the SAME claim at the SAME precision.
    expect(dup.bitsSaved).toBeGreaterThan(0);          // the store already predicts it: it says nothing new
    expect(nov.bitsSaved).toBeLessThan(0);             // the store's code prices it WORSE than pure ignorance
    expect(dup.admit).toBe(dup.bitsSaved <= 0);        // the verdict is the sign of the ledger. Nothing else.
    expect(nov.admit).toBe(nov.bitsSaved <= 0);
    // The decision cosine falls OUT of the store's own concentration; nobody typed 0.5.
    expect(dup.admit).toBe(dup.cosine < dup.cosStar);
    expect(nov.admit).toBe(nov.cosine < nov.cosStar);
    expect(dup.cosStar).toBeGreaterThan(0);
    expect(dup.cosStar).toBeLessThan(1);
  });

  test("THE GATE TIGHTENS AS NEAR-DUPLICATES ACCUMULATE — never loosens", () => {
    // THIS IS THE LOAD-BEARING PROPERTY, and it is the one an earlier reading got backwards. The fear was
    // that a filling store would grow MORE permissive as duplicates piled up — the instrument manufacturing
    // its own finding. Measured, the opposite holds and MUST keep holding: as the store sees the same
    // direction again and again its concentration rises, so it prices that direction ever more cheaply and
    // its refusal grows STRONGER. A store that admitted more as it filled would be broken; assert it cannot.
    const probe = nearTopic();
    let code = emptyStoreCode(DIMS);
    const ledger: number[] = [];
    for (let i = 1; i <= 200; i++) {
      code = observeClaim(code, nearTopic());
      if (i >= 2) ledger.push(admit(probe, code).bitsSaved);
      if (i >= 2) expect(admit(probe, code).admit).toBe(false);   // refused at EVERY size, never re-admitted
    }
    expect(ledger[ledger.length - 1]!).toBeGreaterThan(ledger[0]!);   // conviction grows with the evidence
  });

  test("the small-sample charge — a young store cannot refuse the world on concentration it got by chance", () => {
    // E[R̄²] = 1/n under uniform directions, in EVERY dimension. Subtracting that expectation is the model's
    // complexity charge, and it is exact. Without it, two random claims read as a spike and lock the gate.
    const rn = rng(31);
    const noise = Array.from({ length: 200 }, () => unit(Array.from({ length: DIMS }, () => gauss(rn))));
    const noiseStore = storeCodeFrom(noise, DIMS);
    expect(noiseStore.n).toBe(200);
    // a store of pure noise directions has learned NOTHING; its concentration must read at the floor…
    expect(admit(fresh(), noiseStore).kappa).toBeLessThan(50);   // vs κ ≈ 3200 on the structured store
    // …and it must therefore refuse almost nothing. An honest gate on a directionless store is a wide gate.
    expect(admit(fresh(), noiseStore).admit).toBe(true);
    // a two-claim store still lets genuine novelty through
    expect(admit(fresh(), storeCodeFrom([nearTopic(), nearTopic()], DIMS)).admit).toBe(true);
  });

  test("the prequential ledger CERTIFIES the gate — and reports its own blindness when it has none", () => {
    // Each claim priced by a code built from the claims admitted strictly BEFORE it (Dawid 1984). The code
    // never sees the datum it judges, so it cannot manufacture the finding.
    const rs = rng(51);
    const novel = () => unit(Array.from({ length: DIMS }, () => gauss(rs)));
    const stream = [...corpus(190), ...Array.from({ length: 10 }, () => novel())];
    for (let i = stream.length - 1; i > 0; i--) { const j = Math.floor(rng(i + 3)() * (i + 1)); [stream[i], stream[j]] = [stream[j]!, stream[i]!]; }
    const structured = prequentialBits(stream, DIMS);
    expect(structured.bitsSaved).toBeGreaterThan(0);          // the store's code genuinely beats ignorance
    expect(structured.admitted).toBeLessThan(20);             // it caught the 10 novel and dropped the 190 dups
    expect(structured.admitted).toBeGreaterThanOrEqual(10);

    // On a store with NO direction to learn, the code cannot beat uniform — and the ledger SAYS SO. A gate
    // that reported confident verdicts here would be flipping coins and calling it novelty.
    const rn = rng(31);
    const noise = Array.from({ length: 200 }, () => unit(Array.from({ length: DIMS }, () => gauss(rn))));
    const blind = prequentialBits(noise, DIMS);
    expect(blind.bitsSaved).toBeLessThan(structured.bitsSaved / 100);   // no bits earned: the instrument is blind
    expect(blind.admitted).toBeGreaterThan(150);                        // and it admits, honestly, rather than guesses
  });

  test("THE POPULATION IS NEVER A NEIGHBOURHOOD — a candidate-selected ball corrupts the LEDGER", () => {
    // The earlier story ran: a k-NN ball shrinks the variance, inflates the z-score, and the gate admits MORE
    // as the store fills. Measured, that is false — and so is its refutation. Under a code-length rule the
    // ball usually reaches the same VERDICT; what it destroys is the NUMBER. A population selected by
    // proximity makes the code a function of the candidate, so it normalizes to nothing and log2(p₁/p₀) stops
    // being a difference of code lengths at all. The ledger then reads many-fold off — and the ledger is the
    // thing the operator audits. In high dimension the k-NN list is not even local (hubness, JMLR 11:2487).
    const pop = corpus(200);
    const dup = nearTopic();
    const dot = (a: readonly number[], b: readonly number[]) => a.reduce((s, x, i) => s + x * b[i]!, 0);
    const ball = [...pop].sort((a, b) => dot(b, dup) - dot(a, dup)).slice(0, 16);

    const againstStore = admit(dup, storeCodeFrom(pop, DIMS));
    const againstBall = admit(dup, storeCodeFrom(ball, DIMS));
    expect(againstStore.admit).toBe(false);
    // the ball's fitted concentration exceeds the store's — it was SELECTED to be tight, so it reads a
    // confidence the store never earned, and prices the claim against a code that is not a code.
    expect(againstBall.kappa).toBeGreaterThan(againstStore.kappa);
    expect(againstBall.bitsSaved).toBeGreaterThan(againstStore.bitsSaved);
    // The live gate never takes a population at all: it reads ONE running vector sum over the admitted store,
    // which no candidate can steer. This is why the neighbourhood cannot quietly come back.
    expect(Object.keys(storeCodeFrom(pop, DIMS)).sort()).toEqual(["dims", "n", "sum"]);
  });

  test("THE KNOWN BLIND SPOT, kept in the light: a single vMF cannot see a minority mode", () => {
    // The store's code is UNIMODAL. It refuses duplicates of the direction it mostly holds, and it is BLIND
    // to a duplicate of a small off-axis cluster — a 4th copy of a 3-member topic reads as fresh. This is a
    // real hole, measured, and it is named rather than hidden. The cure keeps the SAME rule: a mixture of vMF
    // components (Banerjee et al. 2005) with the component count chosen by the prequential code length — the
    // shortest code picks k, so no k is typed either. Do not close this test by weakening it.
    const other = Array.from({ length: DIMS }, () => gauss(r));
    const nearOther = () => unit(Array.from({ length: DIMS }, (_, i) => other[i]! + 0.3 * gauss(r)));
    const lopsided = storeCodeFrom([...corpus(190), nearOther(), nearOther(), nearOther()], DIMS);
    expect(admit(nearTopic(), lopsided).admit).toBe(false);   // the dominant mode: seen, refused
    expect(admit(nearOther(), lopsided).admit).toBe(true);    // the minority mode: NOT seen — the blind spot
  });
});
