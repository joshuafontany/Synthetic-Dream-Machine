<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/ui/engine-update-banner >>
```toml iam
uri-path = "ha.ka.ba/@lararium/v0.1/tw5/ui/engine-update-banner"
file-path = "bags/@lararium/v0.1/tw5/ui/engine-update-banner.md"
type         = "text/vnd.tiddlywiki"
register     = "Synthesis-Canon"
mana         = 18
manao        = 17
manaoio      = 16
role         = "Engine update banner — shown when SW caches a new TW5 engine version; prompts page reload"
cacheable    = true
retain       = true
tags         = ["$:/tags/PageTemplate"]
```



<<~ &#x0002; >>

<$reveal type="nomatch" state="$:/lararium/engine/update-available" text="">
<div class="lar-engine-update-banner">
⬡ lararium — engine update ready (v<$text text={{$:/lararium/engine/update-available}}/>). <$button class="lar-engine-update-reload" onclick="location.reload()">reload</$button>
</div>
</$reveal>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
