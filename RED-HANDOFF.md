# RED HANDOFF — the herm as base course

**Branch** `feature/lararium-node-4` · everything below is committed · **nothing pushed**

## THE RULING (operator, 2026-08-19)
**Every vessel — node, browser, all, isomorphically — stands as a HERM first, then lifts.**
The herm is the **base course** of the lararium cap stack, never a sibling recipe.
Radical YIN cuts/rewrites approved for this collapse.

## THE CUT — one line, unmade
`packages/lararium-node/src/main.ts:153`
```ts
const standing = standAs(recipe === "herm" ? "herm" : "hearth", !sealShut);
//                 ↑ asks by FLAG        ↑ checks only the seal — never whether a face stands
```
`standAs` already carries the model: the floor is what you get, the hearth is what you EARN.
It is missing one condition. The shape:
```ts
standAs("hearth", !sealShut && aFaceStands)   // --recipe herm becomes a way to DECLINE the lift
```
**⚠ UNCOLLIDED: I never opened `standAs`.** Read it before cutting — I quoted its behaviour all
session from a summary line. If its second arg means something narrower, this names the wrong condition.

## WHY — four faults, one cause
A live `vessel stand` on a founded-but-FACELESS store dies. Four layers, all the same cause —
**a HEARTH composition running on a vessel that had only earned the BASE**:
1. `open-node-vessel` prefab read `bootstrap.daemonUrl` before `loadGenesis` ran → **FIXED** (thunks)
2. verb wiring called `personaBagIdFor(faceGroup())` eagerly → **GATED**
3. `resolveBinding` read `faceAgent()` on the boot path → **gate traded one fatal for another**
   (`"no resolveBinding configured"`, `daemon-behavior.ts:337`) — **NOT COMMITTED, uncommitted in tree**
4. …the next one, whatever it is
**The collapse removes all four gates as redundant.** Do not add a fifth.

## THE SHAPE
```
prepareNodeBoot            ← ALREADY shared by both doors (~1000 lines, no fork)
  → composeHerm            ← the base course, every vessel, always
    → + hearth caps        (a face stands)
    → + carriage caps      (meshSelf)
    → + wiki caps          (a user wiki)
```
`openNodeVessel` (:1670) and `openNodeHerm` (:1737) both call `prepareNodeBoot`; the ONLY fork is the
compose call. Memory: `composeLararium`/`composeBrowser` are ALREADY one function — so the remaining
collapse is `composeHerm` → base, `composeLararium` → base + lift. Browser mirrors for free
(`open-browser-vessel.ts:627` calls itself "the mirror of openNodeVessel").

## HELD RED — the acceptance vectors
`tests/e2e/herm-floor.test.ts` — **5/5 red, intentionally.**
R1 a herm reaches live · R2 serves the public shelf · R3 carries · R4 refuses hearth-scoped acts
legibly · R5 LIFTS into a lararium.
- **R1 is the enumerator** — its failure names the next site. Do not guess sites; run it.
- **⚠ R2–R4 are CASCADE reds** — they fail only because R1 never stood a daemon. After R1 greens,
  prove each fails independently (kill the read-face, remove the socket) or three vectors flip green
  having proven nothing.
- **⚠ R1–R5 may target the wrong door** — they stand a *lararium* recipe faceless. After the collapse
  there is ONE door; rewrite them against `stand`.
- No red-vector convention exists in this repo (zero `test.fails`/`test.todo`). Mine are the first.
  `TEST-ARCHITECTURE.md` wants an entry. **`test.fails` behaviour in this harness is UNCOLLIDED.**

## THE HERM, in the code's own words
`VesselClass = "hearth"|"leaf"|"herm"` · `NodeRecipe = "lararium"|"herm"` ·
`personaSlotCeiling("herm") === 0` → **"faceless-by-class"**
- **A herm HAS @daemon** — its own wiki, the immune core. "No wiki" in `node-caps:151` means no USER
  wiki. It holds no other operator bag a human decrypts locally.
- Its @daemon reads **OPEN to the founding operator** (kahu-cabal access: deferred to a multi-herm mesh).
- **The lift adds a face to a STANDING @daemon** — it never creates one. That is why the runbook's rite
  is two commands, not a migration.

## GREEN AND LANDED (do not re-derive)
face-join core + gate (5 refusal grounds) · daemon verb where the provider lives · re-grant so a seat
REACHES (`regranted` rides out) · a hearth never seats itself · lease decides / clock backstops ·
@daemon NEVER crosses → `hearthDaemonUrl` names the hearth's door · `pinnedDoc` (actor AND clock) ·
`admin` → `kahu-cabal` · root-`@` swept · the wiring seam (`operatorDaemonOptions`).
**Vectors:** 6 e2e face-join (live daemon) · 4 pair · 4 leaf-fleet · 38 keyhive · 136 node/775 ·
198 mesh/1888 · 26 cli/149 · 64 tw5/490.

## FOUR CLAIMS THAT TESTED FALSE (each read plausible; each cost a loop)
1. a wiped store self-heals via a repeat summons — **NO**, the ARCHIVE is the only keel; a seat is not a key
2. a seat reaches what the group holds — **NO**, a bag delegated BEFORE the join needs a re-delegate
3. pinning the actor makes bytes pure — **NO**, automerge also writes a wall-clock `time`
4. a hearth can just answer summonses — **NO**, @daemon fleet-syncs; a hearth never seats itself

## OPEN, NOT MINE TO DECIDE
- **The live click round-trip.** My trace says both projection legs stand; the operator remembers it
  unfinished. Unresolved. The join surface (Phase 1) rests on it.
- **Leaf-as-hearth relay** — can a browser ACCEPT an inbound crossing or only dial? Deferred to live infra.
- **`admin` prose** — 68 code comments + 86 memes still spell the old sense. Set aside by the operator.

## ORDER
0. read `standAs` → make the one-line cut → collapse compose → **remove the four gates** → green R1
1. prove R2–R4 independently → R5 (the lift) → rewrite vectors against the single door
2. the join surface (`daemon-face-join-tiddlers.ts`) → localhost → LAN
3. `--force` surface · fleet-reset lever · the herm vocabulary sweep ("waking floor"/"faceless place" → herm)

## THE PATTERN TO WATCH
Four times this session: fence the site just found → suite greens → the live path produces another.
**A vector that fences a SITE finds one; a vector that stands the PATH enumerates.**
And three vacuous greens: assert the code under test actually RAN.
