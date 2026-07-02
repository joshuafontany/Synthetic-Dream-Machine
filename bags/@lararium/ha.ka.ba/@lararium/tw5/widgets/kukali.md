<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/tw5/widgets/kukali >>
```toml iam
body-sha256   = "8872eb1c59367ae0c24cc5bcffe34d6b83f25fa09edda99d6637fd16c198b5d3"
cacheable     = true
file-path     = "bags/@lararium/tw5/widgets/kukali.md"
heleuma       = "ka"
mana          = 18
module-ref    = "lar:///ha.ka.ba/@lararium/tw5/widgets/kukali"
register      = "Synthesis-Canon"
retain        = true
role          = "anchor: KukaliWidget — heleuma ka"
source-symbol = "KukaliWidget"
tags          = ["lar:///ha.ka.ba/@lares/api/pono/kukali", "tw5/modules/tw5-widgets"]
type          = "text/x-memetic-wikitext"
uri-path      = "ha.ka.ba/@lararium/tw5/widgets/kukali"
```

<<~ &#x0002; >>

<<~ ahu #contract >>

## Contract

`<$kukali>` renders a `<span data-lar-kind="kukali">` element and wires a reactive hook via `wiki._larKukaliHook`. The hook cancel function is stored on the DOM node. Attribute: `trigger`.

<<~/ahu >>

<<~ ahu #source >>

## Source

```typescript
export function KukaliWidget(this: TW5WidgetInstance, parseTreeNode: TW5ParseTreeNode, options: Record<string, unknown>) {
  this.initialise(parseTreeNode, options);
}
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ loulou lar:///ha.ka.ba/@lararium/tw5/widgets/kukali >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
