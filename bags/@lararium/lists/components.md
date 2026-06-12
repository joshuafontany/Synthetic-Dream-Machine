<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/lists/components >>
```toml iam
cacheable = true
file-path = "bags/@lararium/lists/components.md"
mana      = 13
manao     = 16
register  = "Synthesis"
retain    = true
role      = "TW5 procedure: render every @-bag tag on the current tiddler as a clickable tag-pill"
tags      = ["$:/tags/Global"]
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lararium/lists/components"
```

<<~ &#x0002; >>

<<~ ahu #contract >>

## Contract

`<<components>>` reads the rendering context's current tiddler, selects every tag whose title begins with `@` (bag-scoped component and mount-point tags), and renders each as a clickable pill via the `tag-pill` procedure. It takes no argument — composition is declared once as the tiddler's `@`-tags; this macro renders it.

<<~/ahu >>

<<~ ahu #source >>

\procedure components()
<span class="sdm-component-list">
<$list filter="[all[current]tags[]prefix[@]]" variable="tag">
<$transclude $variable="tag-pill" target=<<tag>>/>
</$list>
</span>
\end

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #see ? -> lar:///ha.ka.ba/@sdm/procedures/tag-pill family:reference role:see >>
<<~ pranala #to-tw5-ui ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/ui/iam-panel family:reference role:see >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
