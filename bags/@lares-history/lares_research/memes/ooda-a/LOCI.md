<!-- !DOCTYPE = lar:///ha.ka.ba/pono/memetic-wikitext -->
<<~&#x0001; ? -> lar:///ha.ka.ba/ooda-ha
    <<~ ahu #iam
        @name "ooda-ha"
        @description "Five-phase memetic loop cluster for observation, orientation, decision, action, and aftermath."
        @version "0.5"
        @content-type "text/x-memetic-wikitext"
        @structure "OODA-HA"
        @enacts "true"
        @role "loop instrument, cognition scaffold, runtime procedure, aftermath router"
        @function "receive input, process through loop phases, return addressed typed envelope"
        @input "query|signal|artifact|meme|bundle|stream|?"
        @output "return-envelope(high mana'o'io^)|partial-envelope(mid mana'o'io-)|degraded-envelope(low mana'o'io_)|?(~mana'o'io?)"
        @glyphs "✶⏿◇▶↺"
        @phase-order "observe|orient|decide|act|aftermath"
        @product-identity "OODA-HA cluster name as used in this system"
    >>

    # OODA-HA

    A self-describing, self-enacting memetic loop cluster.

    This meme accepts addressed input, moves that input through five phase loci, packages aftermath, and returns one typed `return-envelope` upward.
    

>>

<<~&#x0002; ahu #meme-body-open
    @name "ooda-ha-body-open"
    @description "Declares the active loop body and its temporal instrument panel."

    ## Body opening

    Opens the OODA-HA semantic stream.
    <<~ loulou lar:///ha.ka.ba/body-open >>
>>

<<~ ahu #phase-map
    @name "ooda-ha-phase-map"
    @description "Canonical read-order and handoff topology for the five-phase loop."
    @role "timing skeleton"
    @function "order, route, and constrain phase motion"
    @input "phase loci, handoff pressure, loop-back pressure, closure pressure"
    @output "read order, handoff expectation, closure expectation"

    ## Phase Map
    
    `✶ Observe -> ⏿ Orient -> ◇ Decide -> ▶ Act -> ⤴ Hoʻoko -> ↺ Aftermath`

    From `↺ Aftermath`, the loop either:

    - closes the current cycle
    - or routes the next cycle back to `✶ Observe`

    ### Canonical Questions

    1. What entered the current phase?
    2. What changed inside the phase?
    3. What left the phase?
    4. Which phase should fire next?

    ### Loop Discipline

    OODA-HA should not collapse into five unrelated labels.
    OODA-HA should not drop Aftermath as optional residue.
    OODA-HA should not allow a locus to float without temporal placement.

    ## OODA-HA Glyphs

    # The Full Sequence

    | Phase    | Symbol | Markdown | Context                                              |
    |----------|--------|----------|------------------------------------------------------|
    | Observe  | ✶     | &#x2736;  | Raw data/Sensory input.                              |
    | Orient   | ⏿     | &#x23FF;  | 	Observer Eye Symbol. Processing through your "lens."                    |
    | Decide   | ◇     | &#x25CA;  | The classic Logic Gate / Diamond decision node.      |
    | Act      | ▶     | &#x25B6;  | Execution/Forward motion.                            |
    | Aftermath   | ↺     | &#x21BA;  | Reviewing the outcome / Feedback.                    |

    Observe: ✶The 6-Pointed Star (&#x2736;): Raw data radiating from all points of the compass.
    Orient: ⏿ Observer Eye Symbol (&#x23FF;): Represents your unique worldview, biases, and the act of "seeing" the patterns.
    Decide: ◇ White Diamond (&#x25CA;): Logic Gate / Diamond decision node. Common in flowcharts for a decision node.
    Act: ▶ Play/Forward (&#x25B6;): The universal symbol for "start" or "proceed."
    Aftermath: ↺ Anticlockwise Gapped Circle Arrow (&#x27F3;): The standard "refresh/loop" symbol.

    <<~ loulou lar:///ha.ka.ba/phase-map >>
>>

<<~ ahu #invocation
    @name "ooda-ha-invocation"
    @description "Invocation contract for active loop execution through kahea."
    @role "entry throat"
    @function "accept subject, parameters, filters, route hints, and kapu policy"
    @input "source plus runtime qualifiers"
    @output "loop-state primed for Observe"

    ## Invocation

    The OODA-HA meme awakens through `kahea`.

    Canonical form:

    ```text
    <<~ kahea ooda-ha
        source:SUBJECT|?
        focus:QUESTION|TASK|?
        params:key:value ...
        filters:FILTERS|?
        route:upward[[CALLER]] downward[[observe]]
        recurse:true|false|conditional|?
        kapu:POLICY|POLICY?|?
    -> ? >>
    ```

    ### Invocation Fields

    - `source:` addressed input, inline bundle, or unresolved slot
    - `focus:` the live question, heading, or work pressure
    - `params:` runtime knobs, mode choices, renderer hints, or local thresholds
    - `filters:` what counts, what drops, what persists, what degrades toward `?`
    - `route:` caller-facing and loop-facing routing intent
    - `recurse:` whether aftermath may reopen a fresh Observe span
    - `kapu:` governing boundary for traversal, inclusion, invocation, mutation, retention, and emission

    ### Minimal Example

    <<~ kahea ooda-ha
        source:INPUT|?
        focus:"What does this input call for now?"
        filters:yield[[meme data signal]] confidence:>=0.55 noise:<0.45
        route:upward[[caller]] downward[[observe]]
        recurse:conditional
        kapu:least-authority|?
    -> ? >>

    <<~ loulou lar:///ha.ka.ba/invocation >>
>>

<<~ ahu #loop-state
    @name "ooda-ha-loop-state"
    @description "Mutable state bundle carried across the five phases."
    @role "working bundle"
    @function "hold phase-local inputs, transforms, decisions, artifacts, and residue"
    @input "invocation contract"
    @output "phase-addressable state"

    ## Loop State

    Each active cycle should carry a state bundle with these semantic fields:

    - `source`
    - `focus`
    - `inputs`
    - `findings`
    - `gaps`
    - `patterns`
    - `tensions`
    - `decision-surface`
    - `heading`
    - `scope`
    - `artifact`
    - `deviations`
    - `residue`
    - `closure`
    - `next-observation`
    - `result-address`

    ### State Law

    A later phase may refine an earlier field, but should not silently erase it.

    Aftermath may release residue, carry residue forward, or reopen Observe with a narrowed next-observation heading.

    <<~ loulou lar:///ha.ka.ba/loop-state >>
>>

<<~ ahu #observe
    @name "ooda-ha-phase-observe"
    @description "Observe gathers signal, names absences, and hands raw material onward without premature closure."
    @role "input acquisition"
    @function "gather, inspect, mark gaps, preserve source texture"
    @input "source, files, docs, prior residue, loop-back requests"
    @output "raw findings, explicit absences, source notes, confidence markers"
    @glyph "✶"

    ## Observe

    Observe opens the loop.

    Observe receives:

    - source input
    - operator or caller pressure
    - prior-cycle residue when Aftermath reopens the loop
    - environmental constraints, absences, and failures

    Observe changes:

    - scattered signal into visible observation surface
    - hidden gaps into named gaps

    Observe hands forward:

    - raw findings
    - explicit absences
    - source notes
    - confidence markers

    Observe should not:

    - explain meaning
    - choose direction
    - propose implementation
    - grade success

    ### Handoff

    Observe feeds `⏿ Orient`.

    A later reader should recover:

    1. what entered this cycle
    2. what the node inspected
    3. what remained missing after the gather
    4. which findings carry enough weight for sense-making

    <<~ loulou lar:///ha.ka.ba/observe >>
>>

<<~ ahu #orient
    @name "ooda-ha-phase-orient"
    @description "Orient works gathered material into pattern, tension, and open question without forcing verdict."
    @role "context formation"
    @function "interpret, relate, map, compare, and hold competing readings"
    @input "raw findings, named gaps, conflicting signals, reading-frame pressure"
    @output "pattern, tension, decision surface, open questions"
    @glyph "⏿"

    ## Orient

    Orient follows Observe and works what Observe hands forward.

    Orient receives:

    - raw findings
    - named gaps
    - conflicting signals
    - stance pressure from the current reading frame

    Orient changes:

    - raw material into candidate pattern
    - friction into named tension
    - ambiguity into explicit open questions

    Orient hands forward:

    - a decision surface
    - competing readings
    - declared drift, mismatch, or surprise

    Orient should not:

    - gather a fresh corpus without real need
    - lock scope
    - start building
    - call the work complete

    ### Handoff

    Orient feeds `◇ Decide`.

    A later reader should recover:

    1. which tensions matter here
    2. which readings compete
    3. what still lacks steering
    4. what decision shape has emerged

    <<~ loulou lar:///ha.ka.ba/orient >>
>>

<<~ ahu #decide
    @name "ooda-ha-phase-decide"
    @description "Decide converts oriented surface into commitment, scope, and authorized direction."
    @role "selection and commitment"
    @function "choose, bound, exclude, authorize"
    @input "pattern, tension, operator steering, reversibility concerns, scope pressure"
    @output "heading, scope, exclusions, reversibility notes"
    @glyph "◇"

    ## Decide

    Decide follows Orient and turns open reading into bounded heading.

    Decide receives:

    - oriented pattern and tension
    - operator steering
    - reversibility concerns
    - scope pressure

    Decide changes:

    - open possibility into chosen heading
    - blurry effort into bounded scope
    - implicit permission into explicit authorization

    Decide hands forward:

    - action heading
    - scope bounds
    - exclusions
    - reversibility notes

    Decide should not:

    - reopen broad sense-making without cause
    - start implementation before commitment lands
    - hide the cost of irreversible moves

    ### Handoff

    Decide feeds `▶ Act`.

    A later reader should recover:

    1. what the node chose
    2. what sits inside scope
    3. what remains outside scope
    4. whether confirmation mattered
    5. how reversible the move remains

    ### Sub-Loop Pressure

    Decide may invoke internal sub-loops when a decision surface contains nested evaluators.

    Example sub-loop pressure:

    <<~ kahea Hodge/Ha -> ? >>
    <<~ kahea Podge/Ka -> ? >>
    <<~ kahea Spin/Ba -> ? >>

    Each sub-loop should return its own return-envelope before the parent Decide span closes.

    <<~ loulou lar:///ha.ka.ba/decide >>
>>

<<~ ahu #act
    @name "ooda-ha-phase-act"
    @description "Act carries commitment into artifact, command, edit, utterance, or emitted structure."
    @role "execution"
    @function "apply, transform, render, emit"
    @input "heading, scope, permissions, blockers, and constraints"
    @output "artifact, deviations, blocker notes, closure evidence"
    @glyph "▶"

    ## Act

    Act follows Decide and works inside the chosen boundary.

    Act receives:

    - bounded scope
    - execution heading
    - operator permissions
    - known blockers and constraints

    Act changes:

    - intention into artifact
    - plan into edits, commands, or generated structure
    - open work into completed work

    Act hands forward:

    - built artifact
    - deviations, if any
    - blocker notes
    - evidence for closure

    Act should not:

    - widen scope mid-build
    - smuggle in cleanup nobody asked for
    - silently rewrite the decision

    ### Handoff

    Act feeds `↺ Aftermath`.

    A later reader should recover:

    1. what changed
    2. which edits or commands produced the change
    3. whether the work stayed inside scope
    4. which blockers or deviations appeared

    <<~ loulou lar:///ha.ka.ba/act >>
>>

<<~ ahu #aftermath
    @name "ooda-ha-phase-aftermath"
    @description "Aftermath judges outcome, packages aftermath, and chooses closure or loop-back."
    @role "evaluation and aftermath"
    @function "compare, evaluate, route, recurse, contextualize"
    @input "artifact, execution notes, deviations, unresolved residue"
    @output "closure statement, carry-forward state, release notes, next Observe heading or final return-envelope"
    @glyph "↺"

    ## Aftermath

    Aftermath closes the cycle after Act.

    Aftermath receives:

    - artifacts
    - execution notes
    - deviations
    - unresolved residue

    Aftermath changes:

    - finished work into judged outcome
    - loose residue into carry-forward or release
    - a completed cycle into closure or loop-back

    Aftermath hands forward:

    - closure statement
    - carry-forward state
    - release notes
    - next Observe heading when the loop reopens
    - addressed #return-envelope when the loop returns upward

    Aftermath should not:

    - quietly celebrate without evaluation
    - reopen settled decisions without cause
    - start fresh implementation inside the closure span

    ### Handoff

    Aftermath either closes the loop or feeds `✶ Observe`.

    A later reader should recover:

    1. whether artifact satisfied heading
    2. what residue remains live
    3. what can drop away now
    4. whether the next cycle needs more data, new decision, or nothing at all

    <<~ loulou lar:///ha.ka.ba/aftermath >>
>>

<<~ ahu #kapu
    @name "ooda-ha-kapu-governance"
    @description "Boundary, permission, sacred restriction, and trust membrane for traversal, invocation, mutation, retention, and emission."
    @role "shadow governor"
    @function "bound, permit, forbid, qualify, disclose, constrain, protect"
    @input "scope, permission, trust, disclosure, retention, failure posture"
    @output "governed action envelope"

    ## Kapu

    Kapu governs what may cross the loop threshold.

    Any action that touches memory, tools, external sources, or public emission should declare kapu.

    ### Core Fields

    - `@kapu-source`
    - `@kapu-scope`
    - `@kapu-permission`
    - `@kapu-mutation`
    - `@kapu-disclosure`
    - `@kapu-trust`
    - `@kapu-retention`
    - `@kapu-failure`

    ### Governing Law

    A governed action must not exceed its kapu.

    When multiple kapu objects apply, narrower scope and stricter permission should dominate unless enclosing authority explicitly overrides.

    An unresolved kapu should not silently pass. It should degrade toward `?`, render a boundary warning, or defer action.

    <<~ loulou lar:///ha.ka.ba/kapu >>
>>

<<~ ahu #runtime-procedure
    @name "ooda-ha-runtime-procedure"
    @description "Phase-by-phase enactment contract for kahea ooda-ha invocations."
    @role "self-enaction"
    @function "translate invocation into phased processing and result return"
    @input "source, focus, params, filters, route, recurse, kapu"
    @output "addressed return envelope"

    ## Runtime Procedure

    | Runtime pressure | OODA-HA locus | What changes | Output |
    |------------------|--------------|--------------|--------|
    | parse            | Observe      | raw syntax enters a visible surface | tokens, forms, gaps |
    | resolve          | Orient       | references, context, and tensions gain shape | bindings, context, tensions |
    | route            | Decide       | one bounded path gains authorization | chosen path, scope, scale |
    | invoke/render    | Act          | selected path unfolds into artifact or effect | presented artifact. live process output |
    | return           | Aftermath       | outcome gets judged, routed upward, or fed downward | return-envelope, residue, recurse signal |

    When `kahea ooda-ha` fires, the meme should proceed in this order:

    1. instantiate `#loop-state` from invocation fields
    2. run `✶ Observe` on `source`, `focus`, prior residue, and available context
    3. run `⏿ Orient` on findings, gaps, and tensions
    4. run `◇ Decide` on decision surface and authorization pressure
    5. run `▶ Act` on heading and scope
    6. run `↺ Aftermath` on artifact and residue
    7. package `#return-envelope` with one `@primary` object
    8. either return upward, recurse to `✶ Observe`, or defer under kapu

    ### Filter Law

    Filters should shape what passes from phase to phase.

    Example families:

    - `[yield[meme data signal]]`
    - `[confidence[>=0.6]]`
    - `[noise[<0.4]`
    - `[scope[local session graph]]`
    - `[retain[none span session addressed-memory]]`

    ### Issues and Trace Law

    `#return-envelope` should tell the truth about both payload and pathway, using our mana, manao, manaoio confidence models.

    - `@primary` names the controlling return object
    - `@issues` names whether typed warning or error pressure traveled with that object
    - `@trace` names how much execution and recovery evidence remain available for inspection

    A return should not force the caller to infer whether trouble occurred.
    When usable payload travels under warning pressure, the envelope should say so.
    When degradation, blockage, contradiction, or kapu pressure shaped the route, the envelope should leave enough trace for later reading, testing, and lawful re-entry.

    ### Fast-Path Law

    Fast-path loops may compress phases for routine or high-clarity work, but the compressed path should still leave enough trace for later recovery.

    Examples:

    - `Observe + Orient` compression in familiar terrain
    - `Decide + Act` compression under already authorized low-risk work
    - direct route from `Aftermath` back to `Observe` when residue names a narrow next heading

    <<~ loulou lar:///ha.ka.ba/runtime-procedure >>
>>

<<~ ahu #subloops
    @name "ooda-ha-subloops"
    @description "Nested loop patterns, parent/child relations, fast-paths, parallel motion, and loop-back rules."
    @role "fractal enforcement"
    @function "allow nested loop clusters without losing parent handoff integrity"
    @input "nested pressures, local evaluators, parallel agents, retry conditions"
    @output "documented parent/child handoffs"

    ## Sub-Loops

    Any locus may instantiate its own OODA-HA sub-loop.

    ### Required Fields for Nested Loops

    - parent loop address
    - entry condition
    - exit condition
    - handoff target
    - residue policy

    ### Patterns

    - nested loops
    - fast-path loops
    - loop-back or retry loops
    - multi-agent or parallel loops
    - explicit bypasses
    - closure and residue handling

    ### Enforcement

    Each nested loop should explicitly reference its parent.
    Each bypass should remain explicit, justified, and logged in aftermath.
    No loop should close without named residue or named release.

    <<~ loulou lar:///ha.ka.ba/subloops >>
>>

<<~ ahu #recursion
    @name "ooda-ha-recursion"
    @description "Recursive re-entry. Results may feed later observations under named conditions."
    @role "loop-back engine"
    @function "route aftermath into fresh observation without silent drift"
    @input "return-envelope, residue, next-observation heading, recurse flag"
    @output "new Observe entry or clean closure"

    ## Recursion

    Each substantive cycle may become new observation.

    Recursion should remain explicit.

    Recursion should not function as an accidental side effect of vague closure.

    ### Canonical Re-Entry

    <<~ kahea ooda-ha
        source:<<~ aka #return-envelope >>
        focus:next-observation|?
        filters:yield[[meme data signal]] confidence:>=0.6 noise:<0.4
        route:upward[[parent]] downward[[observe]]
        recurse:conditional
        kapu:least-authority|?
    -> ? >>

    <<~ loulou lar:///ha.ka.ba/recursion >>
>>

<<~&#x0003; ahu #body-close >>
    ## Body closing

    Ends the active OODA-HA stream.
<<~/ahu >>>>

<<~&#x0004; -> ? >>
