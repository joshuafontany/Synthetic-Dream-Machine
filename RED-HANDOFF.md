# RED HANDOFF — the lift's last joint

**Branch** `feature/lararium-node-4` · committed · **nothing pushed**

## THE ONE RED

`tests/e2e/herm-floor.test.ts` **R5 — the lift.** R1–R4 stand green against the live path.

A vessel founded faceless, given a face by `lares persona new 0`, and stood again reaches
`[lararium] phase → live` as a full hearth — wiki, daemon, pool, read-face, crossing. The lift itself works.
Its face-scoped verb does not:

```
persona-selves-verb: the PersonaGroup plane is unresolved —
the @oracle registry names no lar:///ha.ka.ba/bags/@persona-4b47a29cacd89959
```

**The verb registers (a face stands) and its PLANE never does.** `runFoundTheFace` writes the group's doc id
into the bootstrap, and the next boot's @oracle registry carries no `@persona-<slug>` entry to resolve. Start
at `operator-daemon-behavior.ts` `resolvePersonaStore` → `oraclePlane.storeOf(personaBagIdFor(faceGroup()))`,
and walk back to who registers a bag into @oracle at boot vs. at founding. The name derives correctly; the
registration is what is missing.

## THE RULING, ENACTED
**Every vessel stands as a HERM and LIFTS to a hearth.** The lift reads whether a FACE stands, never which
recipe a flag asked for; `--recipe herm` DECLINES the lift. `main.ts` routes on `faceStands()`.

**The two facts stay apart.** A face lit names what a vessel HOLDS; the archive opening names what it can
OPEN. `standAs(asked, archiveOpens)` keeps the archive question and returns `"herm"` when it holds shut —
folding face-standing into that parameter would make a faceless place class-`herm`, where
`personaSlotCeiling("herm") === 0` bars the very face that would lift it. **MAY-HOLD-A-FACE ⊥ HOLDS-ONE-NOW.**

`composeHerm` / `composeLararium` still stand as two functions. The ROUTING collapsed; the composition did
not. Both already share `prepareNodeBoot`, so the remaining cut is presentational — do it when something asks
for it, not on principle.

## THE INSTRUMENT LAW — what this loop actually cost
Four of the five reds were the vectors measuring themselves, not the floor:
1. **Read the vessel's own log.** `lares vessel stand` DETACHES. A harness watching the launcher's pipe
   scores a vessel that reached `live` as one that printed nothing. Read `data/vessel/wake-serve.log`.
2. **Clear that log before standing.** The vessel APPENDS — a prior boot's `phase → live` answers instantly
   for a vessel that never came back up.
3. **Present a real key.** A zero key names nobody, and nobody is refused on CAPABILITY before the question
   the vector asks is ever reached. Use `fleetPeerDid()` under the test's own `LAR_ROOT`.
4. **Never fail-fast on a bare `/Error:/`.** The keyhive wasm prints `Error: Some(ReceiveCgkaOpError(...))`
   on a HEALTHY boot. Match faults this house raises.

**A red is a claim about the code. Collide the instrument before believing it.**

## CLAIMS THAT TESTED FALSE (do not re-derive)
- *a wiped store self-heals via a repeat summons* — the ARCHIVE is the only keel; a seat is not a key
- *a seat reaches what the group holds* — a bag delegated BEFORE the join needs a re-delegate
- *pinning the actor makes bytes pure* — automerge also writes a wall-clock `time`
- *a hearth can just answer summonses* — @daemon fleet-syncs; a hearth never seats itself
- *the `resolveBinding` gate trades one fatal for another* — `no resolveBinding configured` POSTS a result,
  never throws, on a path a faceless floor never walks. The gate is correct and load-bearing.
- *`standAs` needs a face condition* — see the ruling above; it would deadlock the founding.

## GREEN AND LANDED
face-join core + gate (5 refusal grounds) · daemon verb where the provider lives · re-grant so a seat REACHES ·
a hearth never seats itself · lease decides / clock backstops · @daemon NEVER crosses → `hearthDaemonUrl` ·
`pinnedDoc` (actor AND clock) · `admin` → `kahu-cabal` · the herm as base course · a face-scoped verb the
floor cannot run refuses by NAMING THE LIFT.

**Vectors:** herm-floor 4/5 · 6 e2e face-join · 4 pair · 4 leaf-fleet · 38 keyhive · 776 node · 198 mesh/1888 ·
26 cli/149 · 64 tw5/490 · typecheck clean.

## OPEN, NOT MINE TO DECIDE
- **The live click round-trip.** My trace says both projection legs stand; the operator remembers it
  unfinished. Unresolved.
- **Leaf-as-hearth relay** — can a browser ACCEPT an inbound crossing or only dial? Deferred to live infra.
- **`admin` prose** — 68 comments + 86 memes still spell the old sense. Set aside by the operator.
