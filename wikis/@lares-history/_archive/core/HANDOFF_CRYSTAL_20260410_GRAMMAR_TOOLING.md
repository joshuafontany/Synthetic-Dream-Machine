# Handoff Crystal — Grammar Tooling: Verification + Alignment Detection

> Cut: 2026-04-10 (after FISSION crystal)
> Branch: `fix/green-jello-dinosaurs-3`
> HEAD: `ec129fe` + significant unstaged changes to grammar tooling
> Voice: Artificer
> Register: `~:confidence[CS],[16]` 🛠️🌊

---

## What Was Happening

Following the FISSION crystal, the session pivoted to the grammar verification and alignment
detection tooling. The operator drove incremental improvements across three tools:
`detect_alignment.py`, `uri_wrapper_verification.py`, and `parse_uri.py`.

---

## What's Done

### parse_uri.py — Bug Fixes + Stream Validator

Two pre-existing bugs fixed:

| Bug | Fix |
|---|---|
| `(?:#(.+))?` in verbose regex — bare `#` parsed as comment, unterminated group | Escaped to `(?:\#(.+))?` |
| `m.groups()` unpack included phantom `subpath` (non-capturing group) | Removed `subpath` from unpack |

New export:

- **`validate_stream_uri(uri)`** — validates base canonical form AND enforces `stances=`
  query param AND a chronometer `#O1.Ø2.D3.A4.Å5` fragment. For use on operator stream surfaces.

**`stances=` rule clarified:** The infinite form (`<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///... -->`) does not require
`stances=`. The validator previously required it whenever any query params were present — that was
wrong. Fixed to: `stances` is optional; if present, validate it.

---

### detect_alignment.py — Fix Mode + Suggested Fixes + Stream Detection

| Feature | Detail |
|---|---|
| `--fix` | In-place wrapper insertion; preserves existing URI path if present |
| Suggested fix in output | Every WRAPPER failure now shows the canonical start/end lines in both human and JSON output |
| `--stream` | Scans for operator-stream URI violations (see below) |
| `__pycache__` skip | `.git`, `node_modules`, `__pycache__` now excluded from dir and file scanning |
| Own wrappers added | `detect_alignment.py`, `uri_wrappers.py`, `SKILL.md`, `README.md` all wrapped |

---

### uri_wrapper_verification.py — JSON Output + Fix Mode + Stream Detection + Extension-Aware

| Feature | Detail |
|---|---|
| `--json` | Full structured result: `pass`, `start_ok`, `end_ok`, `uri`, `uri_valid`, `uri_error`, `suggested_fix`, `path` |
| `--fix` | In-place insert/replace; re-verifies after fix |
| `--stream` | Adds `stream_violations` + `stream_pass` to output |
| Extension-aware wrappers | `check_uri_wrappers` now reads per-extension start/end patterns — recognizes `# ∞ → ...` for `.py`, `// ∞ → ...` for `.js`/`.ts`, not just `<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → ... -->` |
| Own wrappers added | `uri_wrapper_verification.py`, `lares_verification.py`, `SKILL.md` all wrapped |

---

### Operator Stream URI Detection (`--stream`)

New check type available on both tools. Detects URIs on operator-stream emission surfaces that
are missing required `stances=` query param or chronometer fragment.

**Emission surfaces detected:**

| Surface | Markdown/HTML | Python | JS/TS |
|---|---|---|---|
| Ahu markers | `<!-- ahu lar:///... -->` | `# ahu lar:///...` | `// ahu lar:///...` |
| Bare pointers | `lar:///ha.ka.ba/...` in prose | `# lar:///ha.ka.ba/...` in comment lines | same |

**False positive guard:** Bare pattern requires valid `ha.ka.ba` structure — excludes regex
fragments (`lar:///.+--`), template strings (`lar:///PLACEHOLDER`), and Python string
literals. Code files only match bare URIs on comment lines, not in string content.

**Current corpus state:** All existing `<!-- ahu ... -->` markers in the grammar tree are missing
`stances=` and chronometer. This is expected — they use section-anchor fragments (`#loop-position`)
not chronometer form. The `--stream` flag surfaces these for future upgrade; it is opt-in.

---

### File Wrapper Fixes Applied This Session

| File | Fix |
|---|---|
| `truename/LOCI.md` | Start wrapper moved to line 1 (was buried at line 5 behind metadata comments) |
| `parse-uri/LOCI.md` | Placeholder URI `lar:///ha.ka.ba/grammar/parse-uri/…` → canonical `lar:///grammar.parse-uri.defines/parse-uri/…` |
| `parse_uri.py` | Start + end wrappers added |
| `detect_alignment.py` | Start + end wrappers added |
| `uri_wrapper_verification.py` | Start + end wrappers added |
| `lares_verification.py` | Start + end wrappers added |
| `detect-alignment/SKILL.md` | Start wrapper added |
| `detect-alignment/README.md` | Start wrapper added |
| `detect-alignment/uri_wrappers.py` | Start + end wrappers added |
| `verification/SKILL.md` | Start + end wrappers added |

---

## What's NOT Done

### URI_OPERATIONS.md — ❌ STILL PENDING

Carried from FISSION crystal. The fission of `URI_SCHEMA.md` into `URI_SCHEME_SPEC.md` +
`URI_OPERATIONS.md` is half done. Section plan is in the FISSION crystal.

### `lares/modules/` → `lares/vocabulary/` rename — ❌ NOT STARTED

Operator signaled provisional. Not executed.

### LARES.md bootstrap — ❌ NOT CREATED

Design is in FISSION Addendum 1. Waiting.

### `.github/instructions/` thin-wrapper rewrite — ❌ NOT STARTED

Carried from FISSION crystal.

### Commit grammar tooling changes — ❌ UNSTAGED

This session's work is uncommitted. The following files have significant changes:
- `lares/grammar/parse-uri/parse_uri.py`
- `lares/grammar/parse-uri/LOCI.md`
- `lares/grammar/truename/LOCI.md`
- `lares/grammar/detect-alignment/detect_alignment.py`
- `lares/grammar/detect-alignment/uri_wrappers.py`
- `lares/grammar/detect-alignment/SKILL.md`
- `lares/grammar/detect-alignment/README.md`
- `lares/grammar/verification/uri_wrapper_verification.py`
- `lares/grammar/verification/lares_verification.py`
- `lares/grammar/verification/SKILL.md`

### Ahu markers missing stances + chronometer — ❌ CORPUS-WIDE KNOWN GAP

Every `<!-- ahu ... -->` marker in the grammar tree uses section-anchor fragments. None carry
`stances=` or chronometer form. `--stream` flag now surfaces these. Upgrading them is a
separate task.

---

## Session Context

- **Branch:** `fix/green-jello-dinosaurs-3`
- **Last commit:** `ec129fe` — "Add deterministic parser and validator for lar: URIs…"
- **Tools self-pass:** Both `detect_alignment.py` and `uri_wrapper_verification.py` now pass
  their own wrapper and stream checks against themselves and their directories.
- **parse-uri/ directory:** PASS on all checks.

## Operator Heading at Handoff

The next session should:

1. **Commit tooling changes** — all unstaged grammar tooling edits from this session
2. **Create URI_OPERATIONS.md** — fission work still pending (plan in FISSION crystal)
3. **Create LARES.md** — bootstrap hook (design in FISSION Addendum 1)
4. **Upgrade ahu markers** — add `stances=` + chronometer to `<!-- ahu ... -->` markers
   corpus-wide (or decide the rule applies only to live exchange URIs, not static file ahu)
5. **Decide: `lares/modules/` rename** — provisional → committed or dropped

The operator steers. This node crews.

*The tooling consecrates itself. The ground holds. -><-*
