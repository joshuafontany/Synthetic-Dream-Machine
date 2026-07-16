# qa_anchor — the COMPUTE kernel of the gold-anchor rig (KUE-1)

The **design-stable statistical core** of the native multi-palace `qa_rig`. It
turns a detector's fires, scored against human ground-truth labels, into a
Signal-Detection `(d′, criterion)` estimate, a bootstrap confidence interval, the
**KUE-1 verdict**, and the rater-reliability that backs the labels.

Pure **stdlib + numpy** — no scipy (absent in the sidecar venv; `z`/`Φ` come from
`statistics.NormalDist`), no palace, no detector, no sampler, no human in the
loop. Every result is deterministic and unit-testable.

## Why the anchor exists

A low marker-rate is **under-determined**. "The detector rarely fires" admits two
incompatible stories a raw rate cannot separate:

- **Sensitivity story** — the detector cannot tell present from absent (low `d′`).
  The rarity is *blindness*.
- **Criterion story** — the detector discriminates well (high `d′`) but sits
  behind a conservative threshold (high `c`); it only fires when sure. The rarity
  is *caution*.

Only a human ground-truth pair recovers `d′` and `c`, and only `d′` and `c`
separate the two stories. This is the disambiguation of the paper's
"absence ≠ absence". Federation to the QA-box is off (company VPN), so the whole
rig is built here, native, on the multi-palace tools.

## Modules

| File             | Holds |
|------------------|-------|
| `dprime.py`      | `ConfusionMatrix`, the loglinear correction, `compute_sdt` → `(d′, c)`, and `kue1_verdict` (the inference). |
| `bootstrap.py`   | one percentile-bootstrap engine + the two consumers `bootstrap_dprime`, `bootstrap_ci`. |
| `reliability.py` | Krippendorff's α (any #raters / level / missing data) + `bootstrap_alpha`; Cohen's κ and ICC for single-kumu test–retest. |
| `tests/`         | synthetic pytest suite — known-d′ recovery, zero-cell handling, CI coverage, hand-computed α, κ/ICC. |

## The math (grounded)

- **d′ / criterion** (right-tail / yes-no convention):
  `d′ = z(H) − z(FA)`, `c = −½·[z(H) + z(FA)]`, with the 2×2 confusion matrix
  vs the human label as truth (`Hit = fires ∧ present`, `FA = fires ∧ absent`,
  Miss / CR fill the rest). *Green & Swets 1966; Macmillan & Creelman 2005.*
- **Zero-cell** — the Hautus **loglinear** correction applied **unconditionally**:
  `H = (hits+0.5)/(n_signal+1)`, `FA = (fa+0.5)/(n_noise+1)`, keeping `z` finite
  at small n and extreme proportions. *Hautus 1995.*
- **Variance / CI** — a nonparametric **bootstrap over items** (resample labeled
  spans, recompute, take 2.5/97.5 percentiles). The same engine yields the α CI.
  *Efron & Tibshirani 1993; Davison & Hinkley 1997.*
- **Reliability** — **Krippendorff's α** (nominal/ordinal/interval/ratio; thresholds
  α ≥ 0.80 satisfactory, 0.667 tentative floor), with bootstrap CI; plus **Cohen's
  κ** and **ICC(2,1)/(3,1)** for the single-kumu test–retest fallback.
  *Krippendorff 2004/2011; Cohen 1960; Shrout & Fleiss 1979; McGraw & Wong 1996.*

## The KUE-1 inference

`kue1_verdict(estimate, thresholds=..., d_prime_ci=...)` reads the recovered
`(d′, c, fire-rate)` into one of four stories:

- `SENSITIVITY` — low fire-rate **+ low d′** → can't discriminate.
- `CRITERION` — low fire-rate **+ high d′ + high c** → catches, set conservative.
- `AMBIGUOUS` — low fire-rate + high d′ but **low c** → discriminates yet not
  cautious; the rarity owes to base-rate / coverage (inspect upstream).
- `NOT_RARE` — fire-rate above the rare band → the rarity question doesn't arise.

The point estimate always yields a story; a supplied bootstrap CI only sharpens
the rationale. `Kue1Thresholds` are conventional SDT reference points (`d′ ≥ 1.0`,
`c ≥ 0.5`, `fire-rate ≤ 0.20`), **operator-tunable** once real labels arrive.

## Run the tests

```sh
cd packages/lararium-mempalace/scripts
PYTHONPATH=. python -m pytest qa_anchor/tests/ -q
```

55 synthetic tests, fully deterministic — no palace, detector, or human needed.
Lint/format follow the mempalace ruff config (line-length 100, double quotes).

## BUILT here (this kernel)

The design-stable math core: `d′`/`c` · unconditional loglinear · the shared
bootstrap engine (d′ CI + α CI) · Krippendorff's α + band classification ·
Cohen's κ + ICC · the KUE-1 four-story inference. Depends on nothing downstream.

## AWAITS (downstream, NOT in this kernel)

- **The SAMPLE stage** — palace-native span selection (how spans are drawn from
  the multi-palace corpus); carries **operator decisions** (stratification,
  budget, which palaces).
- **The DETECTORS** — a **native re-implementation** informed by the QA-box
  inspiration code (arriving later, re-implement fresh, do **not** copy). The
  kernel consumes only their per-span fire booleans.
- **The human kumu labels** — the ground-truth `present` booleans the kernel
  scores against; the d′ is only as trustworthy as the labels, which is why the
  reliability layer ships alongside.

## Braid ②b — the swell-read + the circularity wards (this increment)

The cheapest, most circularity-proof instruments, built atop the COMPUTE kernel —
buildable now, no nuke. The order matters: read the deterministic signal first,
ward the loop against self-confirmation, only then let a judge near it.

| File | Holds |
|------|-------|
| `register.py` + `lexicons/register_markers.json` | the **swell-read** — a deterministic (no-LLM) hedge-vs-booster grader, per 100 words, the two poles reported SEPARATELY. The un-foolable ground-truth read BEFORE any judge. Wired to scan our drawer / form-vector artifacts (`scan_artifacts`); `scan_text` is the import-stable core. Lexicon = Hyland 2005 + Wikipedia W2W + CoNLL-2010/BioScope + LIWC samples. |
| `wards.py` | the **circularity wards** — (1) the NULL-CONSTRUCT decoy (`flux-resonance`, referent-less; the nameless-entity sink predicted to score at floor — the ward against "the thinker thinks then the prover proves"); (2) the ABLATION harness (`ablate` / `ablation_pair` — ritual-stripped twins for the ablation-dissociation control: does the score read the PROSE or the ornament?). |
| `sealed/` | the **sealed-judge SCAFFOLD** (no live LLM yet). `setup-blind-judge.sh` → `rate-sealed.sh`: the judge runs from an EMPTY temp CWD, rubric inline, answer-key locked out, label-LAST. `prereg.py` freezes the rubric (by SHA-256) + the predicted decoy floor + the α-gate BEFORE scoring (verify fails closed on rubric drift). `score_alpha.py` scores Krippendorff's α PER FACET (ordinal; MASI for set-valued), with a bootstrap CI, and **gates on the LOWER bound** — never the point, never an across-facet average. |

Reuses the kernel maximally: ordinal α + the shared percentile-bootstrap engine +
the reliability bands all come from `qa_anchor.reliability` / `qa_anchor.bootstrap`.

```sh
python qa_anchor/register.py --selftest                   # deterministic grader sanity
python -m qa_anchor.sealed.score_alpha <raw.tsv> [floor]  # per-facet α, lower-bound gate
```

### What remains for the next sprint

- **The human-gold collection** — the kumu labels the whole rig scores against (the
  reliability layer already ships to back them).
- **The cross-family judge panel** — choose the judge models (cross-FAMILY, no
  Lares-native model rating Lares output) and wire `JUDGE_CMD` into `rate-sealed.sh`.
- **The crossed mixed-model + power analysis** — the design balance / power read
  (the QA-rig prereg red-team's mechanical-confound + identifiability cautions apply).
- **The Fisher-Rao flow-lens** — the geometry arm over the register/form-vector flow.
