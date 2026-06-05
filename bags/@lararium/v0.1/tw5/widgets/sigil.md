<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/sigil >>
```toml iam
uri-path = "ha.ka.ba/@lararium/v0.1/tw5/widgets/sigil"
file-path = "bags/@lararium/v0.1/tw5/widgets/sigil.md"
type          = "text/x-memetic-wikitext"
register      = "Synthesis-Canon"
mana          = 18
role          = "anchor: SigilWidget — heleuma ka"
heleuma       = "ka"
source-symbol = "SigilWidget"
module-ref    = "lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/sigil"
body-sha256 = "466661b14ac6fd3d3b560f87f698927c6857905c5ff020e21b965a05a24cf902"
cacheable     = true
retain        = true
```

<<~ &#x0002; >>

<<~ ahu #contract >>

## Contract

`<$sigil>` renders a `<span data-lar-kind="sigil">` element. `data-lar-sigil` is the parse-tree tag. Renders children inside the span.

<<~/ahu >>

<<~ ahu #source >>

## Source

```typescript
export function SigilWidget(this: TW5WidgetInstance, parseTreeNode: TW5ParseTreeNode, options: Record<string, unknown>) {
  this.initialise(parseTreeNode, options);
}
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #to-pono ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/sigil family:control role:implements >>
<<~ pranala #to-tw5-widgets ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/tw5-widgets family:control role:implements >>
<<~ pranala #to-module ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/sigil family:control role:module >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
