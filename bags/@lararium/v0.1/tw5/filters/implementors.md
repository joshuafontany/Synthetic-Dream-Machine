<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/filters/implementors >>
```toml iam
uri-path = "ha.ka.ba/@lararium/v0.1/tw5/filters/implementors"
file-path = "bags/@lararium/v0.1/tw5/filters/implementors.md"
type          = "text/x-memetic-wikitext"
register      = "CS"
confidence    = 18
mana          = 18
role          = "anchor: registerImplementorsOperator — heleuma ka"
heleuma       = "ka"
source-symbol = "registerImplementors"
module-ref    = "lar:///ha.ka.ba/@lararium/v0.1/tw5/filters/implementors"
body-sha256 = "9ab080c221b2718c55b20fba140693f779c2e71e1392c0196316cd93773461d1"
cacheable     = true
retain        = true
```

<<~&#x0002;>>

<<~ ahu #contract >>

## Contract

`implementors[X]` — returns tiddlers whose `implements` field (space-separated list) contains X.

<<~/ahu >>

<<~ ahu #source >>

## Source

```typescript
export function registerImplementors(tw: TW5Instance): void {
  tw.filterOperators["implementors"] = function (source: TW5FilterSource, operator: TW5FilterOperator) {
    const target  = operator.operand ?? "";
    const results: string[] = [];
    source(function (tiddler, title: string) {
      if (!tiddler) return;
      const raw: string    = String(tiddler.fields?.["implements"] ?? "");
      const tokens: string[] = tw.utils.parseStringArray(raw) ?? [];
      if (tokens.includes(target)) results.push(title);
    });
    return results;
  };
}
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #to-tw5-widgets ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/tw5-widgets family:control role:implements >>
<<~ pranala #to-module ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/filters/implementors family:control role:module >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
