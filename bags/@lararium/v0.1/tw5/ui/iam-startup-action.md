<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/ui/iam-startup-action >>
```toml iam
uri-path = "ha.ka.ba/@lararium/v0.1/tw5/ui/iam-startup-action"
file-path = "bags/@lararium/v0.1/tw5/ui/iam-startup-action.md"
type = "text/vnd.tiddlywiki"
register     = "CS"
confidence   = 0.88
mana         = 0.88
manao        = 0.85
manaoio      = 0.82
role         = "startup action: routes lar:///...#slot URL fragments to parent tiddler + correct tab state"
cacheable    = true
retain       = true
tags         = ["$:/tags/StartupAction"]
list-after   = "$:/core/ui/StartupActions/DefaultTiddlers"
```



<<~&#x0002;>>

\rules only filteredtranscludeinline transcludeinline

<$list filter="[[$:/temp/lar-fragment-routed]get[text]!match[yes]]" variable="ignore">

<$set name="rawHash" value={{{ [[$:/info/url/hash]get[text]] }}}>
<$set name="target" value={{{ [<rawHash>removeprefix[#]] }}}>

<!-- Only act on lar: fragment targets that contain a slot anchor -->
<$list filter="[<target>prefix[lar:]contains[#]]" variable="ignore">

  <$set name="hashIdx" value={{{ [<target>search[#]] }}}>
  <$set name="parentUri" value={{{ [<target>split[#]nth[1]] }}}>
  <$set name="slot"      value={{{ [<target>split[#]nth[2]] }}}>

  <!-- Open the parent tiddler in the story river -->
  <$action-navigate $to=<<parentUri>> />

  <!-- Set the ViewTemplate tab state to the slot name -->
  <$action-setfield $tiddler={{{ [[$:/state/tab/view-1-]addsuffix<parentUri>] }}}
    text=<<slot>> />

  <!-- Guard: mark as routed so this action only fires once per session -->
  <$action-setfield $tiddler="$:/temp/lar-fragment-routed" text="yes" />

</$list>
</$set>
</$set>
</$set>

</$list>

<<~&#x0003;>>

<<~ ahu #edges >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/tw5/ui/iam-viewtemplate-tab >>

<<~/ahu >>

<<~&#x0004; -> ? >>
