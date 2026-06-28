<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/tw5/modules/filter-operators/implementors >>
```toml iam
body-sha256   = "281fba79de184bd211bec73fddb08dafad85527b4c64bd91ca70824b64fd1577"
cacheable     = true
file-path     = "bags/@lararium/tw5/modules/filter-operators/implementors.md"
heleuma       = "ka"
mana          = 14
manao         = 14
manaoio       = 13
register      = "Synthesis-Canon"
role          = "TW5 filter operator: implementors — scaffolded by sync-heleuma --scan-decorators --commit"
source-symbol = "registerImplementors"
status-date   = "2026-05-03"
l-space       = "lararium"
type          = "text/x-memetic-wikitext"
uri-path      = "ha.ka.ba/@lararium/tw5/modules/filter-operators/implementors"
```

<<~ &#x0002; >>

<<~ ahu #head >>

# implementors

TW5 filter operator from `@lararium/tw5`.

<<~/ahu >>

<<~ ahu #contract >>

Exported symbols: `registerImplementors`.

<<~/ahu >>

<<~ ahu #source >>

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



<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
