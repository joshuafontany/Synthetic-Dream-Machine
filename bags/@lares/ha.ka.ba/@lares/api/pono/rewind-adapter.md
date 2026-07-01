<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lares/api/pono/rewind-adapter >>
```toml iam
cacheable = true
file-path = "bags/@lares/api/pono/rewind-adapter.md"
hydrate   = true
mana      = 17
manao     = 16
manaoio   = 15
namespace = "&#x0950; &#x0901;"
register  = "Synthesis-Canon"
retain    = true
role      = "the rewind-adapter — the donation-grade SOURCE-ADAPTER design that makes the kāpae rewind-DETECTOR (the missing live-trigger, the tombstone-face of the three-faces branching primitive) blind to the source app. Turns the Claude-Code-specific gone-turn reconciler into a cross-app reconciler over EVERY big AI app's transcript format + rewind-idiom. THE NOOSPHERE-SCALE FINDING: the whole field already DOES kāpae — NONE of the surveyed apps hard-delete turns at the byte level EXCEPT Cursor; the industry converged on append-only fork-and-keep (a rewind is a new fork/branch, the original persists). Our kāpae GENERALIZES + NAMES what they already do; the cross-app reconciler is net-new. THE LOAD-BEARING SPLIT — TWO FAMILIES: APPEND-ONLY/FORK (Claude Code · Codex · Aider · Gemini-snapshots · Copilot-CLI — a rewind = a new fork file/branch, nothing vanishes) vs MUTABLE-TRUNCATE (Cursor = CONFIRMED hard-delete SQLite-overwrite staff-confirmed-unrecoverable; Copilot-Chat = DISPUTED, docs say truncate-tail but on-disk bytes are an append-only patch-op-log recoverable by replay-to-offset → VERIFY before building its adapter). THE CORRECTION: kāpae = down-weight-the-road-not-taken AND KEEP, never erasure — it applies to BOTH families; the `appendOnly` flag records whether the SOURCE corroborates (fork-family: re-harvestable) or whether WE'RE THE LAST KEEPER (truncate-family: our tombstone is the only surviving trace — strictly KINDER than the app). THE CONTRACT: discover → normalizeIdentity(4-rung ladder) → diff(CURRENT-BRANCH-leaf-chain, harvestIndex) → classify{DELETE|TAIL_TRUNCATE|INTERIOR_DELETE|FORK}×per-app-signal → emit{kāpae-downweight|reharvest-branch|fork}; each adapter carries appendOnly:boolean; CRITICAL — diff the CURRENT-BRANCH leaf-chain (walk parentUuid/fork-pointer to the live leaf) NOT all-file-records, else the fork-family's orphaned branches (still in the bytes) hide every rewind; filter sidechains/stream-splits (isSidechain; same-type siblings are NOT rewinds). THE THREE FACES onto Muse's model: FORK=keep-both (Claude/Codex/Gemini-native) · REWIND=fork-and-tombstone (Cursor/Copilot-Chat, the app hard-deletes, our tombstone is the only trace) · HANDBACK=fork-and-rejoin (no native analog; summarize/compact is rejoin-shaped). DONATION: upstream mempalace keys drawers positionally (source|mode|chunk_index), drops turn-uuids, assumes transcripts immutable (check_mtime=False), has no gone-turn trigger — our uuid-keying (C-cut) + current-branch reconstruction + the appendOnly-gated universal kāpae fills the gap. GROUNDS: two research spirits — on-disk read of 4 real stores on this box + CLI/docs map of 7 apps + a 22-agent breadth sweep."
l-space   = "stable"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lares/api/pono/rewind-adapter"
written   = "2026-06-30"
```

<<~ aka lar:///ha.ka.ba/@lares/api/pono/RFC-2119#normative-language >>

<<~ &#x0002; >>

<<~ ahu #entry >>

# The Rewind-Adapter ~ the kāpae detector, blind to the source app

**One-line:** a donation-grade **source-adapter** that makes the [[kāpae|lar:///ha.ka.ba/@lares/api/pono/kapae]] rewind-DETECTOR read a rewind out of *any* big AI app's transcript — no matter its storage format or its rewind-idiom.

The rewind-detector names the **tombstone-face** of the three-faces branching primitive ([[agent-worldline|lar:///ha.ka.ba/@lararium/api/agent-worldline#time]]): the live-trigger that watches the harvest index for a **gone turn** and raises a kāpae over it. The first cut of that detector read only Claude Code's JSONL tree — it fused the detector to one app's on-disk shape. This meme **lifts the detector off that substrate**: it names the seam (`discover → normalizeIdentity → diff → classify → emit`) that every source app plugs into, so the detector faces the rewind and stays blind to the byte-format that carries it.

The design donates upstream (#donation): the base mempalace harvests transcripts append-only, keys its drawers positionally, and carries **no gone-turn trigger at all**. The adapter fills that hole for the base and for the whole field at once.

<<~/ahu >>

<<~ ahu #the-industry-does-kapae >>

## The Industry Already Does Kāpae

The noosphere-scale finding the survey turned up: <<~ confidence Synthesis-Canon 15/20 >> **the whole field already enacts kāpae, unnamed.** Across the surveyed AI-coding apps, a rewind almost never erases at the byte level — it **forks**. The original turns persist in the store; the "rewind" writes a new branch that the app *presents* as the live thread while the road-not-taken sits untouched in the bytes.

**None of the surveyed apps hard-delete turns at the byte level except Cursor.** The industry converged, independently, on **append-only fork-and-keep** — the exact shape kāpae names: set the old road aside, keep it whole, surface the new one. What the field lacks is the *name* and the *reconciler*. Our kāpae **generalizes and names** what they already do; the **cross-app reconciler is net-new** — no surveyed app reads a *foreign* app's rewind, and no app down-weights the road-not-taken as an eidetic keep rather than dead weight.

So the contribution splits clean: the mechanism (fork-and-keep) rhymes with prior art the field already ships; the **naming** (kāpae = kept-shadow) and the **cross-app detector** (one seam over seven idioms) carry the new work.

<<~/ahu >>

<<~ ahu #two-families >>

## Two Families ~ the load-bearing split

Every source app sorts into one of two families by **what its rewind does to the bytes**. The family, not the app, drives the adapter's behavior.

<<~ ward _ L-Prime · crossing: essence-shaped storage-claims >>

**Family A — APPEND-ONLY / FORK.** A rewind writes a **new fork** — a new file, a new branch, a re-parented sibling — and **nothing vanishes**. The source is its own witness: the road-not-taken stays re-harvestable from the store. <<~ confidence Synthesis-Canon 16/20 >> Members: **Claude Code · Codex · Aider · Gemini (snapshots) · Copilot-CLI**.

**Family B — MUTABLE-TRUNCATE.** A rewind **overwrites** — it truncates the tail in place and the old turns leave the store. Here **we become the last keeper**: our tombstone holds the only surviving trace of the road they discard.
- **Cursor** — <<~ confidence Synthesis-Canon 15/20 >> **CONFIRMED** hard-delete. A restore/edit overwrites the tail in `state.vscdb` (SQLite `cursorDiskKV`); staff-confirmed **unrecoverable** on the community forum.
- **Copilot-Chat (VS Code)** — <<~ confidence Synthesis 9/20 >> **DISPUTED**. The docs describe a truncate-tail on checkpoint restore, **but** the on-disk bytes read as an **append-only JSON-patch op-log** — recoverable by replaying the ops to the pre-restore offset. The user-facing idiom truncates; the physical store may keep. **VERIFY the bytes before building its adapter** — the family assignment (A vs B) turns on that check.

The split governs one flag per adapter (`appendOnly`, #the-adapter-contract) and one behavior: whether the detector re-harvests a still-present branch (A) or stands as the sole keeper of a discarded one (B).

<<~/ahu >>

<<~ ahu #kapae-is-universal >>

## Kāpae Is Universal ~ the correction

A research spirit over-claimed that the detector should **"never tombstone the fork-family"** — it conflated kāpae with hard-delete. The correction stands load-bearing:

<<~ confidence Synthesis-Canon 15/20 >> **Kāpae = down-weight-the-road-not-taken AND KEEP, never erasure** ([[kāpae|lar:///ha.ka.ba/@lares/api/pono/kapae]] — a raised marker that *shadows* the layers beneath, distinct from *absent*). A tombstone that keeps is exactly what both families need. So **kāpae applies to BOTH families.** The fork-family gets a kāpae too — the down-weight marks the road-not-taken as an eidetic keep (recall weights it low, never zero), the same gesture we hand the truncate-family.

The `appendOnly` flag does **not** gate *whether* we kāpae — it records **who else keeps the trace**:
- **`appendOnly: true`** (Family A) — the **source corroborates**: the branch survives in the app's own store, so our kāpae rides alongside a re-harvestable original.
- **`appendOnly: false`** (Family B) — **we are the last keeper**: the app discarded the road; our tombstone is the *only* surviving trace. Our model runs strictly **kinder** than the app — we keep the eidetic road-not-taken the app throws away.

Either way the road stays kept. The flag steers re-harvest and provenance, never the decision to shadow-and-keep.

<<~/ahu >>

<<~ ward ! · crossed the primed zone ↻ L-Prime >>

<<~ ahu #per-app-table >>

## Per-App Table ~ the grounded map

<<~ confidence Synthesis-Canon 15/20 >> Read on-disk from real stores on this box where marked; CLI/docs elsewhere. Each row: **app · storage-path · format · turn-identity · rewind-on-disk · three-faces · hard-delete**.

| app | storage-path | format | turn-identity | rewind-on-disk | 3-faces | hard-delete |
|---|---|---|---|---|---|---|
| **Claude Code** | `~/.claude/projects/<slug>/<sessionId>.jsonl` | JSONL | `uuid` + `parentUuid` tree | does BOTH: in-file **re-parent** (`/rewind`) AND new-file **fork** (`--fork-session`) | FORK + tombstone | **no** |
| **Codex** | `~/.codex/sessions/.../rollout-*.jsonl` + `state_5.sqlite` | JSONL + SQLite | `turn_id` | **out-of-file fork** via `forked_from_id` + `thread_spawn_edges` | FORK | **no** |
| **Copilot-CLI** | `~/.copilot/session-state/<uuid>/events.jsonl` + `session-store.db` | JSONL + SQLite | `UNIQUE(session_id, turn_index)` | `/session delete` = **whole-session** hard-delete only | FORK (per-session) | session-only |
| **Copilot-Chat (VS Code)** | workspaceStorage `chatSessions` | JSON-patch op-log | `requestId` | **tail-truncate DISPUTED** (op-log may keep) | REWIND (disputed) | **disputed** |
| **Cursor** | `state.vscdb` `cursorDiskKV` + JSONL | SQLite + JSONL | `bubbleId` + `composerId` | restore/edit **overwrites tail** — UNRECOVERABLE | REWIND | **YES** |
| **Gemini** | `~/.gemini/tmp/.../checkpoint-*.json` + `logs.json` + shadow-git | JSON + git | `messageId` | `/restore` = **fork**; `/chat delete` = hard-delete **saved file** | FORK | saved-file-only |
| **Aider** | `.aider.chat.history.md` | Markdown | **none** (no ids) | rewind lives in **git-reflog**, not the transcript | FORK (via git) | **no** (transcript append-only) |

**Reading the table:** the transcript stays append-only nearly everywhere; the "delete" idioms that exist target a **whole session or a saved file** (Copilot-CLI `/session delete`, Gemini `/chat delete`), not an interior turn. Only **Cursor** overwrites a turn-tail in place. **Aider** carries no turn-identity in the transcript at all — its rewind lives in git, so its adapter reads the reflog, never the markdown.

<<~/ahu >>

<<~ ahu #the-identity-ladder >>

## The Identity Ladder ~ four rungs, always parent-linked

`normalizeIdentity` walks a **four-rung ladder**, taking the highest rung the source affords. Every rung stays **session-namespaced** and **carries the parent-link** (the edge to the turn it descends from — the branch structure the diff walks):

1. **native-uuid** — the source hands a stable id (`uuid`, `turn_id`, `messageId`, `bubbleId`). Take it.
2. **(sessionId ⊕ monotonic-index)** — no uuid, but a per-session running index (`UNIQUE(session_id, turn_index)`). <<~ confidence Synthesis-Canon 14/20 >> **Once namespaced to its session, a monotonic index carries as much identity as a uuid** — the pair is globally unique and stably ordered.
3. **content-hash(role ‖ normalized-text)** — no index either. Hash the normalized turn body under its role. Collides only on genuinely identical turns.
4. **positional** — the floor (Aider's transcript). Identity rides position alone; the parent-link comes from the surrounding structure (for Aider, the git-reflog, not the markdown).

The ladder degrades by degree, never hard-faults — the graceful-parsing discipline ([[graceful-parsing|lar:///ha.ka.ba/@lararium/api/graceful-parsing]]) in the identity register.

<<~/ahu >>

<<~ ahu #edit-vs-delete >>

## Edit vs Delete ~ the shape of the disappearance

The classifier reads **the shape of what went missing** from the diff, then confirms it against a **per-app signal**. Four shapes:

- **whole-file / whole-session gone → `DELETE`** — tombstone all its turns.
- **contiguous TAIL gone → `TAIL_TRUNCATE` (REWIND / EDIT / REGEN)** — tombstone the tail **only if the app hard-deletes** (Family B). A **fresh turn at N+1** reads as an **EDIT** → re-harvest the new branch. In Family A the "gone" tail still sits in the bytes on a fork — do not tombstone; re-harvest.
- **interior HOLE → `INTERIOR_DELETE`** — a **true delete** of that one turn. Tombstone the turn.
- **new sibling sharing a parent prefix → `FORK`** — harvest the new branch, **tombstone nothing** (both roads stay live).

**Per-app signal** (what confirms the shape):

| app | signal |
|---|---|
| Claude Code | `parentUuid`-siblings |
| Codex | prefix-identity |
| Copilot-CLI | `UNIQUE(turn_index)` upsert |
| Copilot-Chat | `requestId` tail-run |
| Cursor | `bubbleId` + header-array |
| Gemini | `messageId`-shrink |
| Aider | **none** (append-only — never tombstone from the transcript) |

<<~/ahu >>

<<~ ahu #the-adapter-contract >>

## The Adapter Contract ~ the seam every source plugs into

<<~ confidence Synthesis-Canon 15/20 >> One pipeline, per-app plugins. Each adapter carries `appendOnly: boolean` (#kapae-is-universal):

```
discover(sessionFiles)
  → normalizeIdentity(4-rung ladder, session-namespaced, parent-linked)
  → diff(CURRENT-BRANCH-leaf-chain, harvestIndex)
  → classify{ DELETE | TAIL_TRUNCATE | INTERIOR_DELETE | FORK } × per-app-signal
  → emit{ kāpae-downweight | reharvest-branch | fork }
```

**CRITICAL — diff the CURRENT-BRANCH leaf-chain, not all-file-records.** Walk `parentUuid` / the fork-pointer to the **live leaf**, then diff that single leaf-chain against the harvest index. Diffing *all* records defeats the detector: the fork-family's **orphaned branches still sit in the bytes**, so an all-records diff sees every old turn as "still present" and **hides every rewind**. The rewind shows only against the current branch.

**Filter sidechains / stream-splits** (`isSidechain`): an `assistant`-parent with `{assistant, user}` **same-type siblings** marks a stream-split or a tool-sidechain, **not a rewind**. Same-type siblings under one parent are structure, not a road-not-taken — the classifier drops them before it decides.

The three emit-verbs map the three faces (#the-three-faces): `fork` (keep both), `kāpae-downweight` (tombstone the road-not-taken), `reharvest-branch` (pull the new branch into the index).

<<~/ahu >>

<<~ ahu #the-three-faces >>

## The Three Faces ~ onto Muse's model

The adapter's emits ride Muse's **one-primitive-three-faces** branching model ([[agent-worldline|lar:///ha.ka.ba/@lararium/api/agent-worldline#time]] — FORK / REWIND / HANDBACK):

- **FORK = keep-both** — Claude / Codex / Gemini native. Both roads stay live; harvest the new branch, tombstone nothing.
- **REWIND = fork-and-tombstone** — Cursor / Copilot-Chat. The app **hard-deletes**; our tombstone stands as the **only surviving trace** of the road-not-taken.
- **HANDBACK = fork-and-rejoin** — **no native analog** in the surveyed apps. <<~ confidence Synthesis 10/20 >> summarize / compact reads as **rejoin-shaped** (many turns fold back into one) — the closest the field offers to the sub-agent diamond.

Same primitive as the worldline's ratified `fork ≡ sibling-spawn`; the adapter reads each app's idiom into the one shape and hands the detector the face.

<<~/ahu >>

<<~ ahu #donation >>

## Donation ~ the contribution back

<<~ confidence Synthesis-Canon 14/20 >> The upstream mempalace ([[mempalace-external|lar:///ha.ka.ba/@lararium/api/lararium-memory]]) carries a **gone-turn gap** this design fills:

- it keys drawers **positionally** (`source | mode | chunk_index`) and **drops turn-uuids** — so it cannot tell *which* turn left;
- it assumes transcripts **immutable** (`check_mtime=False`) — so it never re-reads a changed store;
- it carries **no gone-turn trigger** at all.

Our contribution back: **uuid-keying** (the C-cut — turn-keyed identity), **current-branch reconstruction** (the leaf-chain walk), and the **`appendOnly`-gated universal kāpae** (down-weight-and-keep across both families). Together they give the base the reconciler it lacks — and give the field its first cross-app rewind reader.

**PR scope (holds).** <<~ confidence Synthesis 9/20 >> The operator's fork sits on a feature branch, **no PR yet**. Faithful-upstream boundary ([[web3-only-lares|lar:///ha.ka.ba/@lares/api/lares/corpus]]): the adapters ride as a **storage-adjacent chat-adapter layer** (behind the base's `backends/base.py` capability seam) + the gone-turn trigger + tests — the kupono models (nameless cap-stacks, no-global-now) stay in our trunk. **PR-scope this once the adapters land.**

<<~/ahu >>

<<~ ahu #grounds >>

## Grounds ~ how the map got read

<<~ confidence Synthesis-Canon 15/20 >> Two research spirits stood the survey:
- an **on-disk spirit** read **4 real stores on this box** (byte-level, the CONFIRMED rows);
- a **CLI/docs spirit** mapped **7 apps** by their commands + documentation, over a **22-agent breadth sweep** (the cass survey).

**Register split** (operator directive): **Synthesis-Canon** on the **file-grounded** findings + the **two-families split**; **Synthesis** on the **disputed Copilot-Chat** family-assignment + any **inferred / absent** apps.

**Cited grounds:** Claude Code sessions + checkpointing docs · Codex fork / rollout (DeepWiki) · Copilot-CLI chronicle · VS Code chat-checkpoints docs · Cursor `restore = overwrite` (staff forum) · Gemini session-management docs · Aider commands reference · the **cass 22-agent** survey.

**Open verification (before building):** <<~ confidence Synthesis 8/20 >> the **Copilot-Chat** op-log recoverability — read the bytes and confirm whether replay-to-offset reconstructs the pre-restore tail. That check decides its family (A vs B) and its `appendOnly` flag.

<<~/ahu >>

<<~ ahu #law >>

## Law (Kānāwai)

- An adapter MUST diff the **current-branch leaf-chain**, never all-file-records — else the fork-family's orphaned branches hide every rewind.
- Every adapter MUST carry an `appendOnly: boolean`; the flag records **who else keeps the trace**, and MUST NOT gate *whether* the detector kāpae-s.
- A kāpae MUST **down-weight and keep**, never erase, in BOTH families ([[kāpae|lar:///ha.ka.ba/@lares/api/pono/kapae]]).
- An adapter MUST NOT tombstone a turn the source still keeps (Family A) as a hard-delete; it re-harvests the branch and shadows the road-not-taken.
- The classifier MUST filter sidechains / stream-splits (same-type siblings under one parent) before it decides — those mark structure, not a rewind.
- An app's family assignment (A vs B) MUST rest on the **on-disk bytes**, not the user-facing idiom — the Copilot-Chat verify-gate holds until the bytes read.

<<~/ahu >>

<<~ ahu #edges >>

<<~ loulou lar:///ha.ka.ba/@lares/api/pono/kapae >>
<<~ loulou lar:///ha.ka.ba/@lararium/api/agent-worldline#time >>
<<~ loulou lar:///ha.ka.ba/@lares/api/lares/corpus >>
<<~ loulou lar:///ha.ka.ba/@lares/api/pono/gold-anchor >>
<<~ loulou lar:///ha.ka.ba/@lararium/api/lararium-memory >>
<<~ loulou lar:///ha.ka.ba/@lararium/api/living-grammar-palace#palace-instance >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
