<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/filter-operators/implementors >>
```toml iam
uri-path    = "ha.ka.ba/@lararium/v0.1/tw5/modules/filter-operators/implementors"
file-path   = "bags/@lararium/v0.1/tw5/modules/filter-operators/implementors.md"
type        = "text/x-memetic-wikitext"
register    = "Synthesis-Canon"
mana        = 14
manao       = 14
manaoio     = 13
tagspace    = "lararium"
role        = "TW5 filter operator: implementors — scaffolded by sync-heleuma --scan-decorators --commit"
heleuma     = "ka"
source-symbol = "registerImplementors"
body-sha256 = "281fba79de184bd211bec73fddb08dafad85527b4c64bd91ca70824b64fd1577"
cacheable   = true
status-date = "2026-05-03"
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
