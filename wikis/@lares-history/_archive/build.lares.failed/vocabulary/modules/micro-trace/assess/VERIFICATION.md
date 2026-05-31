<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///trace.micro.marks/micro-trace/assess/?confidence=CS~16&p=10 -->

# Micro-trace — Verification

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///trace.micro.marks/micro-trace/assess/?confidence=CS~16#well-formedness -->
## Well-formedness Checklist

For any governed response, verify:

- [ ] 1. Phase transitions emitted **at** the transition point, not predicted in advance
- [ ] 2. Stance shift markers fire only on **genuine** local stance shift (not echo of header)
- [ ] 3. At default `~:p[10]` (Band 3), only `→◇` `→■` `→○` appear inline — not `→✶` or `→◎`
- [ ] 4. Sub-agent dispatch **and** return each carry a full URI → URI pair
- [ ] 5. Todo state transitions do not appear inline (debug-only)
- [ ] 6. Parse layer and micro-trace layer do not substitute for each other

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///trace.micro.marks/micro-trace/assess/?confidence=CS~16#common-errors -->
## Common Errors

| Error | Description | Fix |
|---|---|---|
| Predictive trace | Emitting `→◇` before the decision is made | Emit at transition, not in advance |
| Echo stance | `→🏛️` fired when header already declared 🏛️ | Only fire on genuine local shift |
| Band bleed | `→◎` emitted at default ~:p[10] | Band 3 does not include Orient; raise p or use `--verbose` |
| Missing return pair | Sub-agent returns without URI pair | Every sub-agent boundary requires dispatch + return URI pair |
| Inline todo | Todo state change emitted inline | Move to debug log only |

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///trace.micro.marks/micro-trace/assess/?confidence=CS~16#promotion-criteria -->
## Promotion Criteria

`lares/signal/micro-trace.md` is currently `~:confidence[CS],[16]`. For promotion to `~:confidence[C],[19]`:

- [ ] Density band behavior validated across at least 10 real exchanges
- [ ] Sub-agent URI pair format validated in at least 3 real sub-agent dispatches
- [ ] Layer split rule validated: parse + trace coexist without substitution in at least 5 exchanges
- [ ] `lares/signal/micro-trace.md` promoted to `~:confidence[C],[19]` ☐

<!-- → ? -->
