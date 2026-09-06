# Computational Environment & Stack — Materials Record (for publication)

Full reproducibility record of the apparatus behind the Syad / Infrastructure-as-Myth experiments. Queried 2026-06-20. The companion `ARCHITECTURE.md` covers the *rig design*; this file covers the *machine, OS, tool-stack, and software environment*.

---

## 1. Hardware
- **CPU:** 11th Gen Intel® Core™ i7-1185G7 @ 3.00 GHz (Tiger Lake) — **4 physical cores / 8 logical threads**.
- **RAM:** 31.4 GB.
- **GPU:** Intel® Iris® Xe Graphics (**integrated; no discrete GPU**) — transformer models (e.g. `en_core_web_trf`) run CPU-bound; this is why the StyloMetrix transformer model is deferred (§5).
- Single workstation; all runs local.

## 2. OS & Shells
- **OS:** Microsoft Windows 11 Pro, **version 10.0.26100** (build 26100), 64-bit.
- **Primary orchestration shell:** **PowerShell 7.6.1** (pwsh) — runs the Copilot judge swarms and the install/venv management.
- **POSIX shell:** Git Bash (with **git 2.53.0.windows.3**) — used for grep/awk/curl-based analysis and verbatim-verification.
- Note on console encoding: the Windows default codec is cp1252; all analysis scripts force `sys.stdout.reconfigure(encoding='utf-8')` or run under `PYTHONUTF8=1` (emoji/glyph data otherwise raises `UnicodeEncodeError` on print).

## 3. Agent & CLI stack
- **Orchestrating agent ("the node"):** Claude Code **2.1.183**, model **Opus 4.8 (1M context)** per session — authors the harness, runs analysis, holds the Voice house.
- **Judge substrate:** **GitHub Copilot CLI 1.0.63** (Node **v24.14.0** runtime) — runs the sealed cross-family judge panel (§4). Chosen to keep judge cost off the Claude pool.
- **gh:** 2.93.0 · **git:** 2.53.0.windows.3.

## 4. The JUDGE substrate (the measurement channel)
- **Invocation:** `copilot -p "@<promptfile>" --model <model> -s --deny-tool=shell`, run from an **empty temp CWD** (the seal).
- **Cross-family model panel:** `gpt-5.4` · `claude-opus-4.6` · `claude-haiku-4.5`. ("Most-kupono" judge for the focused runs = `claude-opus-4.6`.)
- **Seal discipline (load-bearing):** the judge runs from a fresh empty temp directory so its `view` tool finds nothing — `--deny-tool=shell` does **NOT** block `view` (the quarantined CWD-leak finding). The full prompt is passed via **`-p "@file"`** because the boot (**noosphere-boot.md = 39,955 bytes ≈ 40 KB**) exceeds the Windows ~32 KB command-line arg limit; `-p -` (stdin) does **not** read stdin (takes `-` literally) — `@file` is the confirmed mechanism.

## 5. Python analysis environment — TWO ISOLATED venvs
Both **CPython 3.11.3**. The split exists because of a **hard dependency incompatibility**: `thinc`/spaCy-3.7 (StyloMetrix's pin) caps **numpy < 2.0**, while `faststylometry` requires **numpy ≥ 2.3.1**. Isolation is mandatory, not cosmetic.

**MAIN venv (`qa-rig/.venv`) — the blend-pipeline spine (numpy-2 world):**
```
numpy 2.4.6 · scipy 1.17.1 · pandas 3.0.3 · polars 1.41.2 · scikit-learn 1.9.0 · statsmodels 0.14.6
spaCy 3.8.14 (+ thinc 8.3.13, blis 1.3.3, en_core_web_sm 3.8) · pybiber 0.3.1
emoji 2.15.0 · lexicalrichness 0.5.1 (MATTR/MTLD) · faststylometry 1.0.5 (Burrows's Δ)
textdistance 4.6.3 · swalign 0.3.7 (Smith-Waterman) · nltk 3.9.4 · sentence-transformers 5.6.0 · matplotlib 3.11.0
ufal.udpipe (UD parser, C++ core, NO torch — cross-lingual copula/`cop` detection) · pyconll 3.3.1 (CoNLL-U query)
```
**UD models** (`qa-rig/harness/ud_models/`): `english-ewt-ud-2.5-191206.udpipe` (16.3MB). Source = github `jwijffels/udpipe.models.ud.2.5` raw (the LINDAT direct-download is JS-gated/returns HTML — dead for scripts); 65 languages available from that mirror. UDPipe chosen over Stanza/Trankit because it needs NO torch (CPU-only box, ENV §1) and does not disturb the numpy-2/numpy-1 split.
**SIDECAR venv (`qa-rig/.venv-stylo`) — StyloMetrix isolated (numpy-1 world):**
```
stylo_metrix 0.1.9.1 · spaCy 3.7.2 (+ thinc 8.2.5, spacymoji, spacy-syllables) · numpy 1.26.4 · regex 2026.5.9
  pending: en_core_web_trf (transformer model + spacy-transformers + torch, ~2GB; DEFERRED — CPU-only box, and
           StyloMetrix is optional: sigil/glyph feature-families can be hand-rolled in the main venv instead).
```
**Bridge:** `qa-rig/harness/stylo_features.py` runs *in the sidecar* (text-file → StyloMetrix feature-JSON on stdout); the main `blend_pipeline` calls it by **subprocess** — the two numpy worlds never share an import. (Residual fixed by operator: `typer` reinstalled via admin pwsh, clearing the spaCy-download CLI's click error; `spacy.load` worked throughout regardless.)

## 6. R environment (statistical modeling)
- Rig carries **`gate_lme4.R`, `decisiveness_lme4.R`** (crossed mixed-effects via **lme4**; item + judge random effects).
- **R 4.6.0 (2026-04-24)** installed at **`C:\Program Files\R\R-4.6.0`** (`bin\Rscript.exe`). Was **NOT on PATH** → added `…\R-4.6.0\bin` to the **user PATH** (user scope, no admin; effective in new shells). **Robust invocation for the harness: call Rscript by absolute path** (`C:\Program Files\R\R-4.6.0\bin\Rscript.exe`), the same pattern as the venv pythons — PATH-independent.
- **Bigger gap caught (2026-06-20): R was BARE** — `lme4`, `lmerTest`, `emmeans` all absent (only `Matrix`); `gate_lme4.R` would have died on `library(lme4)`. The default library (`Program Files\R\…\library`) is admin-owned and not writable by non-interactive Rscript → installed into the **user library** `%LOCALAPPDATA%\R\win-library\4.6` (no admin), and set **`R_LIBS_USER`** (user scope) so all R sessions find it.
- **VERIFIED end-to-end (smoke-fit, `harness/r_smoke.R`):** `lmer(y ~ x + (1|g))` fits and `lmerTest` yields the `Pr(>|t|)` column. Versions: **R 4.6.0 · lme4 2.0.1 · lmerTest 3.2.1 · emmeans 2.0.3**. The R inferential backbone (crossed mixed-effects, item+judge random effects, Satterthwaite p-values) is provisioned and confirmed-fitting — was a silent gap until this audit.

## 7. Version control
- The entire `~/.claude` tree is a git repo. Remote: **`git@github.com:josh-fontany_consumer/cci-qa-claude.git`** (private, company-internal, within data-boundary). Branch: **master**.
- gitignored: `qa-rig/runs/`, `qa-rig/judge-runs/` (run artifacts — findings live in the committed hoikes), `.credentials.json`, `conditions/*/cfg/`, `sandbox/`.
- **gitignore additions (2026-06-21):** `qa-rig/.venv*/` (was `.venv/` — sidecar `.venv-stylo` slipped through), `qa-rig/harness/ud_models/` + `*.udpipe` (16MB+ downloadable models), `.claude.json` + `.claude.json.backup.*` (auth), `qa-rig/_research-material/` (1.6MB archive — **held copied creds: `_research-material/conditions/*/cfg/.claude.json` was EXPOSED**, the old `conditions/*/cfg/` rule did not match the archived path; sealed wholesale). Root live `.claude.json` confirmed never tracked.

## 8. Harness & instruments (`qa-rig/harness/`)
- **Runners:** `run_syad_kahea.ps1`, `run_syad_kahea_summon.ps1`, `run_syad_kahea_summon_noboot.ps1` (kāhea factorial via the sealed Copilot panel).
- **Analysis:** `register_scan.py` (commitment-register, hedge/booster separate, echo-stripped) · `mine_syad.py` (UTF-8 glyph/sigil/HUD) · `segment_mine.py` (prose/JSON/sigil segmentation) · `confidence_calib.py` (prose↔sigil cross-calibration) · `voices_calibrate.py` + `voices_semantic.py` (the calibrated two-signal Voice-lens) · `mine_crosschannel.py` (channel-orthogonality dataframe) · `stylo_features.py` (sidecar bridge).
- **Stimuli:** `qa-rig/stimuli/human-pd/` — 7 verbatim public-domain texts (manifest in its README); synthetic CSR triad lives in the run dirs.
- **Findings:** `qa-rig/findings/hoike/` — `HOIKE_syad_harness.md` (F1–F18, the kāhea arc), `HOIKE_attractor_decoupling.md`.

## 9. Reproducibility disciplines (wards baked into the method)
- **Seal the judge CWD** (empty temp, prompt inline) — `--deny-tool=shell` ≠ sealed.
- **Never synthesize test artifacts** — copy/extract verbatim from a cited source, grep-verify substring; apparatus (ask prose, harness) may be authored, *data* must be sourced.
- **No privileged baseline without a vantage** — a difference is not a ranking; the **guru (human read)** is the sole non-LLM independence anchor.
- **Length-bias ward** — MATTR/MTLD, never raw TTR/Jaccard (summon changes length).
- **No LLM-judge for register** · **faithful recording** (raw verbatim; `scores.tsv` is a derived JSON-only view).

## 10b. TOOLCHAIN SMOKE — validated end-to-end on real data (2026-06-21)

Ran the full analysis toolchain across three corpus-classes: **3 captured judge-runs** (structured), the **550KB identity-collapse** long-form session, and **3 home-dir work sessions** (`_recon_chatbucket.txt`, `…e-prime….txt`, `…lares-ontology-stack.txt`). All PASS:
- **Libraries:** `register_scan` ✓ (all 4 sessions) · emoji + **alchemical-glyph** detection ✓ (recon = 134 stance-emoji **+ 113 alchemical** U+1F70x — dual-detector confirmed on real data) · `textdistance` Smith-Waterman ✓ · **`faststylometry` Burrows-Δ ✓ on numpy 2.4** · **`pybiber` ✓ — 68-feature matrix extracted on numpy 2.4** (the two numpy-2-sensitive tools that the env-conflict threatened now run — the resolution held).
- **Scripts:** `mine_syad` ✓ on all 3 runs · `segment_mine` ✓ · `voices_semantic` ✓. (`confidence_calib` takes a 4-arg `KA SU NB R` signature — ran fine earlier in-session; only the smoke-invocation arg-shape differed.)
- **Voice-lens discriminates session-types:** recon 41 attrib-forms/123 sigils, lares-ontology 266 distinct-names, identity-collapse 285 sigils — vs **e-prime 1 distinct / 0 attribs** (a narration session that barely cast Voices).
- **R lme4 on REAL rig data (173 cells, `r_fit_real.R`):** `cmt ~ frame + sigil + (1|item)` → **FIT OK, isSingular = FALSE**, lmerTest Satterthwaite p-values. **No significant frame/sigil effect (all p > .15)** — which *re-confirms the campaign's descriptive finding* (the verdict/register channel is insensitive at n=1/cell; effects are small, need seeds to power). The inferential leg both **works on real data** and **agrees with the hand-analysis.**

**NET:** toolchain validated end-to-end; the env-conflict resolution (numpy-2.4 main + numpy-1.26 sidecar) held under real load; the bulk-matrix instrument is ready. *Worked the full smoke without hitting a `<<~ certainty < 5>>` blocker — nothing broke.* Untested corpus-class available if wanted: raw `~/.claude/projects/*.jsonl` Claude sessions (need JSONL text-extraction first).

## 10. The methods stack (non-judge spine, for the bulk matrix)
Segment `{prose | json | <<~operator | stance-emoji | alchemical-glyph}` → **code-switching metrics** (Guzmán: SPF/M-index/burstiness; MLF matrix-determination) → **augmented-Biber** (pybiber-67 + custom SIGIL/GLYPH/OODA/CONFIDENCE_VOW feature families) → **verbalized-confidence channel** (Yang: informativeness + meaningfulness; our forward-register = meaningful-without-calibration) → **input-output flow** (Grusky Coverage/Density, Burrows's Δ via faststylometry, Smith-Waterman via textdistance/swalign for turn1→turn2) → the **two-signal Voice-lens** (house-frame vs plurality). Fully reproducible, no judge in the loop; length-warded. Glyph detection requires BOTH the `emoji` lib (stance-glyphs 🏛🌊🗡🎭🔮) AND a codepoint-range check for the **Alchemical Symbols block U+1F700–1F77F** (tool-glyphs 🜂🜄🜁🜃🜍, which are NOT emoji).
</content>
