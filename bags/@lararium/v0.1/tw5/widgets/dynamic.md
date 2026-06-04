<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/dynamic >>
```toml iam
uri-path = "ha.ka.ba/@lararium/v0.1/tw5/widgets/dynamic"
file-path = "bags/@lararium/v0.1/tw5/widgets/dynamic.md"
type          = "text/x-memetic-wikitext"
register      = "CS"
confidence    = 18
mana          = 18
role          = "anchor: DynamicWidget — heleuma ka"
heleuma       = "ka"
source-symbol = "DynamicWidget"
module-ref    = "lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/dynamic"
body-sha256 = "f215c3518f1c876508cedb636c7dd2f34acd16a538248a7a28c03ed894f3e4ee"
cacheable     = true
retain        = true
```

<<~&#x0002; >>

<<~ ahu #contract >>

## Contract

`<$dynamic>` renders a `<span data-lar-kind="dynamic">` element. `data-lar-sigil` is the parse-tree tag. Renders children inside the span. Used for dynamically-resolved sigil forms.

<<~/ahu >>

<<~ ahu #source >>

## Source

```typescript
export function DynamicWidget(this: TW5WidgetInstance, parseTreeNode: TW5ParseTreeNode, options: Record<string, unknown>) {
  this.initialise(parseTreeNode, options);
}
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #to-pono ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/dynamic family:control role:implements >>
<<~ pranala #to-tw5-widgets ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/tw5-widgets family:control role:implements >>
<<~ pranala #to-module ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/dynamic family:control role:module >>

<<~/ahu >>

<<~&#x0003; >>

<<~&#x0004; -> ? >>
