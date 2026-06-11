<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/ui/iam-viewtemplate-tab >>
```toml iam
uri-path = "ha.ka.ba/@lararium/v0.1/tw5/ui/iam-viewtemplate-tab"
file-path = "bags/@lararium/v0.1/tw5/ui/iam-viewtemplate-tab.md"
type = "text/vnd.tiddlywiki"
register     = "Synthesis-Canon"
mana         = 18
manao        = 18
manaoio      = 17
role         = "ViewTemplate tab: injects #iam character sheet as a Metadata tab on all lar: tiddlers"
cacheable    = true
retain       = true
tags         = ["$:/tags/ViewTemplate"]
list-after   = "$:/core/ui/ViewTemplate/body"
```



<<~ &#x0002; >>

<$reveal type="match" state="$:/state/tab/view-1-$(currentTiddler)$" default="iam" text="iam">
<$list filter="[<currentTiddler>prefix[lar:]]" variable="ignore">
<$transclude tiddler="lar:///ha.ka.ba/@lararium/v0.1/tw5/ui/iam-panel" mode="block" />
</$list>
</$reveal>

<<~ ahu #edges >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/tw5/ui/iam-panel >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
