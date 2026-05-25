<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/filter-operators/toml-field >>
```toml iam
uri-path    = "ha.ka.ba/@lararium/v0.1/tw5/modules/filter-operators/toml-field"
file-path   = "bags/@lararium/v0.1/tw5/modules/filter-operators/toml-field.md"
type        = "text/x-memetic-wikitext"
register    = "CS"
confidence  = 14
mana        = 14
manao       = 14
manaoio     = 13
tagspace    = "lararium"
role        = "TW5 filter operator: toml-field — scaffolded by sync-heleuma --scan-decorators --commit"
heleuma     = "ka"
source-symbol = "registerTomlField"
body-sha256 = "cc83e7dcde3bedd78f80de35ab3b8adc8d25af6aa39d64afc348355138d957b5"
cacheable   = true
status-date = "2026-05-03"
```

<<~&#x0002;>>

<<~ ahu #head >>

# toml-field

TW5 filter operator from `@lararium/tw5`.

<<~/ahu >>

<<~ ahu #contract >>

Exported symbols: `registerTomlField`.

<<~/ahu >>

<<~ ahu #source >>

```typescript
export function registerTomlField(tw: TW5Instance): void {
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
}
```

<<~/ahu >>

<<~ ahu #edges >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
