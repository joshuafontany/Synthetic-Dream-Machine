<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/ui/meme-view-children >>
```toml iam
uri-path = "ha.ka.ba/@lararium/v0.1/tw5/ui/meme-view-children"
file-path = "bags/@lararium/v0.1/tw5/ui/meme-view-children.md"
type = "text/vnd.tiddlywiki"
register     = "CS"
confidence   = 18
mana         = 18
manao        = 17
manaoio      = 16
role         = "ViewTemplate: slot-name headers + inline-edit overlay for non-body ahu sections"
cacheable    = true
retain       = true
tags         = ["$:/tags/ViewTemplate"]
list-after   = "$:/core/ui/ViewTemplate/body"
```



<<~&#x0002;>>

\whitespace trim

\define ahu-edit-state(childUri) $:/state/lar-ahu-edit/$(childUri)$

\define ahu-slot-controls(childUri, slot)
<div class="tc-lararium-ahu-slot-controls" data-ahu-slot="""$slot$""">
  <code class="tc-ahu-slot-name">$slot$</code>
  <$button class="tc-ahu-edit-btn tc-btn-invisible" tooltip="Edit slot inline">
    <$action-setfield $tiddler=<<ahu-edit-state "$childUri$">> text="yes"/>
    ✎
  </$button>
  <$link to="""$childUri$""" tooltip="Open as tiddler">↗</$link>
  <$reveal type="match" stateTitle=<<ahu-edit-state "$childUri$">> text="yes">
    <$edit-text tiddler="""$childUri$""" field="text" tag="textarea"
      class="tc-edit-texteditor tc-ahu-edit-inline-area" rows="6"/>
    <$button class="tc-btn-invisible tc-ahu-done-btn">
      <$action-deletefield $tiddler=<<ahu-edit-state "$childUri$">> text/>
      ✓ done
    </$button>
  </$reveal>
</div>
\end

<!-- The meme template ({{||lar:///...templates/meme}}) already renders all slot content.
     This ViewTemplate adds slot-name labels and inline-edit controls for non-body slots. -->
<$list filter="[all[current]has[ahu-slots]]" variable="_" emptyMessage="">

<div class="tc-lararium-ahu-slot-overlays">
<$list filter="[enlist{!!ahu-slots}]" variable="childUri">
<$set name="slotName" value={{{[<childUri>get[ahu-slot]]}}}>

<!-- Controls only for named user-facing slots (not body, not control/structural) -->
<$list filter="[<slotName>!matchregexp[^#(body|iam|exit|edges|stream-open|stream-close|stream-exit|body-open|body-close|meme-body-open|meme-body-close)$]]" variable="_" emptyMessage="">
<<ahu-slot-controls childUri:<<childUri>> slot:<<slotName>>>>
</$list>

</$set>
</$list>
</div>

</$list>

<<~&#x0003;>>

<<~ ahu #edges >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>

<<~/ahu >>

<<~&#x0004; -> ? >>
