<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/filter-operators/edge >>
```toml iam
uri-path    = "ha.ka.ba/@lararium/v0.1/tw5/modules/filter-operators/edge"
file-path   = "bags/@lararium/v0.1/tw5/modules/filter-operators/edge.md"
type        = "text/x-memetic-wikitext"
register    = "CS"
confidence  = 14
mana        = 14
manao       = 14
manaoio     = 13
tagspace    = "lararium"
role        = "TW5 filter operator: edge — scaffolded by sync-heleuma --scan-decorators --commit"
heleuma     = "ka"
source-symbol = "registerEdge"
body-sha256 = "410944ae0dd96ed55a0a91f0443532760b016f9fcbc44e0c339d74bcf97d8c37"
cacheable   = true
status-date = "2026-05-03"
```

<<~&#x0002; >>

<<~ ahu #head >>

# edge

TW5 filter operator from `@lararium/tw5`.

<<~/ahu >>

<<~ ahu #contract >>

Exported symbols: `registerEdge`.

<<~/ahu >>

<<~ ahu #source >>

```typescript
export function registerEdge(tw: TW5Instance): void {
  tw.filterOperators["edge"] = function (source: TW5FilterSource, operator: TW5FilterOperator) {
    const family  = operator.suffix ?? "";
    const role    = operator.operand ?? "";
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
}
```

<<~/ahu >>

<<~ ahu #edges >>

<<~/ahu >>

<<~&#x0003; >>

<<~&#x0004; -> ? >>
