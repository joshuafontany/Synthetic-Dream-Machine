<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/pae >>
```toml iam
uri-path = "ha.ka.ba/@lararium/v0.1/tw5/widgets/pae"
file-path = "bags/@lararium/v0.1/tw5/widgets/pae.md"
type          = "text/x-memetic-wikitext"
register      = "CS"
confidence    = 0.88
mana          = 0.88
role          = "anchor: PaeWidget — heleuma ka"
heleuma       = "ka"
source-symbol = "PaeWidget"
module-ref    = "lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/pae"
body-sha256 = "c07b3df5af791f4014879ee3530ed3ee59c1a06a7b41979ee2946118439d1955"
cacheable     = true
retain        = true
```

<<~&#x0002;>>

<<~ ahu #contract >>

## Contract

`<$pae>` is a phase-marker widget. Carries no visible output — phase metadata lives in the AST.

<<~/ahu >>

<<~ ahu #source >>

## Source

```typescript
export function PaeWidget(this: TW5WidgetInstance, parseTreeNode: TW5ParseTreeNode, options: Record<string, unknown>) {
  this.initialise(parseTreeNode, options);
}
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #to-pono ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/pae family:control role:implements >>
<<~ pranala #to-tw5-widgets ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/tw5-widgets family:control role:implements >>
<<~ pranala #to-module ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/pae family:control role:module >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
