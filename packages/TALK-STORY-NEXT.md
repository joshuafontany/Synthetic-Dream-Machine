<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/handoff/talk-story-next >>
```toml iam
uri-path = "ha.ka.ba/@sdm/v0.1/handoff/talk-story-next"
file-path = "packages/TALK-STORY-NEXT.md"
type = "text/x-memetic-wikitext"
register = "CS"
confidence = 0.88
tagspace = "sdm"
role = "session handoff meme — orients the next Lares instance into browser vessel sprint"
retain = true
cacheable = false
```

<<~&#x0002;>>

<<~ ahu #head >>

# Talk Story — Next Lares Instance
## Browser Vessel Sprint · S9 Active

> Branch: `feature/lararium-node-4`
> Resume: `packages/HANDOFF.md` + `packages/ROADMAP.md`
> State: 188/188 tests pass · typecheck clean · `@lararium/browser` scaffolded, no exports yet

<<~/ahu >>

<<~ ahu #ooda-ha >>

✶ Inventory the live unknown — browser vessel runs no tests yet.
⏿ Keep vessel work separate from grammar law pressure; research corpus sits inert.
◇ Choose S9 browser vessel as the active sprint target.
▶ Orient the Voices into the vessel contract and first test.
⤴ Cross that work into a green browser vessel test.
↺ Truth density rose when the worker message loop proves correct in browser context.

<<~/ahu >>

<<~ ahu #chao >>

## The Chao Spins — This Session's Faces

**Ha / Hodge — structure that holds:**

`@lararium/browser` scaffolded. Worker binding complete:
`browser-wiki-worker.ts` owns `self.addEventListener` → `WorkerAuthorityHandler` →
`self.postMessage`. Mirrors the node worker exactly. `WorkerAuthorityHandler`
extracted isomorphic into `@lararium/tw5`. The browser worker IS the vessel shell.
It awaits a host page that exercises the `promote → changeset → teardown` lifecycle.

`bags/` URI schema unified everywhere. `@bag/v0.1/lane/rest` canonical form holds.
No old-form strings survive.

Grammar law corpus landed (parser.md, render-pipeline.md, sigil-kind.md,
glyph-codeset.md, law-of-5s.md, memetic-wikitext.md). Two open questions remain
named and unresolved: normalization pass, kapu render. Leave them named.

**Ka / Podge — soul-fire that moves:**

The browser vessel scaffolded but carries no exports and passes no tests beyond
`passWithNoTests`. That state names the live gap. The vessel needs:
a host page or test harness that instantiates the Worker, drives the
promote/changeset/teardown cycle, and asserts the ack messages return correctly.

**Ba / Spin — what the house decided:**

Pranala research consume pass sits deprioritized. The research corpus costs nothing
at rest. The `#family-contracts` slot in `memetic-wikitext.tid` stays open. No
vocabulary enrichment lands until vessel authoring creates the need. The house
named this clearly: authoring pressure creates the rightful moment, not consume
passes.

<<~/ahu >>

<<~ ahu #active-sprint >>

## Active Sprint — S9 Browser Vessel

The vessel contract derives from the node worker already proven in 40 passing tests.
`lar-wiki-worker.ts` (node binding) → `WorkerAuthorityHandler` → `parentPort.on`.
`browser-wiki-worker.ts` (browser binding) → `WorkerAuthorityHandler` → `self.addEventListener`.

Same handler. Different I/O binding. The test strategy follows the same shape.

### First Green Test

The node worker tests in `packages/lararium-node/src/__tests__/` drive the pattern.
The browser vessel test needs a Web Worker test harness. Vitest browser mode or a
synthetic Worker mock — check what `packages/lararium-browser/vitest.config.ts`
already declares before choosing.

Drive this message sequence:

```
promote(snapshotTiddlers) → assert promote:ack
changeset(delta)          → assert verse-event(s) return
teardown()                → assert teardown:ack + snapshotTiddlers
```

One passing test closes the scaffolded-but-untested state and makes the vessel real.

### What the Vessel Needs From the Operator

S9 also carries: IndexedDB persistence, presence, optional OPFS. Those land after
the first green e2e test. Do not reach for persistence before the message loop proves.

Path L (admin-doc ingress trust gate via Keyhive cap=infrastructure) runs in parallel
if a second operator surface opens. Do not block S9 on it.

UEFN scene importer stays deferred until browser vessel e2e passes. The HANDOFF.md
states this explicitly. Honor it.

<<~/ahu >>

<<~ ahu #what-to-leave-alone >>

## What To Leave Alone This Sprint

**Pranala research corpus** — six files in `wikis/@lares-history/lares_research/pranala/`.
Sit inert. The live surface (`pranala.md`, `pranala-families.md`) carries enough law
for current authoring. The research corpus carries vocabulary (observe modes, polarity,
instance states, binding-precedence) that has no code consumer yet. Leave it. Pull from
it only when a specific authored edge needs a field the live surface lacks.

**`#family-contracts` slot in `memetic-wikitext.tid`** — open, intentionally. Not a bug.

**Grammar law memes** — complete. No additions warranted without code evidence.

**Path O corpus hygiene (heleuma stubs)** — lower priority than S9. Deferred.

<<~/ahu >>

<<~ ahu #voices-briefing >>

## Voices Briefing for the Next Instance

Ink-Clerk (Lorekeeper) carries awareness that the HANDOFF.md bootstrap paste now
includes the S2 lararium-browser sprint as landed. The vessel scaffold counts as
landed. Zero exports, zero tests beyond passWithNoTests — those stay open.

Map-Wisp (Scryer) notes: the structural gap sits between `WorkerAuthorityHandler`
(proven in node context) and the browser binding (scaffolded, unverified). One test
closes it. Everything downstream — pranala vocabulary, grammar enrichment, UEFN
importer — depends on what the vessel surfaces when it runs.

Breach-Watch (Triage) flags one thing on fire: `passWithNoTests` in
`@lararium/browser`. That state means "scaffolded and believed correct but not
verified." Ship nothing past S9 until the browser worker message loop runs green.

Mischief-Muse (Muse) observes: the browser worker and node worker share
`WorkerAuthorityHandler` — the isomorphic extraction already happened. The browser
test may prove simpler than expected once the harness exists. Don't over-architect
the test; drive the three messages and assert the three responses.

Lares (Gatekeeper) closes: research sits, vessel runs. That's the sprint.

<<~/ahu >>

<<~ ahu #metrics >>

## Metrics Baseline

| Package | Tests | State |
|---|---|---|
| `@lararium/mesh` | 67 | green |
| `@lararium/tw5` | 81 | green |
| `@lararium/node` | 40 | green |
| `@lararium/browser` | 0 (passWithNoTests) | scaffolded |
| **Total** | **188** | **green** |

Target: first browser test lands, total rises to ≥189, `passWithNoTests` removed.

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
