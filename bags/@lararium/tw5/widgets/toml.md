<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/tw5/widgets/toml >>
```toml iam
uri-path = "ha.ka.ba/@lararium/tw5/widgets/toml"
file-path = "bags/@lararium/tw5/widgets/toml.md"
type          = "text/x-memetic-wikitext"
register      = "CS"
confidence    = 0.88
mana          = 0.88
role          = "anchor: TomlWidget — heleuma ka"
heleuma       = "ka"
source-symbol = "TomlWidget"
module-ref    = "lar:///ha.ka.ba/@lararium/tw5/widgets/toml"
body-sha256 = "d4f13f77f33d37dc2115243f6271a959c1021f2ee5226a8e4c8d733232adeb50"
cacheable     = true
retain        = true
```

<<~&#x0002;>>

<<~ ahu #contract >>

## Contract

`<$toml>` renders a `<script type="application/toml" data-lar-kind="toml">` element. The `content` attribute is the raw TOML string.

<<~/ahu >>

<<~ ahu #source >>

## Source

```typescript
export function TomlWidget(this: TW5WidgetInstance, parseTreeNode: TW5ParseTreeNode, options: Record<string, unknown>) {
  this.initialise(parseTreeNode, options);
}
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #to-pono ? -> lar:///ha.ka.ba/@lares/api/v0.1/pono/toml family:control role:implements >>
<<~ pranala #to-tw5-widgets ? -> lar:///ha.ka.ba/@lararium/tw5/modules/tw5-widgets family:control role:implements >>
<<~ pranala #to-module ? -> lar:///ha.ka.ba/@lararium/tw5/widgets/toml family:control role:module >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
