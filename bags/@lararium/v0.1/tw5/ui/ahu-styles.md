<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/ui/ahu-styles >>
```toml iam
cacheable = true
file-path = "bags/@lararium/v0.1/tw5/ui/ahu-styles.md"
mana      = 18
manao     = 17
manaoio   = 16
register  = "Synthesis-Canon"
retain    = true
role      = "CSS stylesheet: ahu section view/edit layout, slot badges, inline edit reveal"
tags      = ["$:/tags/Stylesheet"]
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lararium/v0.1/tw5/ui/ahu-styles"
```

<<~ &#x0002; >>

\rules only filteredtranscludeinline transcludeinline
/* Depends on: a palette tiddler loaded before this stylesheet — <<colour X>> resolves
   at TW5 stylesheet injection time. Palette preloaded via lares-preloads.ts. */

/* ── ahu section layout ─────────────────────────────────────────────────── */

.tc-lararium-ahu-sections {
  margin-top: 1em;
  border-top: 1px solid <<colour tiddler-editor-border>>;
}

.tc-lararium-ahu-section {
  margin: 0.75em 0 0;
  padding: 0.5em 0 0.5em 0.75em;
  border-left: 3px solid <<colour primary>>;
}

.tc-lararium-ahu-section:hover {
  border-left-color: <<colour primary>>;
  background: <<colour tiddler-editor-background>>;
}

/* ── slot header ────────────────────────────────────────────────────────── */

.tc-lararium-ahu-slot-header {
  display: flex;
  align-items: center;
  gap: 0.4em;
  margin-bottom: 0.3em;
  font-size: 0.8em;
  opacity: 0.75;
}

.tc-lararium-ahu-slot-header:hover {
  opacity: 1;
}

code.tc-ahu-slot-name {
  font-size: 0.85em;
  padding: 0.1em 0.4em;
  border-radius: 3px;
  background: <<colour code-background>>;
  color: <<colour code-foreground>>;
  letter-spacing: 0.02em;
}

.tc-ahu-edit-btn,
.tc-ahu-done-btn {
  padding: 0 0.35em;
  opacity: 0;
  transition: opacity 0.15s;
}

.tc-lararium-ahu-slot-header:hover .tc-ahu-edit-btn {
  opacity: 1;
}

/* ── inline edit reveal ─────────────────────────────────────────────────── */

.tc-lararium-ahu-edit-inline {
  display: flex;
  flex-direction: column;
  gap: 0.25em;
}

.tc-ahu-edit-inline-area {
  width: 100%;
  min-height: 6em;
  font-family: monospace;
  font-size: 0.9em;
  resize: vertical;
}

/* ── breadcrumb ─────────────────────────────────────────────────────────── */

.tc-lararium-ahu-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.4em;
  margin-bottom: 0.75em;
  font-size: 0.8em;
  opacity: 0.7;
}

.tc-ahu-label {
  font-variant: small-caps;
  letter-spacing: 0.05em;
}

code.tc-ahu-slot-badge {
  padding: 0.1em 0.4em;
  border-radius: 3px;
  background: <<colour code-background>>;
  color: <<colour code-foreground>>;
}

.tc-ahu-sep {
  opacity: 0.6;
}

/* ── edit template ──────────────────────────────────────────────────────── */

.tc-lararium-ahu-edit-sections {
  margin-top: 1em;
}

.tc-lararium-ahu-edit-fieldset {
  border: 1px solid <<colour tiddler-editor-border>>;
  border-radius: 4px;
  padding: 0.5em 0.75em;
}

.tc-lararium-ahu-edit-legend {
  padding: 0 0.4em;
  font-size: 0.8em;
  font-variant: small-caps;
  letter-spacing: 0.05em;
  opacity: 0.7;
}

.tc-lararium-ahu-edit-section {
  margin: 0.5em 0;
}

.tc-ahu-edit-body {
  width: 100%;
  min-height: 4em;
  font-family: monospace;
  font-size: 0.9em;
  resize: vertical;
}

/* ── worksite data anchors (invisible structural markers) ───────────────── */

span[data-lar-kind="worksite"] {
  display: contents;
}

span[data-lar-kind="worksite"]:not([data-lar-slot="#body"]) {
  display: none;
}

<<~ ahu #edges >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
