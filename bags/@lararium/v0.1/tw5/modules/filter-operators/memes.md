<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/filter-operators/memes >>
```toml iam
uri-path    = "ha.ka.ba/@lararium/v0.1/tw5/modules/filter-operators/memes"
file-path   = "bags/@lararium/v0.1/tw5/modules/filter-operators/memes.md"
type        = "text/x-memetic-wikitext"
register    = "CS"
confidence  = 14
mana        = 14
manao       = 14
manaoio     = 13
tagspace    = "lararium"
role        = "TW5 filter operator: memes — scaffolded by sync-heleuma --scan-decorators --commit"
heleuma     = "ba"
source-symbol = "collectMemes registerMemes registerMemesSource"
body-sha256 = "3fae979c5db2d0ec9ed21502145a05ce5f275426d64470df9ac07d4fedc5460b"
cacheable   = true
status-date = "2026-05-03"
```

<<~&#x0002;>>

<<~ ahu #head >>

# memes

TW5 filter operator from `@lararium/tw5`.

<<~/ahu >>

<<~ ahu #contract >>

Exported symbols: `collectMemes`, `registerMemes`, `registerMemesSource`.

<<~/ahu >>

<<~ ahu #source >>

```typescript
function collectMemes(wiki: TW5Wiki): string[] {
  const results: string[] = [];
  wiki.each(function (_tiddler, title: string) {
    if (title.startsWith("lar:")) results.push(title);
  });
  return results;
}

export function registerMemes(tw: TW5Instance): void {
  if (!tw?.filterOperators) return;
  tw.filterOperators["memes"] = function (
    _source:   TW5FilterSource,
    _operator: TW5FilterOperator,
    options:   { wiki: TW5Wiki },
  ): string[] {
    return collectMemes(options.wiki);
  };
}

export function registerMemesSource(tw: TW5Instance): void {
  if (!tw?.modules?.types) return;
  tw.modules.types["allfilteroperator"] = tw.modules.types["allfilteroperator"] ?? {};
  if (tw.modules.types["allfilteroperator"]["memes"]) return;
  tw.modules.types["allfilteroperator"]["memes"] = {
    moduleType: "allfilteroperator",
    definition: null,
    exports: {
      memes: function (
        _source:  TW5FilterSource,
        _prefix:  string,
        options:  { wiki: TW5Wiki },
      ): string[] {
        return collectMemes(options.wiki);
      },
    },
  };
}
```

<<~/ahu >>

<<~ ahu #edges >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
