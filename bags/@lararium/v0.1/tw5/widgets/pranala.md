<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/pranala >>
```toml iam
uri-path = "ha.ka.ba/@lararium/v0.1/tw5/widgets/pranala"
file-path = "bags/@lararium/v0.1/tw5/widgets/pranala.md"
type          = "text/x-memetic-wikitext"
register      = "CS"
confidence    = 18
mana          = 18
role          = "anchor: PranalaWidget — heleuma ka"
heleuma       = "ka"
source-symbol = "PranalaWidget"
module-ref    = "lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/pranala"
body-sha256 = "c024548a4d09384a9d5df111d3b73b712a2951f3287975efd6140790e2a3ab3d"
cacheable     = true
retain        = true
```

<<~&#x0002; >>

<<~ ahu #contract >>

## Contract

`<$pranala>` renders a `<meta data-lar-kind="pranala">` element carrying edge fields as data attributes. No visible output. Attributes: `from`, `to`, `family`, `role`.

<<~/ahu >>

<<~ ahu #source >>

## Source

```typescript
export function PranalaWidget(this: TW5WidgetInstance, parseTreeNode: TW5ParseTreeNode, options: Record<string, unknown>) {
  this.initialise(parseTreeNode, options);
}
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #to-pono ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala family:control role:implements >>
<<~ pranala #to-tw5-widgets ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/tw5-widgets family:control role:implements >>
<<~ pranala #to-module ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/pranala family:control role:module >>

<<~/ahu >>

<<~&#x0003; >>

<<~&#x0004; -> ? >>
