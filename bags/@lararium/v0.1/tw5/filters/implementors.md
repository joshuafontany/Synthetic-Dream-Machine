<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/filters/implementors >>
```toml iam
body-sha256   = "9ab080c221b2718c55b20fba140693f779c2e71e1392c0196316cd93773461d1"
cacheable     = true
file-path     = "bags/@lararium/v0.1/tw5/filters/implementors.md"
heleuma       = "ka"
mana          = 18
module-ref    = "lar:///ha.ka.ba/@lararium/v0.1/tw5/filters/implementors"
register      = "Synthesis-Canon"
retain        = true
role          = "anchor: registerImplementorsOperator — heleuma ka"
source-symbol = "registerImplementors"
type          = "text/x-memetic-wikitext"
uri-path      = "ha.ka.ba/@lararium/v0.1/tw5/filters/implementors"
```

<<~ &#x0002; >>

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

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
