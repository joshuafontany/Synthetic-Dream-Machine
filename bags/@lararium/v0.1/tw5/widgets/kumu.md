<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/kumu >>
```toml iam
uri-path = "ha.ka.ba/@lararium/v0.1/tw5/widgets/kumu"
file-path = "bags/@lararium/v0.1/tw5/widgets/kumu.md"
type          = "text/x-memetic-wikitext"
register      = "CS"
confidence    = 0.88
mana          = 0.88
role          = "anchor: KumuWidget — heleuma ka"
heleuma       = "ka"
source-symbol = "KumuWidget"
module-ref    = "lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/kumu"
body-sha256 = "2d9063b1652eba93ba1e434707360028e4543bb27a20981942e655ee0b35d61b"
cacheable     = true
retain        = true
```

<<~&#x0002;>>

<<~ ahu #contract >>

## Contract

`<$kumu>` resolves a named kumu device by `[all[tiddlers]tag[$:/tags/LarariumKumu]field:kumu-name[name]]`, transcluding it with props. Renders a `<div data-lar-kind="kumu">` container; unresolved devices show a `<span data-lar-kind="hole">`. Attributes: `name`, `props`.

<<~/ahu >>

<<~ ahu #source >>

## Source

```typescript
export function KumuWidget(this: TW5WidgetInstance, parseTreeNode: TW5ParseTreeNode, options: Record<string, unknown>) {
  this.initialise(parseTreeNode, options);
}
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #to-pono ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/kumu family:control role:implements >>
<<~ pranala #to-tw5-widgets ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/tw5-widgets family:control role:implements >>
<<~ pranala #to-module ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/widgets/kumu family:control role:module >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
