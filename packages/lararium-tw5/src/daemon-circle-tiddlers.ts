/**
 * daemon-circle-tiddlers — the @daemon FOLLOW panel (the IoC social-graph surface).
 *
 * The isomorphic sibling of daemon-persona-tiddlers' persona panel: a SMALL born-from-source surface on the
 * @daemon story river that LISTS a circle's follows (the nym under the recogniser's OWN names — private
 * petname + last-seen glamour) and UNFOLLOWS one (a click carries the row's own nym). "Adding to a circle IS
 * the follow"; this surface reads that private graph and lets a human drop an edge.
 *
 * SOVEREIGNTY SPLIT (same rule as the switcher/persona panels):
 *   CODE  → born-from-source at daemon boot (in-memory setTiddler, deterministic per device).
 *   STATE → LOCAL/unsynced. $:/temp/lares/circles (the live follow-view) rides the volatile temp slot. It
 *           carries the PRIVATE follow-graph + petnames — which NEVER federate — so it MUST stay local: the
 *           temp slot syncs to no bag, cross-device or peer. The ONE federated surface stays the glamour a
 *           human deliberately publishes, never this panel.
 *
 * WHAT THIS PANEL ACCEPTS. The UNFOLLOW button carries the row's own nym, known at render time. FOLLOWING a
 * new nym takes more than a string — a nym AND a self-certifying card — so it rides the `lares circle` door
 * or another off-surface affordance. The projection carries typed text; a follow simply needs material a
 * text field cannot supply.
 *
 * Meme: lar:///ha.ka.ba/lararium/tw5/daemon-circle-tiddlers
 */

import { LARES_DISPATCH_FIELD, LARES_VERB_ARG_PREFIX } from "@lararium/mesh/lar-uris";
import { LARES_SURFACE_STATE, LARES_SURFACE_TAG } from "./daemon-ui-tiddlers.js";
import type { TW5Engine } from "./tw5-vm.js";
import type { VerbReactor } from "./verb-dispatcher.js";

// ── Titles ─────────────────────────────────────────────────────────────────
/** LOCAL state: the live follow-view for the active circle (volatile temp slot, never synced). */
export const CIRCLE_STATE_TITLE = "$:/temp/lares/circles";
const SURFACE_TITLE  = "$:/lares/ui/circle-surface";
const PAGECTRL_TITLE = "$:/lares/ui/PageControls/circles";

/** The volatile verb-summon namespace (mirrors daemon-persona-tiddlers). A button writes a `…/verb/<verb>`
 *  tiddler carrying the `verb` field, the `lares-dispatch` MARKER (the reaction-router forwards it), and its
 *  render-time args as `arg-<name>` fields the router lifts into the structured payload. */
const VERB_PREFIX = "lar:///lararium.local.vm/verb/";

// ── The follow surface (LIST · UNFOLLOW) ──────────────────────────────────────
//
// Each member reads by POSITIONAL index: the follow-view rides $:/temp/lares/circles under `nym-<i>`,
// `petname-<i>`, `glamour-<i>` (positional, so a long hex nym never becomes a field name). The unfollow
// button carries the row's `nym-<i>` + the active `circle`.
const SURFACE_BODY = `\\whitespace trim
! @daemon · Following

<div class="lares-circle-surface" data-lares-surface="circles">

<h2 class="lares-circle-title">Circle: <$text text={{{ [{${CIRCLE_STATE_TITLE}!!circle}else[following]] }}}/> <span class="lares-circle-private">(private — the graph never federates)</span></h2>
<div class="lares-circle-list">
<$list filter="[list[${CIRCLE_STATE_TITLE}]]" variable="i" emptyMessage="<p class='lares-empty' data-lares-empty='circles'>No follows in this circle yet — add one with the <code>lares circle</code> CLI.</p>">
<$let nymField={{{ [[nym-]addsuffix<i>] }}} petField={{{ [[petname-]addsuffix<i>] }}} glamField={{{ [[glamour-]addsuffix<i>] }}} nym={{{ [[${CIRCLE_STATE_TITLE}]get<nymField>] }}} pet={{{ [[${CIRCLE_STATE_TITLE}]get<petField>] }}} glam={{{ [[${CIRCLE_STATE_TITLE}]get<glamField>] }}}>
<div class="lares-circle-row" data-lares-follow=<<nym>>>
<span class="lares-circle-petname"><$text text={{{ [<pet>!is[blank]] ~[[(unnamed)]] }}}/></span>
<span class="lares-circle-glamour"><$list filter="[<glam>!is[blank]]" variable="_">~ &quot;<$text text=<<glam>>/>&quot;</$list></span>
<$button class="lares-circle-unfollow" data-lares-unfollow=<<nym>>><$action-setfield $tiddler="${VERB_PREFIX}circle-remove" verb="circle-remove" ${LARES_DISPATCH_FIELD}="1" ${LARES_VERB_ARG_PREFIX}nym=<<nym>> ${LARES_VERB_ARG_PREFIX}circle={{${CIRCLE_STATE_TITLE}!!circle}}/>unfollow</$button>
</div>
</$let>
</$list>
</div>

<div class="lares-circle-note">
<p>Adding a follow needs a nym and its self-certifying card, so it rides the <code>lares circle add</code> CLI (a projected click cannot type a key). The graph is PRIVATE and LOCAL — nothing here reaches @crossroads.</p>
</div>

</div>`;

/** The sidebar button names the follow surface as the active panel — the same in-place re-transclude the
 *  persona/switcher summons use (no story navigation, which references `window`). */
const SUMMON_ACTION = `<$action-setfield $tiddler="${LARES_SURFACE_STATE}" text="${SURFACE_TITLE}"/>`;

const PAGECTRL_BODY = `\\whitespace trim
<$button class="tc-btn-invisible lares-pagecontrol" data-lares-summon="circles" tooltip="Open the @daemon follow surface">
${SUMMON_ACTION}
{{$:/core/images/permalink-button}} Following
</$button>`;

interface TiddlerSpec { readonly [field: string]: string }

/**
 * The born-from-source @daemon follow-panel CODE tiddlers: the follow surface (tagged the shared
 * Lares/Surface tag, so the switcher's wrapper transcludes it when summoned) + the $:/tags/PageControls
 * sidebar button that summons it.
 */
export const DAEMON_CIRCLE_TIDDLERS: readonly TiddlerSpec[] = [
  { title: SURFACE_TITLE, type: "text/vnd.tiddlywiki", tags: LARES_SURFACE_TAG, text: SURFACE_BODY, caption: "Following" },
  { title: PAGECTRL_TITLE, type: "text/vnd.tiddlywiki", tags: "$:/tags/PageControls", text: PAGECTRL_BODY },
];

/**
 * Seed the born-from-source follow-panel tiddlers into the live @daemon TW5 wiki. Idempotent (setTiddler
 * overwrites). MUST run alongside seedDaemonUiTiddlers/seedDaemonPersonaTiddlers, BEFORE the projection
 * camera's first render (a headless node daemon simply rests these, never painting).
 */
export function seedDaemonCircleTiddlers(tw5: TW5Engine): void {
  for (const spec of DAEMON_CIRCLE_TIDDLERS) tw5.setTiddler(spec as Record<string, string>);
}

// ── The circle-state worker verb (the IN path: main → LOCAL push) ─────────────

/**
 * makeCircleStateReactor — the `circle-state` worker verb. The main thread (which HOLDS the IDB follow-graph)
 * pushes the live follow-view (positional list · per-member nym/petname/glamour · the active circle id) and
 * this writes the LOCAL, volatile $:/temp/lares/circles tiddler so the projected follow surface re-renders.
 * Reactive (fired after a follow/unfollow + on summon), never a poll.
 *
 * The args arrive pre-shaped by the vessel (circlePanelStateArgs). Every value copies straight to a field —
 * the tiddler stays in the volatile temp slot, so the follow-graph + petnames it carries never sync
 * cross-device (the never-federates wall).
 */
export function makeCircleStateReactor(tw5: TW5Engine): VerbReactor {
  return async (args) => {
    const fields: Record<string, string> = { title: CIRCLE_STATE_TITLE, ts: new Date().toISOString() };
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === "string") fields[key] = value;
    }
    tw5.setTiddler(fields);
    return { seeded: true, title: CIRCLE_STATE_TITLE };
  };
}
