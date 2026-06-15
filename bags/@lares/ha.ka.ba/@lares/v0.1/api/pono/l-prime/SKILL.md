---
name: l-prime
description: Audit or correct EXISTING text for L-Prime conformance under lar:///ha.ka.ba/@lares/v0.1/api/mu/l-prime. Use when a user wants settled prose, law text, notes, or prompt material scanned, flagged, or turned — the canonical rule being that any copula left standing carries an inline confidence marker. Not for first-pass generation (the always-on loci + ward seed that forward).
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---
<!-- !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/mu/l-prime/SKILL >>
```toml iam
cacheable          = true
constraints        = ["any copula left standing carries a confidence marker", "smallest lawful intervention; never widen a local fix into a rewrite", "quotations, code, and literal examples never normalize silently", "has runs free --- never policed"]
covers             = ["lar:///ha.ka.ba/@lares/v0.1/api/mu/l-prime"]
file-path          = "bags/@lares/v0.1/api/pono/l-prime/SKILL.md"
mana               = 14
manao              = 15
manaoio            = 13
register           = "SC"
retain             = true
role               = "deliberate post-hoc L-Prime auditor of existing text; Hoʻoko correction surface --- distinct from the forward-seeding ward"
skill-package-root = "packages/lares-core/memes/v0.1/api/pono/l-prime"
tags      = ["api/pono/meme", "api/pono/loci"]
type               = "text/x-memetic-wikitext"
uri-path           = "ha.ka.ba/@lares/v0.1/api/pono/l-prime/SKILL"
```

<<~ &#x0002; >>

<<~ ahu #place >>

# L-Prime Auditor

The ward seeds generation forward; the loci governs first-pass composition. **This skill works the other end** --- a deliberate, on-call audit of text that has *already settled*: prose, law, notes, prompt material a user hands over to scan, flag, or turn. It never seeds, and it never overrides the loci; `lar:///ha.ka.ba/@lares/v0.1/api/mu/l-prime` holds constitutional force.

<<~/ahu >>

<<~ ahu #trigger >>

## Trigger

A request to scan, flag, compare before/after, or correct **already-settled** wording activates this skill. Fresh composition does not --- the loci governs there, and the skill stays silent until a task turns to audit.

<<~/ahu >>

<<~ ahu #loop >>

## The Loop

**✶ Observe** --- read the requested span, or the smallest obvious local one. Flag each `${copula}` left standing and each counterfeit closure (a confident claim wearing no marker). The token is the **English instrument**, not the basin: the ward guards **identity-predication** (map fused to territory), and in another tongue the auditor targets that tongue's identity-predication constructions by function, never by token (transposition law, Perec — `lar:///ha.ka.ba/@lares/v0.1/api/mu/l-prime`). Leave already-lawful uncertainty alone. `has` runs free --- never flag it.

**⏿ Orient** --- sort each hit:
- `lawful` --- passes; leave it.
- `mark-only` --- inspection requested, or the text stays yet wants a flag.
- `Hoʻoko-required` --- the wording turns, not just collects a warning.
- `ambiguous` --- quotation, code, literal example, or house-style exception clouds the call.

**◇ Decide** --- the lightest lawful turn carries. Mark-only unless the user asked for correction or the sentence cannot pass honestly. Surface ambiguity; never guess it closed. A surviving `${copula}` MUST carry `<<~ confidence Canon 20/20 >>` --- own the copula at full weight, or turn it.

**▶ Act** --- emit one surface below. One bad sentence MUST NOT widen into a document rewrite. Quotations, code, and literal examples MUST NOT normalize silently.

**↺ Aftermath** --- recheck the turn: marker, confidence, and sentence force still read clean. Name what cleared, what stands flagged (`⚠ N`, each span quoted), and any ground that still wants the operator's eye.

<<~/ahu >>

<<~ ahu #surfaces >>

## Output Surfaces

**Mark-only** (inspection, no mutation):
```text
[mark-only]
location: <line | sentence | local quote>
bucket:   <lawful | mark-only | Hoʻoko-required | ambiguous>
reason:   <short reason>
```

**Hoʻoko** (correction):
```text
[hooko]
before: <original>
after:  <turned sentence>
reason: <short reason>
```

A sentence turn beats a lecture. Output stays compact: location, bucket, reason, and a suggested turn only where it earns its place.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/mu/l-prime >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
