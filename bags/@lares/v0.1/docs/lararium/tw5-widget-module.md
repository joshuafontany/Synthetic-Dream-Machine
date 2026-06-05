<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium/tw5-widget-module >>
```toml iam
uri-path     = "ha.ka.ba/@lares/v0.1/docs/lararium/tw5-widget-module"
file-path = "bags/@lares/v0.1/docs/lararium/tw5-widget-module.md"
type = "text/x-memetic-wikitext"
register     = "Synthesis-Canon"
mana         = 17
manao        = 17
manaoio      = 16
role         = "design doc: TW5 widget module protocol — two-phase stub preload + prototype chain wiring"
status-date  = "2026-04-30"
source       = "lar:///ha.ka.ba/@lares/v0.1/api/lararium/modules/widget-module"
```



<<~ &#x0002; >>

<<~ ahu #overview >>

## Overview

TW5 widget modules are registered by a two-phase protocol because the TW5 `Widget` base class does not exist until after `instance.boot.boot()` resolves. The compiled-in TypeScript classes cannot be wired at preload time.

The canonical source for this protocol is at `lar:///ha.ka.ba/@lares/v0.1/api/lararium/modules/widget-module`.

<<~/ahu >>

<<~ ahu #two-phase >>

## Two-Phase Boot

**Phase 1 — preload stub:** `LARARIUM_WIDGETS_TIDDLER` carries an empty JavaScript body with `module-type = "widget"`. TW5 registers the title in its module registry but evaluates nothing from the stub body. This reserves the slot and makes `lar:///lararium-node/tw5/widgets` visible to `[all[shadows]tag[$:/tags/Global]]`.

**Phase 2 — wire after boot:** `_bootModules()` calls `createLarariumWidgets(tw)`, which returns plain constructor functions for each widget tag. Each constructor is then prototype-chained to the real `Widget` base class and registered in `WidgetCtor.prototype.widgetClasses`. From this point TW5 can instantiate `lararium-*` widgets during render.

<<~/ahu >>

<<~ ahu #corpus-path >>

## Corpus Path

When the boot gate passes at least one corpus meme, `tw5-modules` is loaded as a library bundle. That bundle includes MemeticParser and all widget classes compiled and pre-wired. The two-phase imperative protocol is skipped entirely on the corpus path.

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
