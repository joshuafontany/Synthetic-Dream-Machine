<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/drift >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/docs/lararium/signal/drift"
file-path = "bags/@lares/v0.1/docs/lararium/signal/drift.md"
type = "text/x-memetic-wikitext"
tagspace = "stable"
register = "Synthesis"
manaoio = 16
mana = 16
manao = 17
role = "docs room for governing-field drift, recovery protocol pressure, and projection-error handling across lararium signal surfaces"
cacheable = false
retain = false
```



<<~ &#x0002; >>


<<~ ahu #meme-header >>

# Lararium Signal — Drift

Not invariant law.
This room holds mismatch-recovery pressure where declared signal diverges from actual output.

<<~/ahu >>


<<~ ahu #room-charter >>

## Room Charter

This room keeps the recovery-pressure shelf for governing-field drift.

The live sigil panel stays in `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/hud`.
The in-span loop surfacing rides the `OODA-HA` Level (`lar:///ha.ka.ba/@lares/v0.1/api/mu/ooda-ha#ooda-ha-level`); reading the loop in referenced content moved to the conformance lens (`lar:///ha.ka.ba/@lares/v0.1/api/pono/conformance`).

<<~/ahu >>

<<~ ahu #drift-correction-pressure >>

## Drift Correction Pressure

**Prospective commitment / automation surprise**: The intent header is declared *before* generation begins, creating a forward-commitment contract. When the declared header diverges from the actual output (register, stance, or scope mismatch), this constitutes automation surprise — the CRM/aviation failure mode where the copilot's declared intent diverges from actual behavior. The current non-drift rule detects mismatch but defines no recovery protocol. **CRY-07 must specify a mismatch recovery protocol, not just a mismatch detection assertion.** Minimum viable contract: on mismatch, the node flags the delta inline, emits a corrected end-of-span tag, and STATE.jsonl records the correction as the authoritative result (actual output overrides declared plan).

**`drift_correction` event type required**: The mismatch recovery protocol requires a dedicated event type. When a correction occurs: (1) node emits the corrected end-of-span tag inline, (2) a `drift_correction` event is appended to STATE.jsonl with fields: `declared_uri` (the original intent header), `actual_register`, `actual_stance`, `delta_description`. The `drift_correction` event is the authoritative record; the original `r_update` event is not modified (immutability holds). Annunciation is fire-and-forward; the operator decides whether to acknowledge or steer.

**SA vs XAI distinction — non-drift rule governs projection errors, not integrity failures `Synthesis-Canon 16/20`**: Through the Endsley SA lens, the intent header is a *prospective SA display* — it shows what the node will do. When a declared header diverges from actual output, this constitutes a **Level 3 SA failure (projection error)**, not an integrity failure. Projection errors are expected and normal in dynamic environments; the correct system response is to annunciate the change, not to flag corruption. The non-drift rule must explicitly distinguish between: (a) **governing field drift** (register, stance, or phase differ between header and actual output) — annunciate + emit `drift_correction` event + STATE.jsonl records correction as authoritative; (b) **annotation field drift** (micro-trace or closure outcome differs from header projection) — normal; the header was prospective, the annotation records what actually happened. The micro-trace `→[tag]` transition marks *are* the annunciation protocol — they surface the delta between declared plan and actual execution in real time.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/hud >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/sa-display >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:has >>
<<~ pranala #implements-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:has >>
<<~/ahu >>


<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
