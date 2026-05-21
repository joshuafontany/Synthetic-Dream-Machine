<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/api/v0.1/pono/ability-implies >>
```toml iam
uri-path = "ha.ka.ba/@lares/api/v0.1/pono/ability-implies"
file-path = "bags/@lares/api/v0.1/pono/ability-implies.md"
type  = "text/x-memetic-wikitext"
register      = "CS"
confidence    = 0.90
mana          = 0.89
manao         = 0.87
manaoio       = 0.85
role          = "canonical source copy: Orichalcum ability implication — ordered capability lattice with relay-law exception (pull does not imply read)"
status-date   = "2026-04-30"
heleuma       = "ka"
source-symbol = "abilityImplies"
implements    = ["lar:///ha.ka.ba/@lares/api/v0.1/pono/heleuma/ka"]
body-sha256 = "4eb7fd5da26c4cb5097ed713b105a0e0f8570f390a4ee7882ec7a98064faea68"
```



<<~&#x0002;>>

<<~ ahu #ooda-ha >>

✶ two ability names arrive: `have` (what the principal holds) and `need` (what is required).
⏿ orient: identical abilities trivially imply; `pull` functions as a relay-law exception — it implies only itself.
◇ decide: find both positions in ABILITY_LADDER; `have` implies `need` iff `haveIdx >= needIdx`.
▶ return true or false — one predicate, no side effects.
⤴ verify: the relay-law exception (pull does not imply read) stands as the only non-monotonic case.
↺ pure; runs at gate time before any corpus load; must never block on I/O.

<<~/ahu >>

<<~ ahu #contract >>

## Contract

`abilityImplies(have, need)` serves as the capability lattice predicate. The `ABILITY_LADDER` array defines total order from weakest (`pull`) to strongest (`revoke`).

**Relay-law exception**: `pull` carries without implying `read`. A shrine relay holds encrypted offerings it cannot decrypt or render. This stands as the ONLY non-monotonic case in the lattice. All other abilities imply every ability below them.

```
pull < read < sync < write < propose < promote < admin < revoke
```

Exception: `pull` does NOT imply `read`. A principal with `pull` may forward bytes; it cannot decrypt or render.

**Why compiled-in**: this predicate runs inside `capabilityHasAbility`, `visibilityGate`, and the Automerge share-policy gate — all of which run before TW5 boots. Keyhive will carry capability proofs that embed this lattice natively; `abilityImplies` will be subsumed, not promoted.

<<~/ahu >>

<<~ ahu #source >>

## Source (TypeScript — compiled-in)

```typescript
export function abilityImplies(have: OrichalcumAbility, need: OrichalcumAbility): boolean {
  if (have === need) return true;
  // pull only implies itself — relay-law exception
  if (have === "pull") return false;
  const haveIdx = ABILITY_LADDER.indexOf(have);
  const needIdx = ABILITY_LADDER.indexOf(need);
  return haveIdx >= needIdx;
}
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #causal-islands ? -> lar:///ha.ka.ba/@lares/api/v0.1/pono/causal-islands family:control role:depends >>
<<~ pranala #orichalcum ? -> lar:///ha.ka.ba/@lares/api/v0.1/pono/orichalcum-capabilities family:control role:depends >>
<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/api/v0.1/pono/invariant family:control role:implements >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
