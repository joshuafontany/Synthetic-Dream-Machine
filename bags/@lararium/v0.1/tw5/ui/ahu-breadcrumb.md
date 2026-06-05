<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/ui/ahu-breadcrumb >>
```toml iam
uri-path = "ha.ka.ba/@lararium/v0.1/tw5/ui/ahu-breadcrumb"
file-path = "bags/@lararium/v0.1/tw5/ui/ahu-breadcrumb.md"
type = "text/vnd.tiddlywiki"
register     = "Synthesis-Canon"
mana         = 18
manao        = 17
manaoio      = 16
role         = "ViewTemplate: slot badge + parent link shown at top of any ahu child tiddler"
cacheable    = true
retain       = true
tags         = ["$:/tags/ViewTemplate"]
list-before  = "$:/core/ui/ViewTemplate/body"
```



<<~ &#x0002; >>

\whitespace trim
<$list filter="[all[current]has[ahu-slot]]" variable="_" emptyMessage="">

<div class="tc-lararium-ahu-breadcrumb">
<span class="tc-ahu-label">ahu</span>
<code class="tc-ahu-slot-badge"><$text text={{{[all[current]get[ahu-slot]]}}}/></code>
<span class="tc-ahu-sep">in</span>
<$link to={{{[all[current]get[ahu-parent]]}}}>
<code><$text text={{{[all[current]get[ahu-parent]]}}}/></code>
</$link>
</div>

</$list>

<<~ &#x0003; >>

<<~ ahu #edges >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>

<<~/ahu >>

<<~ &#x0004; -> ? >>
