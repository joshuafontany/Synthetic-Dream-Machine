<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/lele >>
```toml iam
uri-path = "ha.ka.ba/@lararium/v0.1/tw5/widgets/lele"
file-path = "bags/@lararium/v0.1/tw5/widgets/lele.md"
type          = "text/x-memetic-wikitext"
register      = "Synthesis-Canon"
mana          = 18
role          = "anchor: LeleWidget — heleuma ka"
heleuma       = "ka"
source-symbol = "LeleWidget"
module-ref    = "lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/lele"
body-sha256 = "c8ea0534b4b3f0a660ee5eadfc0144d3f1555b3944e645bbfb17e504f3ad9970"
cacheable     = true
retain        = true
```

<<~ &#x0002; >>

<<~ ahu #contract >>

## Contract

`<$lele>` renders a `<meta data-lar-kind="lele">` element. Carries a `target` attribute pointing to a jump/transclusion target.

<<~/ahu >>

<<~ ahu #source >>

## Source

```typescript
export function LeleWidget(this: TW5WidgetInstance, parseTreeNode: TW5ParseTreeNode, options: Record<string, unknown>) {
  this.initialise(parseTreeNode, options);
}
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #to-pono ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/lele family:control role:implements >>
<<~ pranala #to-tw5-widgets ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/tw5-widgets family:control role:implements >>
<<~ pranala #to-module ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/lele family:control role:module >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
