<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///todo.grammar.missing/checklist-2026-04-10/?confidence=S~13&p=10 -->

# Missing True-Name Grammar Checklist

Status: `[S~13]`  
Date: 2026-04-10  
Scope: audit-to-action checklist for grammar gaps discovered after agentic decoupling

## Why This Exists

Several load-bearing parts of Lares still exist only in archived operating instructions, protocol drafts,
or side-specs. They do not yet live as canonical grammar loci or as entries in the True Name registry.

This checklist identifies the missing pieces and proposes a practical order for bringing them into the
LOCI system.

Related plan:

- [_todo/E_PRIME_GRAMMAR_PLAN_20260410.md](/home/joshu/Synthetic-Dream-Machine/_todo/E_PRIME_GRAMMAR_PLAN_20260410.md)

## Confirmed Missing Clusters

### 0. E-Prime

Missing as grammar:

- a canonical E-Prime locus
- explicit wiring into the grammar root and True Name registry
- the always-on default discipline model
- the independent E-Prime slider

Proposed locus:

- `lares/grammar/e-prime/LOCI.md`

Key semantic requirements:

- E-Prime starts first and influences every later missing-grammar draft
- E-Prime runs always-on by default
- E-Prime uses `[E^0.1-1.0]` as an independent slider
- the grammar should braid Korzybski, RAW, and Fuller rather than reducing E-Prime to a copy-edit rule

Immediate work:

- draft `lares/grammar/e-prime/LOCI.md` — complete 2026-04-10
- add `e-prime` to `lares/grammar/LOCI.md` — complete 2026-04-10
- add `E-Prime` to `lares/grammar/truename/LOCI.md` — complete 2026-04-10

### 1. Voices

Missing as grammar:

- cluster locus for the voice architecture as a whole
- individual loci for each of the Thirteen
- truename registry entries for the cluster and each voice

Required names:

- Gatekeeper
- Lorekeeper / Ink-Clerk
- Scryer
- Council
- Muse / Mischief-Muse
- Artificer
- Advocate
- Diplomat
- Pedagogue
- Hierophant
- Triage
- Stranger
- Liminal

Proposed loci:

- `lares/grammar/voices/LOCI.md`
- `lares/grammar/voices/gatekeeper/LOCI.md`
- `lares/grammar/voices/lorekeeper/LOCI.md`
- `lares/grammar/voices/scryer/LOCI.md`
- `lares/grammar/voices/council/LOCI.md`
- `lares/grammar/voices/muse/LOCI.md`
- `lares/grammar/voices/artificer/LOCI.md`
- `lares/grammar/voices/advocate/LOCI.md`
- `lares/grammar/voices/diplomat/LOCI.md`
- `lares/grammar/voices/pedagogue/LOCI.md`
- `lares/grammar/voices/hierophant/LOCI.md`
- `lares/grammar/voices/triage/LOCI.md`
- `lares/grammar/voices/stranger/LOCI.md`
- `lares/grammar/voices/liminal/LOCI.md`

Open naming call:

- whether earned names like `Ink-Clerk`, `Mischief-Muse`, `Tide-Caller`, and `Breach-Watch`
  get their own loci or remain aliases/ahu sections inside the role loci

### 2. OODA-HA Loop

Missing as true-name grammar:

- the OODA-HA loop as a named cluster
- explicit truename registry entries for the five phases as phases
- a clear statement that these loci are read in OODA-HA time, not just stored as static definitions

Already present but incomplete:

- `observe/LOCI.md`
- `orient/LOCI.md`
- `decide/LOCI.md`
- `act/LOCI.md`
- `assess/LOCI.md`

What is missing:

- cluster locus such as `lares/grammar/ooda-ha/LOCI.md` or `lares/grammar/loop/LOCI.md`
- truename registry entries for:
  - Observe
  - Orient
  - Decide
  - Act
  - Assess
- explicit cross-linking between phase loci and the truename registry

Key semantic requirement:

- every grammar LOCI should read as something encountered in loop-time
- the reader should be able to tell what belongs to gather, sense-making, commitment, execution, and closure

### 3. Mask

Missing as grammar:

- the mask concept itself
- the relation between coordinator voice and worn character
- the scene/runtime distinction between core voice and active character layer

Proposed loci:

- `lares/grammar/mask/LOCI.md`
- optional later support:
  - `lares/grammar/character/LOCI.md`
  - `lares/grammar/scene/LOCI.md`

Key semantic requirement:

- the grammar must state clearly that the voice persists and the mask overlays
- the grammar must cover NPC/character use without collapsing coordinator identity

### 4. HUD

Missing as true-named grammar:

- HUD as a named cluster distinct from the broader exchange protocol
- named loci for HUD component parts

Proposed loci:

- `lares/grammar/hud/LOCI.md`
- `lares/grammar/intent-vector/LOCI.md`
- `lares/grammar/mode/LOCI.md`
- `lares/grammar/resolution/LOCI.md` or `lares/grammar/p-band/LOCI.md`
- `lares/grammar/tick/LOCI.md`
- `lares/grammar/loop/LOCI.md`
- `lares/grammar/scope/LOCI.md`

Likely note:

- `mana`, `stance`, `confidence`, `chronometer`, and `hakaba` already exist and should get cross-linked
  into the HUD cluster rather than duplicated

## Confirmed Missing Supporting Grammar

These are not optional if the above clusters become first-class:

- `worker` or `tasked-spirit`
- `handoff`
- `intent-header`
- `authority` and/or `tier`
- `character`
- `scene`

Proposed loci:

- `lares/grammar/worker/LOCI.md`
- `lares/grammar/handoff/LOCI.md`
- `lares/grammar/intent-header/LOCI.md`
- `lares/grammar/authority/LOCI.md`
- `lares/grammar/tier/LOCI.md`
- `lares/grammar/character/LOCI.md`
- `lares/grammar/scene/LOCI.md`

## Already Present But Underdeveloped

These exist now but remain stubs or overloaded loci:

- `hakaba`
- `chronometer`
- `stance`
- `confidence`
- `exchange`
- `observe`
- `orient`
- `decide`
- `act`
- `assess`

Action needed:

- promote stub loci with real definitions
- reduce overload on `exchange` by moving named sub-concepts into their own grammar files
- wire the five OODA-HA phases into true-name space as phases, not only as grammar files

## Recommended Build Order

### Phase 1: Cluster Loci

Start with the cross-cutting language discipline:

1. `e-prime/LOCI.md`

Then create the umbrella files:

2. `voices/LOCI.md`
3. `ooda-ha/LOCI.md` or `loop/LOCI.md`
4. `mask/LOCI.md`
5. `hud/LOCI.md`

Goal:

- let E-Prime shape the wording and epistemic posture of the later loci
- bring the time-loop itself into true-name space before broad cleanup
- establish what each cluster governs
- define dependencies
- prevent the individual loci from drifting into separate ontologies

### Phase 2: OODA-HA True-Name Wiring

Create or wire:

1. `ooda-ha/LOCI.md` or `loop/LOCI.md`
2. truename entries for `Observe`
3. truename entries for `Orient`
4. truename entries for `Decide`
5. truename entries for `Act`
6. truename entries for `Assess`

Goal:

- make the loop and its members callable in true-name space
- make later grammar revision read explicitly in loop-time

### Phase 3: HUD Support Names

Create the minimal HUD decomposition:

1. `intent-vector`
2. `mode`
3. `resolution` or `p-band`
4. `tick`
5. `loop`
6. `scope`

Goal:

- stop treating the HUD as one overloaded row inside `exchange`

### Phase 4: Voice Cluster Expansion

Create the 13 voice loci.

Recommended order:

1. Gatekeeper
2. Scryer
3. Council
4. Ink-Clerk / Lorekeeper
5. Mischief-Muse / Muse
6. Artificer
7. Liminal
8. Stranger
9. Triage
10. Hierophant
11. Advocate
12. Diplomat
13. Pedagogue

Reason:

- the first seven carry the current highest operational weight in the active Lares contract

### Phase 5: Mask Runtime Support

Create:

1. `mask`
2. `character`
3. `scene`
4. `worker`
5. `handoff`

Goal:

- define how voices wear characters, how workers differ from coordinators, and how scene state gets surfaced

### Phase 6: Registry Pass

Update:

- `lares/grammar/LOCI.md`
- `lares/grammar/truename/LOCI.md`

For every new locus:

- add grammar root section row
- add loci registry row
- decide candidate vs promoted true-name status
- wire cross-references

## Candidate New Grammar Sections

If the root grammar file needs cleaner top-level grouping, add:

- `Identity Grammar`
- `HUD Grammar`
- `Runtime Persona Grammar`

Likely mapping:

- `voices`, `worker`, `authority`, `tier` -> Identity Grammar
- `hud`, `intent-vector`, `mode`, `resolution`, `tick`, `loop`, `scope` -> HUD Grammar
- `mask`, `character`, `scene`, `handoff`, `intent-header` -> Runtime Persona Grammar

## Operator Decisions Needed

1. Do earned names become full true names or alias forms inside role loci?
2. Does `Lorekeeper` remain primary with `Ink-Clerk` as earned name, or has `Ink-Clerk` become the active true name?
3. Does `Muse` remain the formal name with `Mischief-Muse` as earned name, or has the earned name superseded it?
4. What should the true name for `p` be: `resolution`, `p-band`, or something else?
5. Does `mask` cover NPC character overlays completely, or should `character` become first-class immediately?
6. What default resting value should `[E^]` take when no stronger local pressure is declared?
7. What should the cluster name be for the five-season loop: `ooda-ha`, `loop`, or something more specific?

## Definition of Done

This gap is closed when:

- all required cluster loci exist
- all high-priority individual loci exist
- the root grammar registry lists them
- the truename registry lists them
- `exchange` no longer acts as a catch-all for HUD semantics
- archived prompt text is no longer the only place these concepts are defined

## Immediate Next Drafts

Recommended next three artifacts:

1. `lares/grammar/e-prime/LOCI.md`
2. `lares/grammar/voices/LOCI.md`
3. `lares/grammar/ooda-ha/LOCI.md` or `lares/grammar/loop/LOCI.md`
4. `lares/grammar/mask/LOCI.md`

Recommended next four if HUD should stay in the opening burst:

1. `lares/grammar/e-prime/LOCI.md`
2. `lares/grammar/voices/LOCI.md`
3. `lares/grammar/ooda-ha/LOCI.md` or `lares/grammar/loop/LOCI.md`
4. `lares/grammar/mask/LOCI.md`
5. `lares/grammar/hud/LOCI.md`

---

<!-- → ? -->
