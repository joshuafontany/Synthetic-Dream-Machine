<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/papalohe >>
```toml iam
uri-path = "ha.ka.ba/@lararium/v0.1/tw5/widgets/papalohe"
file-path = "bags/@lararium/v0.1/tw5/widgets/papalohe.md"
type          = "text/x-memetic-wikitext"
register      = "CS"
confidence    = 18
mana          = 18
role          = "anchor: PapaloheWidget — heleuma ka"
heleuma       = "ka"
source-symbol = "PapaloheWidget"
module-ref    = "lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/papalohe"
body-sha256 = "2519de34cc3e6cfbf78423bda0389369f1e4d504f194a4c04934f87dda56f6a1"
cacheable     = true
retain        = true
```

<<~&#x0002; >>

<<~ ahu #contract >>

## Contract

`<$papalohe>` renders a `<meta data-lar-kind="papalohe">` element. Encodes a trigger-fn-slot binding for reactive pipeline hooks. Attributes: `from`, `to`, `trigger`, `fn`, `slot`.

<<~/ahu >>

<<~ ahu #source >>

## Source

```typescript
export function PapaloheWidget(this: TW5WidgetInstance, parseTreeNode: TW5ParseTreeNode, options: Record<string, unknown>) {
  this.initialise(parseTreeNode, options);
}
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #to-pono ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/papalohe family:control role:implements >>
<<~ pranala #to-tw5-widgets ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/tw5-widgets family:control role:implements >>
<<~ pranala #to-module ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/papalohe family:control role:module >>

<<~/ahu >>

<<~&#x0003; >>

<<~&#x0004; -> ? >>
