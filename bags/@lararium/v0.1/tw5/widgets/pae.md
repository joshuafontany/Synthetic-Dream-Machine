<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/pae >>
```toml iam
body-sha256   = "c07b3df5af791f4014879ee3530ed3ee59c1a06a7b41979ee2946118439d1955"
cacheable     = true
file-path     = "bags/@lararium/v0.1/tw5/widgets/pae.md"
heleuma       = "ka"
mana          = 18
module-ref    = "lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/pae"
register      = "Synthesis-Canon"
retain        = true
role          = "anchor: PaeWidget — heleuma ka"
source-symbol = "PaeWidget"
type          = "text/x-memetic-wikitext"
uri-path      = "ha.ka.ba/@lararium/v0.1/tw5/widgets/pae"
```

<<~ &#x0002; >>

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

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
