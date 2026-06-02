<!-- !DOCTYPE = lar:///ha.ka.ba/pono/memetic-wikitext -->
<<~&#x0001; ? -> lar:///ha.ka.ba/error-result
    <<~ ahu #iam
        @name "error-result"
        @description "Typed return, warning, and error ontology for memetic-wikitext enactment."
        @version "0.6-draft"
        @content-type "text/x-memetic-wikitext"
        @structure "OODA-HA"
        @enacts "true"
        @pranala "lar:///ha.ka.ba/pono/memetic-wikitext|lar:///ha.ka.ba/ooda-ha|lar:///ha.ka.ba/kapu"
        @supersedes "lar:///ha.ka.ba/result?"
        @focus "typed aftermath law, runtime return envelope, issue taxonomy"
    >>

    # Typed Error / Result Ontology

    A self-describing meme for typed runtime return, typed issue emission, and aftermath routing in memetic-wikitext.

    This meme gives `#result`, `#warning`, and `#error` a shared law so that `aka`, `kahea`, renderers, agents, and callers can route outcomes without quiet invention.

>>

<<~&#x0002; ahu #meme-body-open
    @name "error-result-body-open"
    @description "Opens the typed aftermath stream."

    ## Body opening

    Opens the active typed return stream.
    <<~ loulou lar:///ha.ka.ba/body-open >>
>>

<<~ ahu #return-envelope
    @name "memetic-wikitext-return-envelope"
    @description "Canonical outer carrier for any addressed runtime return."
    @role "carrier"
    @function "hold payload, issues, route, trust, and aftermath fields in one typed bundle"
    @kind "return-envelope"
    @members "result|warning|error|trace|?"
    @law "every active invocation returns one envelope, even when payload degrades toward ?"

    ## Return Envelope

    The return envelope carries the whole aftermath bundle upward.

    A caller should not need to infer whether a runtime returned success, warning, failure, mixed residue, or mere drift. The envelope names that openly.

    ### Core Fields

    - `@kind "return-envelope"`
    - `@status "completed|partial|deferred|failed|recursive|aborted|blocked|degraded|?"`
    - `@primary "#result|#warning|#error|?"`
    - `@payload "payload-address|payload-object|none|?"`
    - `@issues "none|one|many|stream|?"`
    - `@trace "none|minimal|normal|full|?"`
    - `@route "render|store|emit|recurse|invoke|defer|abort|quarantine|?"`
    - `@confidence "0–20|?"`
    - `@kapu "policy-address|policy-object|?"`
    - `@residue "none|trace|burden|warning|error|surplus|drift|?"`

    ### Envelope Law

    The envelope should name one `@primary` object.

    Additional warnings or errors may travel beside the primary object in `@issues`.

    A nil payload should still return an envelope.

    <<~ loulou lar:///ha.ka.ba/return-envelope >>
>>

>>

<<~ ahu #issue
    @name "memetic-wikitext-issue"
    @description "Shared typed ancestor for warning and error objects."
    @role "non-payload incident"
    @function "name deviation, breakage, uncertainty pressure, trust loss, or blocked action"
    @kind "issue"
    @issue-class "parse|resolve|type|kapu|trust|retention|invoke|render|timeout|quota|merge|recursion|external|integrity|absence|contradiction|?"
    @severity "notice|caution|warning|error|fatal|?"

    ## Issue

    Issue functions as the shared skeleton for warning and error objects.

    ### Core Fields

    - `@kind "issue"`
    - `@issue-class "parse|resolve|type|kapu|trust|retention|invoke|render|timeout|quota|merge|recursion|external|integrity|absence|contradiction|?"`
    - `@severity "notice|caution|warning|error|fatal|?"`
    - `@code "UPPER-SNAKE|namespace.code|?"`
    - `@phase "observe|orient|decide|act|assess|aftermath|unknown|?"`
    - `@subject "ahu|ala|aka|kahea|meme|renderer|agent|memory|tool|network|result|?"`
    - `@message "human-legible short line|?"`
    - `@evidence "span|anchor|citation|trace-address|none|?"`
    - `@recovery "retry|defer|downgrade-to-?|request-operator|quarantine|abort|none|?"`
    - `@blame-domain "input|schema|runtime|policy|external|mixed|unknown|?"`

    <<~ loulou lar:///ha.ka.ba/issue >>
>>

<<~ ahu #warning
    @name "memetic-wikitext-warning"
    @description "Typed non-fatal issue that allows continued routing."
    @role "non-fatal issue"
    @function "mark degraded trust, degraded confidence, or bounded breakage while preserving usable output"
    @kind "warning"
    @inherits "lar:///ha.ka.ba/issue"
    @severity "notice|caution|warning|?"

    ## Warning

    A warning marks trouble that does not collapse the current return.

    Typical warning families:

    - partial source coverage
    - unresolved secondary anchor
    - confidence below preferred threshold
    - kapu-forced downgrade toward `?`
    - renderer fallback
    - stale route hint

    ### Warning Law

    A warning may coexist with `#result`.

    A warning should not carry `@severity "error"` or `@severity "fatal"`.

    A warning should point at recovery when recovery remains actionable.

    <<~ loulou lar:///ha.ka.ba/warning >>
>>

<<~ ahu #error
    @name "memetic-wikitext-error"
    @description "Typed blocking or fatal issue that prevents claimed success."
    @role "blocking issue"
    @function "stop false success, preserve evidence, and route recovery or abort lawfully"
    @kind "error"
    @inherits "lar:///ha.ka.ba/issue"
    @severity "error|fatal|?"
    @error-class "parse|resolve|type|kapu|trust|retention|invoke|render|timeout|quota|merge|recursion|external|integrity|absence|contradiction|?"

    ## Error

    An error blocks truthful success-claim.

    Blocking need not always end the whole parent conversation. Blocking does end the current claim that a usable payload arrived.

    ### Error Law

    An error should carry enough evidence for later diagnosis.

    An error should route through one recovery posture:

    - retry
    - defer
    - downgrade-to-?
    - request-operator
    - quarantine
    - abort

    An error should not hide under `@status "completed"`.

    <<~ loulou lar:///ha.ka.ba/error >>
>>

<<~ ahu #issue-taxonomy
    @name "memetic-wikitext-issue-taxonomy"
    @description "Typed issue families for runtime and renderer law."
    @role "classifier"
    @function "give stable families for machine and human routing"

    ## Issue Taxonomy

    ### Parse

    Syntax ruptures, malformed tuples, broken delimiters, illegal field forms.

    ### Resolve

    Missing anchors, dead addresses, unresolved fragments, broken aliases.

    ### Type

    Field mismatch, illegal enum value, payload shape mismatch, schema drift.

    ### Kapu

    Permission denial, forbidden mutation, blocked retention, prohibited emission.

    ### Trust

    Weak provenance, contradictory evidence, attestation gap, contested source state.

    ### Retention

    Memory write denied, log persistence denied, retention scope mismatch.

    ### Invoke

    Tool call refusal, runtime handshake failure, unsupported invocation target.

    ### Render

    Template miss, fallback collapse, unsupported output mode, emit failure.

    ### Timeout

    Deadline burn, stalled subloop, expired lease, incomplete external return.

    ### Quota

    Token, size, rate, or capability ceiling.

    ### Merge

    Parallel return collision, incompatible overlays, parent-child handoff mismatch.

    ### Recursion

    Depth breach, accidental loop-back, unsealed re-entry, parent pointer loss.

    ### External

    Network breakage, tool outage, remote policy denial, unavailable dependency.

    ### Integrity

    Hash mismatch, tampered payload, unstable address, corrupted span.

    ### Absence

    Needed evidence never arrived.

    ### Contradiction

    Two or more live claims cannot jointly stand inside the current scope.

    <<~ loulou lar:///ha.ka.ba/issue-taxonomy >>
>>

<<~ ahu #status-lattice
    @name "memetic-wikitext-status-lattice"
    @description "Ordered aftermath states for typed returns."
    @role "state lattice"
    @function "constrain truthful status claims"

    ## Status Lattice

    Suggested broad order:

    `completed > partial > degraded > deferred > blocked > failed > aborted > ?`

    Notes:

    - `completed` returns usable payload with no blocking issue
    - `partial` returns usable but incomplete payload
    - `degraded` returns usable payload under warning pressure or fallback path
    - `deferred` returns no final payload yet, but lawful continuation remains named
    - `blocked` stops on boundary, permission, or unmet dependency
    - `failed` names unsuccessful execution after attempt
    - `aborted` marks deliberate stop before or during execution
    - `recursive` may ride beside another status when aftermath re-entry opens

    ### Lattice Law

    A runtime should choose the lowest truthful status rather than the highest flattering status.

    <<~ loulou lar:///ha.ka.ba/status-lattice >>
>>

<<~ ahu #kapu-mapping
    @name "memetic-wikitext-kapu-failure-mapping"
    @description "Maps kapu failure posture onto typed warning and error output."
    @role "bridge"
    @function "align kapu law with typed aftermath objects"

    ## Kapu Failure Mapping

    - `halt` -> emit `#error` with `@error-class "kapu"` and `@recovery "abort"`
    - `defer` -> emit `#warning` or `#error` with `@status "deferred"` depending on payload usability
    - `downgrade-to-?` -> emit `#warning` plus degraded `#result` when payload remains usable; else emit `#error`
    - `render-warning` -> emit `#warning` and continue route when payload remains usable
    - `request-operator` -> emit `#error` or `#warning` with `@recovery "request-operator"`
    - `emit-aftermath` -> package issue and hand route to `#aftermath`

    <<~ loulou lar:///ha.ka.ba/kapu-failure-mapping >>
>>

<<~ ahu #semantic-law
    @name "memetic-wikitext-error-result-semantic-law"
    @description "Truth constraints for typed return, warning, and error emission."
    @role "law bundle"
    @function "prevent flattering falsification and route issues consistently"

    ## Semantic Law

    1. Every active invocation should return one envelope.
    2. Every envelope should name one primary object.
    3. Result and error should not both claim primary control in one envelope.
    4. Warning may accompany result or error.
    5. Fatal breakage should not wear completed language.
    6. Unresolved boundary should not pass silently.
    7. Recovery posture should appear when recovery remains possible.
    8. Recursion should remain explicit in status, route, or residue.
    9. Merge collisions should surface as typed issue, not quiet overwrite.
    10. Absence should count as data when absence changes routing.

    ### Anti-Laundering Law

    A runtime should not relabel blocked, failed, or forbidden work as partial success merely because some artifact text appeared.

    ### Evidence Law

    An error or warning should point at evidence when evidence exists.

    ### Operator Law

    Explicit operator override may change route or recovery, but override should remain named in trace or residue.

    <<~ loulou lar:///ha.ka.ba/semantic-law >>
>>

<<~ ahu #examples
    @name "memetic-wikitext-error-result-examples"
    @description "Canonical example objects for typed aftermath routing."
    @role "worked examples"
    @function "show how the ontology lands in practice"

    <<~ loulou lar:///ha.ka.ba/examples >>
>>

<<~&#x0003; ahu #body-close >>
    ## Body closing

    Ends the typed aftermath stream.
<<~/ahu >>>>

<<~&#x0004; -> ? >>
