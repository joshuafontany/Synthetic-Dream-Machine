<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/node/v0.1/handler-args >>
```toml iam
uri-path    = "ha.ka.ba/@lararium/node/v0.1/handler-args"
file-path   = "bags/@lararium/node/v0.1/handler-args.md"
heleuma     = "ba"
type        = "text/x-memetic-wikitext"
register    = "CS"
confidence  = 0.88
mana        = 0.85
manao       = 0.83
manaoio     = 0.80
role        = "heleuma: command-handler argument coercers + requestId factory"
cacheable   = true
retain      = true
```
<<~&#x0002;>>

<<~ ahu #contract >>

## Contract

Four exports. All pure functions. No imports from Lararium packages.

- `stringArg(args, key)` — returns `string`, empty string when absent or non-string.
- `optionalStringArg(args, key)` — returns `string | null`, null when absent or empty.
- `numberArg(args, key, fallback)` — returns finite number or `fallback`.
- `makeRequestId(prefix)` — returns a stable-ish `"${prefix}-${Date.now()}-${random}"` string for internal `ChangeOrigin.requestId` fields when no command context supplies one.

## Why here

Every `CommandHandler` receives `args: Readonly<Record<string, unknown>>`. Before this file, each handler module defined its own local `stringArg`. Three copies existed in `wiki-handlers.ts`, `epoch-handlers.ts`, and `promote-handler.ts`. `ctx_request_id_safe()` was duplicated across two files under different names.

## Promotion path

These helpers carry no side effects or platform assumptions. They could become a TW5 `\function` block when the quine's wikitext evaluation surface reaches parity with synchronous JS coercion. Until then: `heleuma = "ba"`.

<<~/ahu >>

<<~&#x0003;>>
<<~&#x0004; -> ? >>
