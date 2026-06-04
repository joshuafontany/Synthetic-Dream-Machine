<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/filters/edge >>
```toml iam
uri-path = "ha.ka.ba/@lararium/v0.1/tw5/filters/edge"
file-path = "bags/@lararium/v0.1/tw5/filters/edge.md"
type          = "text/x-memetic-wikitext"
register      = "CS"
confidence    = 18
mana          = 18
role          = "anchor: registerEdgeOperator — heleuma ka"
heleuma       = "ka"
source-symbol = "registerEdgeOperator"
module-ref    = "lar:///ha.ka.ba/@lararium/v0.1/tw5/filters/edge"
body-sha256 = "345931be1ee68fb47617f6db9f999e6fffee4a8ead521139f67ed127a557fbc4"
cacheable     = true
retain        = true
```

<<~&#x0002; >>

<<~ ahu #contract >>

## Contract

`edge:family[role]` — returns tiddlers that have an `edge-out-{family}-{role}` field. Omit role to match any edge in the family.

<<~/ahu >>

<<~ ahu #source >>

## Source

```typescript
tw.filterOperators["edge"] = function (source: TW5FilterSource, operator: TW5FilterOperator) {
  const family = operator.suffix ?? "";
  const role   = operator.operand ?? "";
  const results: string[] = [];
  source(function (tiddler, title: string) {
    if (!tiddler) return;
    if (role) {
      const v = tiddler.fields?.[`edge-out-${family}-${role}`];
      if (v !== undefined && v !== "") results.push(title);
    } else {
      const prefix = `edge-out-${family}-`;
      if (Object.keys(tiddler.fields ?? {}).some((k) => k.startsWith(prefix))) results.push(title);
    }
  });
  return results;
};
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #to-tw5-widgets ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/tw5-widgets family:control role:implements >>
<<~ pranala #to-module ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/filters/edge family:control role:module >>

<<~/ahu >>

<<~&#x0003; >>

<<~&#x0004; -> ? >>
