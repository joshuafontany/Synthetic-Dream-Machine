<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/sync/save-cascade >>
```toml iam
uri-path = "ha.ka.ba/@lararium/v0.1/tw5/sync/save-cascade"
file-path = "bags/@lararium/v0.1/tw5/sync/save-cascade.md"
type = "text/x-memetic-wikitext"
register     = "CS"
confidence   = 0.88
mana         = 0.90
manao        = 0.87
manaoio      = 0.85
tagspace     = "adjacent"
role         = "corpus-driven write-routing cascade for LarariumCrdtSyncAdaptor: ordered TW5 filter rules mapping tiddler titles to save strategies"
cacheable    = true
retain       = true
status-date   = "2026-04-30"
source-symbol = "SaveStrategy _resolveSaveStrategy _saveHandlers"
```



<<~&#x0002;>>

<<~ ahu #law >>

## Save Cascade Law

The save cascade is the write-routing constitution for `LarariumCrdtSyncAdaptor`.
When TW5 fires `saveTiddler(tiddler)`, the adaptor resolves a `SaveStrategy` for the tiddler title by walking these rules in `order` — first match wins.

Two strategies exist:
- `skip` — do not propagate to the shared Automerge store (session-local scratch: `$:/temp/*`, TW5 system internals)
- `direct` — write one `LarTiddlerRecord` per tiddler to the store; ahu slot children write as independent records alongside their parent

Draft tiddlers (`Draft of ...`) use `direct` — they are identity-scoped, not session-scoped. A user's in-progress edit syncs across their devices.

The cascade is read at runtime from the wiki via:
```
[tag[lar:///ha.ka.ba/@lararium/v0.1/tw5/sync/save-cascade]has[tw5-filter]sort[order]]
```
Each tagged child tiddler contributes one rule via its `tw5-filter` and `save-strategy` fields.

<<~/ahu >>

<<~ ahu #skip-system >>
```toml
ahu-slot      = "#skip-system"
ahu-parent    = "lar:///ha.ka.ba/@lararium/v0.1/tw5/sync/save-cascade"
order         = 1
tw5-filter    = "[is[system]]"
save-strategy = "skip"
rationale     = "TW5 $:/ system tiddlers are internal housekeeping — never propagate to shared state"
```
<<~/ahu >>

<<~ ahu #skip-temp >>
```toml
ahu-slot      = "#skip-temp"
ahu-parent    = "lar:///ha.ka.ba/@lararium/v0.1/tw5/sync/save-cascade"
order         = 2
tw5-filter    = "[prefix[$:/temp/]]"
save-strategy = "skip"
rationale     = "session-local scratch tiddlers — browser-only, not canonical"
```
<<~/ahu >>

<<~ ahu #sync-draft >>
```toml
ahu-slot      = "#sync-draft"
ahu-parent    = "lar:///ha.ka.ba/@lararium/v0.1/tw5/sync/save-cascade"
order         = 3
tw5-filter    = "[prefix[Draft of ]]"
save-strategy = "direct"
rationale     = "TW5 edit-draft tiddlers — synced across all devices for this user identity; a draft begun on one device should appear on another"
```
<<~/ahu >>

<<~ ahu #direct >>
```toml
ahu-slot      = "#direct"
ahu-parent    = "lar:///ha.ka.ba/@lararium/v0.1/tw5/sync/save-cascade"
order         = 4
tw5-filter    = "[prefix[lar:]]"
save-strategy = "direct"
rationale     = "canonical lar: URI memes — write one LarTiddlerRecord per tiddler directly to the Automerge store; ahu slot children included as independent records"
```
<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #used-by ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/sync-adaptor family:control role:read-by >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
