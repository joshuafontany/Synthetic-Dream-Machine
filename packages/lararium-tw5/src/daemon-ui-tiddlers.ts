/**
 * daemon-ui-tiddlers — the daemon UX widget (Layer 2 part a).
 *
 * The daemon inherits the wiki render cap (hasProjection), so it paints a real
 * TW5 story river. This module supplies the daemon-scoped CODE tiddlers that
 * compose the wiki-SWITCHER + recipe surface ON that river, and the worker verb
 * that feeds the switcher its LIVE state.
 *
 * SOVEREIGNTY SPLIT (hard rule):
 *   CODE  → born-from-source at daemon boot (in-memory addTiddler, deterministic
 *           per device). NOT CRDT-bag-seeded — the $:/ live-surface filter
 *           (meme-provider) drops a $:/ put on the writing boot, so a bag-seed
 *           would not paint until a second boot. Born-from-source paints at once
 *           and keeps UI code OUT of the CRDT entirely.
 *   STATE → LOCAL/unsynced. $:/lares/surface (which panel) matches no bag-paths
 *           cascade rule → pure in-memory. $:/temp/lares/switcher (the live list)
 *           → the volatile temp slot. Neither ever syncs cross-device.
 *
 * The parallel-cap surface is a LARES-owned switch — it never overloads TW5's
 * own $:/tags/Layout (that stays wiki-specific + untouched).
 *
 * Meme: lar:///ha.ka.ba/lararium/tw5/daemon-ui-tiddlers
 */

// Leaf subpath (NOT the barrel) — keeps automerge WASM out of any CJS plugin bundle this
// module's constants get pulled into (the reaction-router leaf-import rule).
import { LARES_DISPATCH_FIELD, LARES_VERB_ARG_PREFIX } from "@lararium/mesh/lar-uris";
import type { TW5Engine } from "./tw5-vm.js";
import type { VerbReactor } from "./verb-dispatcher.js";

// ── Titles ─────────────────────────────────────────────────────────────────
/** The parallel-cap surface tag (organizational; the wrapper drives by state, not tag). */
export const LARES_SURFACE_TAG   = "$:/tags/Lares/Surface";
/** LOCAL state: which surface tiddler the wrapper shows (in-memory, never synced). */
export const LARES_SURFACE_STATE = "$:/lares/surface";
/** LOCAL state: the live switcher list + pin/surface/recipe (volatile temp slot, never synced). */
export const SWITCHER_STATE_TITLE = "$:/temp/lares/switcher";
const WRAPPER_TITLE   = "$:/lares/ui/surface-switch";
const WORKING_TITLE   = "$:/lares/ui/working-surface";
const PAGECTRL_TITLE  = "$:/lares/ui/PageControls/daemon";

// The volatile verb-summon namespace (mirrors mesh/lar-uris laresVerbUri). A button
// writes a tiddler titled `…/verb/<verb>` (PURE BEARING — the verb NAME, no args) carrying
// a `verb` field, the `lares-dispatch` MARKER (so the reaction-router fires — the loop-break,
// #48), and its per-invocation args as `arg-<name>` fields the router lifts into the
// structured payload. Kept as a literal here so the wikitext can build titles inline.
const VERB_PREFIX = "lar:///lararium.local.vm/verb/";

// ── The four CODE tiddlers ───────────────────────────────────────────────────

/** 1. The parallel-cap wrapper switch — shows the surface tiddler $:/lares/surface
 *  names, defaulting to the Working Surface. Driven by state, not by $:/tags/Layout. */
const WRAPPER_BODY = `<$transclude $tiddler={{{ [{${LARES_SURFACE_STATE}}has[text]] ~[[${WORKING_TITLE}]] }}} mode="block"/>`;

/** 2. The Working Surface — composes the wiki-switcher (live list + pin flags +
 *  on-select) TOGETHER WITH the recipe view/edit surface. */
const WORKING_BODY = `\\whitespace trim
! daemon · Working Surface

<div class="lares-daemon-surface" data-lares-surface="working">

<h2 class="lares-switcher-title">Active wikis</h2>
<div class="lares-switcher-list">
<$list filter="[list[${SWITCHER_STATE_TITLE}]]" variable="wikiSlug" emptyMessage="<p class='lares-empty' data-lares-empty='wikis'>No live wikis yet — summon again to refresh.</p>">
<$let heldHit={{{ [enlist{${SWITCHER_STATE_TITLE}!!held}] +[match<wikiSlug>] }}} surfaceHit={{{ [{${SWITCHER_STATE_TITLE}!!surface}match<wikiSlug>] }}}>
<div class="lares-switcher-row">
<$button class="lares-switch-btn" data-lares-wiki=<<wikiSlug>>>
<$action-setfield $tiddler="${VERB_PREFIX}wiki-switch" verb="wiki-switch" ${LARES_DISPATCH_FIELD}="1" ${LARES_VERB_ARG_PREFIX}slug=<<wikiSlug>>/>
<$text text=<<wikiSlug>>/><$list filter="[<heldHit>minlength[1]]" variable="_"> <span class="lares-pin" data-lares-pin=<<wikiSlug>>>📌</span></$list><$list filter="[<surfaceHit>minlength[1]]" variable="_"> <span class="lares-surface-mark">◀</span></$list>
</$button>
</div>
</$let>
</$list>
</div>

<h2 class="lares-recipe-title">Recipe — <$text text={{{ [{${SWITCHER_STATE_TITLE}!!recipeSlug}else[(none)]] }}}/></h2>
<div class="lares-recipe" data-lares-recipe={{${SWITCHER_STATE_TITLE}!!recipeSlug}}>
<div class="lares-recipe-list">
<$list filter="[enlist{${SWITCHER_STATE_TITLE}!!recipe}]" variable="bagUri" emptyMessage="<p class='lares-empty' data-lares-empty='recipe'>(recipe empty — add a bag below)</p>">
<div class="lares-recipe-row"><span class="lares-recipe-bag"><$text text=<<bagUri>>/></span> <$button class="lares-recipe-remove" data-lares-remove=<<bagUri>>><$action-setfield $tiddler="${VERB_PREFIX}remove-bag" verb="remove-bag" ${LARES_DISPATCH_FIELD}="1" ${LARES_VERB_ARG_PREFIX}slug={{${SWITCHER_STATE_TITLE}!!recipeSlug}} ${LARES_VERB_ARG_PREFIX}bagUrl=<<bagUri>>/>remove</$button></div>
</$list>
</div>
<div class="lares-recipe-add">
<p class="lares-recipe-add-label">Add a bag:</p>
<$list filter="[enlist{${SWITCHER_STATE_TITLE}!!availableBags}]" variable="bagUri" emptyMessage="<p class='lares-empty' data-lares-empty='available'>(no other bags to add)</p>">
<div class="lares-recipe-row"><span class="lares-recipe-bag"><$text text=<<bagUri>>/></span> <$button class="lares-recipe-add-btn" data-lares-add=<<bagUri>>><$action-setfield $tiddler="${VERB_PREFIX}add-bag" verb="add-bag" ${LARES_DISPATCH_FIELD}="1" ${LARES_VERB_ARG_PREFIX}slug={{${SWITCHER_STATE_TITLE}!!recipeSlug}} ${LARES_VERB_ARG_PREFIX}bagUrl=<<bagUri>>/>add</$button></div>
</$list>
</div>
</div>

<h2 class="lares-project-title">Project a submission</h2>
<div class="lares-project" data-lares-project>
<p class="lares-project-label">Render one carrier to its markdown + meta pair (the PROJECT-MD read verb; the pair rides the outcome record):</p>
<div class="lares-project-row">bag: <$edit-text tiddler="$:/lares/state/project-md" field="bag" tag="input" placeholder="lar:///… bag url"/></div>
<div class="lares-project-row">title: <$edit-text tiddler="$:/lares/state/project-md" field="title" tag="input" placeholder="lar:///… carrier address"/></div>
<$button class="lares-project-btn" data-lares-project-btn>
<$action-setfield $tiddler="${VERB_PREFIX}project-md" verb="project-md" ${LARES_DISPATCH_FIELD}="1" ${LARES_VERB_ARG_PREFIX}bag={{$:/lares/state/project-md!!bag}} ${LARES_VERB_ARG_PREFIX}title={{$:/lares/state/project-md!!title}}/>
project
</$button>
</div>

</div>`;

/** The action the sidebar button fires: name the Working Surface as the active panel.
 *  It does NOT $action-navigate — the wrapper already sits open in the daemon story
 *  (seeded at boot), and navigation in a headless Worker references `window`. Toggling
 *  $:/lares/surface just re-transcludes the wrapper in place — no story navigation. */
const SUMMON_ACTION = `<$action-setfield $tiddler="${LARES_SURFACE_STATE}" text="${WORKING_TITLE}"/>`;

/** 3. The $:/tags/PageControls sidebar button. */
const PAGECTRL_BODY = `\\whitespace trim
<$button class="tc-btn-invisible lares-pagecontrol" data-lares-summon="daemon" tooltip="Open the daemon working surface">
${SUMMON_ACTION}
{{$:/core/images/list-bullet}} daemon
</$button>`;

interface TiddlerSpec { readonly [field: string]: string }

/**
 * The born-from-source daemon CODE tiddlers: the parallel-cap wrapper switch, the
 * Working Surface (switcher + recipe), and the $:/tags/PageControls sidebar button.
 *
 * The in-daemon KEYBOARD shortcut is deliberately NOT seeded: adding a
 * $:/tags/KeyboardShortcut tiddler at runtime wakes TW5's keyboard manager, which
 * touches `window`/`document` — undefined in the daemon's headless Worker, a fatal
 * boot fault. The UNIVERSAL summon (the app-shell Ctrl+Shift+D, main.ts) covers the
 * keyboard affordance from EVERY wiki anyway — the reachability caveat — so the chord
 * lives on the host chrome (where `window` exists), not inside the worker-bound wiki.
 */
export const DAEMON_UI_TIDDLERS: readonly TiddlerSpec[] = [
  // The wrapper renders via $:/tags/AboveStory — a standard always-visible page slot
  // ABOVE the story river. This deliberately avoids the story river: opening a tiddler
  // in $:/StoryList fires the navigator's scroll path, which references `window`
  // (undefined in the headless Worker). AboveStory renders like any boot content.
  { title: WRAPPER_TITLE, type: "text/vnd.tiddlywiki", tags: "$:/tags/AboveStory", text: WRAPPER_BODY },
  { title: WORKING_TITLE, type: "text/vnd.tiddlywiki", tags: LARES_SURFACE_TAG, text: WORKING_BODY, caption: "daemon" },
  { title: PAGECTRL_TITLE, type: "text/vnd.tiddlywiki", tags: "$:/tags/PageControls", text: PAGECTRL_BODY },
];

/**
 * Seed the born-from-source daemon UI tiddlers into the live TW5 wiki + open the
 * wrapper as the story's INITIAL content. Idempotent (addTiddler overwrites).
 *
 * MUST run BEFORE the projection camera's first render (the daemon island's onBoot,
 * ahead of mountProjection): setting $:/StoryList as initial content renders the
 * wrapper with NO story-navigation beat. Setting it AFTER the camera is live fires a
 * navigator refresh whose scroll path references `window` — undefined in the headless
 * Worker, a fatal fault. Seeded pre-render, the switcher paints like any boot content.
 * On a headless node daemon (no projection) the tiddlers simply rest, never painting.
 */
export function seedDaemonUiTiddlers(tw5: TW5Engine): void {
  for (const spec of DAEMON_UI_TIDDLERS) tw5.setTiddler(spec as Record<string, string>);
}

// ── The switcher-state worker verb (the IN path: main → LOCAL push) ──────────

/**
 * makeSwitcherStateReactor — the `switcher-state` worker verb. Main pushes the live
 * activation state (active wikis · held pins · projection surface · home recipe) and
 * this writes the LOCAL, volatile $:/temp/lares/switcher tiddler so the projected
 * switcher re-renders. Reactive (fired on every activation change + summon), never a
 * poll. The tiddler lives in the volatile temp slot — it never syncs cross-device.
 */
export function makeSwitcherStateReactor(tw5: TW5Engine): VerbReactor {
  return async (args) => {
    const str = (k: string): string => (typeof args[k] === "string" ? (args[k] as string) : "");
    tw5.setTiddler({
      title:      SWITCHER_STATE_TITLE,
      list:          str("active"),      // TW5 list field — the switcher iterates [list[…]]
      held:          str("held"),
      surface:       str("surface"),
      recipeSlug:    str("recipeSlug"),
      recipe:        str("recipe"),
      availableBags: str("availableBags"),
      ts:            new Date().toISOString(),
    });
    return { seeded: true, title: SWITCHER_STATE_TITLE };
  };
}
