/**
 * daemon-persona-tiddlers — the daemon persona panel (the multitude-of-one surface).
 *
 * The isomorphic sibling of daemon-ui-tiddlers' wiki-switcher: a SMALL born-from-source
 * surface on the daemon story river that LISTS a human's held persona-roots (index +
 * worn marker + private pet-name), MINTS a new persona-root at the next index, and WEARS
 * one (reboot-to-switch — one-face-to-mesh). A human contains a multitude; this surface
 * lets them hold, name, and don their faces.
 *
 * SOVEREIGNTY SPLIT (same rule as the switcher):
 *   CODE  → born-from-source at daemon boot (in-memory setTiddler, deterministic per
 *           device). NOT CRDT-bag-seeded — a $:/ put on the writing boot never paints.
 *   STATE → LOCAL/unsynced. $:/temp/lares/personas (the live multitude-view) rides the
 *           volatile temp slot. It carries the PRIVATE pet-names, so it MUST stay local: the
 *           temp slot syncs to no bag, cross-device or peer. The label MAY ride the human's own
 *           fleet — but through the pet-name store's own private bag, never through a rendered
 *           projection, which carries no way to tell a fleet peer from a stranger.
 *
 * WHAT THIS PANEL ACCEPTS. The projection round-trip carries BOTH legs — clicks and typed text — so the
 * shape here says what a persona panel should take, never what the transport allows. A row's WEAR button
 * carries that row's own index, known at render time. MINT carries no name, because a pet-name is PRIVATE
 * and a value typed into a projected field crosses a render surface with no way to tell a fleet peer from
 * a stranger; the mint sets a default label and the human renames it through the pet-name store's own bag.
 *
 * Meme: lar:///ha.ka.ba/lararium/tw5/daemon-persona-tiddlers
 */

import { LARES_DISPATCH_FIELD, LARES_VERB_ARG_PREFIX } from "@lararium/mesh/lar-uris";
import { LARES_SURFACE_STATE, LARES_SURFACE_TAG } from "./daemon-ui-tiddlers.js";
import type { TW5Engine } from "./tw5-vm.js";
import type { VerbReactor } from "./verb-dispatcher.js";

// ── Titles ─────────────────────────────────────────────────────────────────
/** LOCAL state: the live persona multitude-view (volatile temp slot, never synced). */
export const PERSONA_STATE_TITLE = "$:/temp/lares/personas";
const SURFACE_TITLE  = "$:/lares/ui/persona-surface";
const PAGECTRL_TITLE = "$:/lares/ui/PageControls/personas";

// The volatile verb-summon namespace (mirrors daemon-ui-tiddlers). A button writes a tiddler
// titled `…/verb/<verb>` carrying the `verb` field, the `lares-dispatch` MARKER (so the
// reaction-router forwards it — the loop-break), and its render-time args as `arg-<name>`
// fields the router lifts into the structured payload.
const VERB_PREFIX = "lar:///lararium.local.vm/verb/";

// ── The persona surface (LIST · MINT · WEAR) ──────────────────────────────────
//
// The row reads the private label by INTERPOLATED field name: each persona's pet-name rides
// $:/temp/lares/personas under the field `petname-<idx>`, so `[[…]get<petField>]` (petField =
// "petname-"+idx) fetches it. `held`/`active` ride enlist+match, exactly as the switcher's pins.
const SURFACE_BODY = `\\whitespace trim
! daemon · Personas

<div class="lares-persona-surface" data-lares-surface="personas">

<h2 class="lares-persona-title">Your faces <span class="lares-persona-private">(private — one face to the mesh)</span></h2>
<div class="lares-persona-list">
<$list filter="[list[${PERSONA_STATE_TITLE}]]" variable="idx" emptyMessage="<p class='lares-empty' data-lares-empty='personas'>No personas yet — mint one below.</p>">
<$let petField={{{ [[petname-]addsuffix<idx>] }}} pet={{{ [[${PERSONA_STATE_TITLE}]get<petField>] }}} activeHit={{{ [{${PERSONA_STATE_TITLE}!!active}match<idx>] }}} heldHit={{{ [enlist{${PERSONA_STATE_TITLE}!!held}] +[match<idx>] }}}>
<div class="lares-persona-row" data-lares-persona=<<idx>>>
<span class="lares-persona-idx">h<$text text=<<idx>>/></span>
<span class="lares-persona-petname"><$text text={{{ [<pet>!is[blank]] ~[[(unnamed)]] }}}/></span>
<$list filter="[<activeHit>minlength[1]]" variable="_"><span class="lares-persona-worn" data-lares-worn=<<idx>>>● worn</span></$list>
<$list filter="[<heldHit>minlength[1]] -[<activeHit>minlength[1]]" variable="_"><$button class="lares-persona-wear" data-lares-wear=<<idx>>><$action-setfield $tiddler="${VERB_PREFIX}persona-wear" verb="persona-wear" ${LARES_DISPATCH_FIELD}="1" ${LARES_VERB_ARG_PREFIX}index=<<idx>>/>wear</$button></$list>
</div>
</$let>
</$list>
</div>

<div class="lares-persona-mint">
<$button class="lares-persona-mint-btn" data-lares-mint="1">
<$action-setfield $tiddler="${VERB_PREFIX}persona-mint" verb="persona-mint" ${LARES_DISPATCH_FIELD}="1"/>
+ Mint a new persona
</$button>
<p class="lares-persona-note">A mint adds a private face at the next index and names it for you; rename it off-surface. Wearing dons that face for the mesh — the switch lands on the next reboot (one face at a time).</p>
</div>

</div>`;

/** The sidebar button names the persona surface as the active panel — the same in-place
 *  re-transclude the switcher's summon uses (no story navigation, which references `window`). */
const SUMMON_ACTION = `<$action-setfield $tiddler="${LARES_SURFACE_STATE}" text="${SURFACE_TITLE}"/>`;

const PAGECTRL_BODY = `\\whitespace trim
<$button class="tc-btn-invisible lares-pagecontrol" data-lares-summon="personas" tooltip="Open the daemon persona surface">
${SUMMON_ACTION}
{{$:/core/images/permalink-button}} Personas
</$button>`;

interface TiddlerSpec { readonly [field: string]: string }

/**
 * The born-from-source daemon persona-panel CODE tiddlers: the persona surface (tagged the
 * shared Lares/Surface tag, so the switcher's wrapper transcludes it when summoned) + the
 * $:/tags/PageControls sidebar button that summons it.
 */
export const DAEMON_PERSONA_TIDDLERS: readonly TiddlerSpec[] = [
  { title: SURFACE_TITLE, type: "text/vnd.tiddlywiki", tags: LARES_SURFACE_TAG, text: SURFACE_BODY, caption: "Personas" },
  { title: PAGECTRL_TITLE, type: "text/vnd.tiddlywiki", tags: "$:/tags/PageControls", text: PAGECTRL_BODY },
];

/**
 * Seed the born-from-source persona-panel tiddlers into the live daemon TW5 wiki. Idempotent
 * (setTiddler overwrites). MUST run alongside seedDaemonUiTiddlers, BEFORE the projection
 * camera's first render (a headless node daemon simply rests these, never painting).
 */
export function seedDaemonPersonaTiddlers(tw5: TW5Engine): void {
  for (const spec of DAEMON_PERSONA_TIDDLERS) tw5.setTiddler(spec as Record<string, string>);
}

// ── The persona-state worker verb (the IN path: main → LOCAL push) ────────────

/**
 * makePersonaStateReactor — the `persona-state` worker verb. The main thread (which HOLDS the
 * IDB persona vault) pushes the live multitude-view (indices · worn · held · per-index private
 * pet-names) and this writes the LOCAL, volatile $:/temp/lares/personas tiddler so the projected
 * persona surface re-renders. Reactive (fired after a mint/wear + on summon), never a poll.
 *
 * The args arrive pre-shaped by the vessel (personaPanelStateArgs): `list` = the indices (the
 * TW5 list field the surface iterates), `active`/`held` = enlist strings, `petname-<idx>` = the
 * private labels. Every value copies straight to a field — the tiddler stays in the volatile temp
 * slot, so the pet-names it carries never sync cross-device (the never-federates wall).
 */
export function makePersonaStateReactor(tw5: TW5Engine): VerbReactor {
  return async (args) => {
    const fields: Record<string, string> = { title: PERSONA_STATE_TITLE, ts: new Date().toISOString() };
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === "string") fields[key] = value;
    }
    tw5.setTiddler(fields);
    return { seeded: true, title: PERSONA_STATE_TITLE };
  };
}
