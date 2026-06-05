<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/filters/toml-field >>
```toml iam
uri-path = "ha.ka.ba/@lararium/v0.1/tw5/filters/toml-field"
file-path = "bags/@lararium/v0.1/tw5/filters/toml-field.md"
type          = "text/x-memetic-wikitext"
register      = "Synthesis-Canon"
mana          = 18
role          = "anchor: registerTomlFieldOperator — heleuma ka"
heleuma       = "ka"
source-symbol = "registerTomlFieldOperator"
module-ref    = "lar:///ha.ka.ba/@lararium/v0.1/tw5/filters/toml-field"
body-sha256 = "be6b13cb4d87d73e9447e498196e8ab7d28344a46a5dc322727e4cba7d201158"
cacheable     = true
retain        = true
```

<<~ &#x0002; >>

<<~ ahu #contract >>

## Contract

`toml:fieldName[value]` — returns tiddlers where `fields[fieldName] === value`. Used for TOML-indexed field queries.

<<~/ahu >>

<<~ ahu #source >>

## Source

```typescript
tw.filterOperators["toml"] = function (source: TW5FilterSource, operator: TW5FilterOperator) {
  const fieldName = operator.suffix ?? "";
  const value     = operator.operand ?? "";
  const results: string[] = [];
  source(function (tiddler, title: string) {
    if (!tiddler) return;
    const fv: string = String(tiddler.fields?.[fieldName] ?? "");
    if (fv === value) results.push(title);
  });
  return results;
};
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #to-tw5-widgets ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/tw5-widgets family:control role:implements >>
<<~ pranala #to-module ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/filters/toml-field family:control role:module >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
