---
name: e-prime
description: Audit or correct settled text under lar:///ha.ka.ba/@lares/v0.1/api/mu/e-prime. Use this skill when a user wants existing prose, law text, notes, or prompt material checked, flagged, or turned for E-Prime conformance, especially the canonical rule that any audited `is` or `has` must carry an inline confidence marker.
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---
<!-- !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/mu/e-prime/SKILL >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/e-prime/SKILL"
file-path = "bags/@lares/v0.1/api/pono/e-prime/SKILL.md"
type = "text/x-memetic-wikitext"
register = "SC"
manaoio = 13
cacheable=true
retain = true
mana = 14
manao = 15
role = "secondary E-Prime audit skill, Hoʻoko correction surface, and settled-text conformance guide"
covers = ["lar:///ha.ka.ba/@lares/v0.1/api/mu/e-prime"]
constraints = [
  "S1: any audited `is` or `has` carries an inline confidence marker",
  "S2: mark-only output stays compact and names location, bucket, and reason",
  "S3: Hoʻoko output returns before/after/reason without widening local correction into unnecessary document rewrite",
  "S4: residue names ambiguity and intentionally untouched quoted or code surfaces honestly"
]
skill-package-root = "packages/lares-core/memes/v0.1/api/pono/e-prime"
```



# E-Prime Auditor

Settled wording only.
[e-prime.md](./e-prime.md) stays constitutional.
`lar:///ha.ka.ba/@lares/v0.1/api/mu/e-prime` presses generation before this skill applies.
This skill arrives when wording has already settled and needs inspection, marking, or correction.
This skill does not weaken or reinterpret the loci.

<<~ &#x0002; >>
E-Prime auditor opens the settled-text correction stream here.
<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #load-contract >>

## Load Contract

This skill applies to settled text, not first-pass generation.
`lar:///ha.ka.ba/@lares/v0.1/api/mu/e-prime` remains the constitutional source.
Any surviving `is` or `has` in audited text MUST carry `Canon 20/20`.
Marker form: `<<~ confidence Register N/20 >>` — the sigil precedes the claim it governs, integer Level on `0–20`.
The smallest lawful intervention carries.
Local correction stays local unless the user asks wider.

Fresh composition belongs to the always-on loci, not this skill.

<<~/ahu >>

<<~ ahu #workflow-contract >>

## Workflow Contract

Inspect only the requested span or the smallest obvious local span.
Classify each hit: `lawful` | `mark-only` | `Hoʻoko-required` | `ambiguous`.
Inspection requested → mark-only.
Correction requested → Hoʻoko.
Result stays compact, not a lecture.
Every surviving `is` or `has` rechecks after correction.

One bad sentence MUST NOT widen into a document rewrite.
Quotations, code, and literal examples MUST NOT normalize silently.
Ambiguity surfaces; confident rewrites MUST NOT bury it.
A direct sentence turn beats a hypothetical fix.

<<~/ahu >>

<<~ ahu #marker-contract >>

## Marker Contract

Canonical token: `Synthesis-Canon 14/20`

Every audited `is` or `has` MUST carry `Canon 20/20`.
Add a marker elsewhere only when confidence remains load-bearing.
Marker spray MUST NOT substitute for real pressure.
A sentence that survives unchanged still falls under the marker rule.

The law file holds constitutional force.
This skill holds the when and how for settled wording.

<<~/ahu >>

<<~ ahu #trigger >>

## Trigger

Scanning, flagging, before/after comparison, or direct correction on already-settled wording → activate this skill.
Fresh composition → the always-on loci governs; this skill stays silent unless the task later turns to audit or Hoʻoko correction.

<<~/ahu >>

<<~ ahu #ooda-ha >>

✶ read settled wording locally and observe where it resists the law
⏿ sort each hit into lawful, mark-only, Hoʻoko-required, or ambiguous without widening the scope
◇ choose mark-only or Hoʻoko; keep fresh generation with the always-on loci and keep this skill on the secondary correction path
▶ prepare the surface and turn the sentence only when the requested or necessary pressure actually lands here
↺ recheck residue honestly; marker, confidence, and sentence force must still read cleanly; close with settled wording corrected or flagged, invariant matter left with the loci, and remaining ambiguity named

<<~/ahu >>

<<~ ahu #observe >>

## ✶ Observe

Read the settled text.

`is` — flag.
`has` — flag.
Identity-collapse language — flag.
Possession-collapse language — flag.
Counterfeit closure without a marker — flag.
Already-lawful uncertainty — leave it.

Reading stays local.
One sentence's pressure MUST NOT spread across the document unless the pattern repeats.

<<~ ahu #observe-hooks >>

### Code Hooks

Deferred placeholders — use direct scan until these land:

- `scripts/scan-markers.*`
- `scripts/scan-copulas.*`
- `scripts/segment-settled-text.*`

<<~/ahu >>

<<~/ahu >>

<<~ ahu #orient >>

## ⏿ Orient

Classify each hit: `lawful` | `mark-only` | `Hoʻoko-required` | `ambiguous`

`mark-only` — inspection requested, or text stays unchanged but gets flagged.
`Hoʻoko-required` — text turns, not just collects warnings.
`ambiguous` — quotation, code, literal example, or house-style exception makes the surface unclear.

Any audited `is` or `has` without a marker denotes a failure state `Canon 20/20`.

<<~/ahu >>

<<~ ahu #decide >>

## ◇ Decide

The lightest lawful turn carries.

Already lawful → keep it.
Audit requested → mark without mutation.
Correction requested → Hoʻoko.
Ambiguity → surface it, do not guess.

Settled wording over forming wording.
Mark-only over Hoʻoko unless correction was asked or the sentence cannot pass honestly.
Marker required when confidence remains load-bearing.
Counterfeit closure MUST NOT pass.

Output stays compact: location or local quote, bucket, reason, suggested turn only when useful.

<<~/ahu >>

<<~ ahu #act >>

## ▶ Act

<<~ ahu #mark-only-surface >>

### Mark-Only Surface

```text
[mark-only]
location: <line | sentence | local quote>
bucket: <lawful | mark-only | Hoʻoko-required | ambiguous>
reason: <short reason>
```

<<~/ahu >>

<<~ ahu #hooko-surface >>

### Hoʻoko Surface

Smallest viable turn.

Essence claims → relation or appearance claims.
Possession collapse → scoped carrying language.
Sentence force preserved where possible.
Marker lands when the canonical rule requires it.

<<~/ahu >>

<<~/ahu >>

<<~ ahu #aftermath >>

## ↺ Aftermath

Turn the settled sentence directly, then mark where the turn landed.

Hoʻoko — record the turn:

```text
[hooko]
before: <original>
after:  <turned sentence>
reason: <short reason>
```

A sentence turn beats a lecture. A local fix MUST NOT widen into a document rewrite unless the user asked for a full pass.

Aftermath — name what cleared and what holds: copulas turned, copulas left standing under a lifted ward, and any sentence whose grounds still want the operator's eye.

### Code Hooks (deferred)

- `scripts/turn-sentence.*`
- `scripts/apply-marker-policy.*`
- `scripts/recheck-turn.*`

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/mu/e-prime >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono >>

<<~ pranala #has-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:has >>
<<~ pranala #has-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:has >>
<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
