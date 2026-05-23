<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/receipt-allows >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/receipt-allows"
file-path = "bags/@lares/v0.1/api/pono/receipt-allows.md"
type  = "text/x-memetic-wikitext"
register      = "CS"
confidence    = 0.88
mana          = 0.87
manao         = 0.85
manaoio       = 0.83
role          = "canonical source copy: receipt authorization gate — checks a LarAuthReceipt scope set against a resource + ability pair"
status-date   = "2026-04-30"
heleuma       = "ka"
source-symbol = "receiptAllows"
implements    = ["lar:///ha.ka.ba/@lares/v0.1/api/pono/heleuma/ka"]
body-sha256 = "902384bddf7a2475d207b38cfe20e7268479741326db46c8a4ef252b747b4e97"
```



<<~&#x0002;>>

<<~ ahu #ooda-ha >>

✶ a receipt arrives with a resource identifier and an ability name.
⏿ orient: has the receipt expired? does any scope cover this resource/ability pair?
◇ decide: wildcard resource (`lararium:*`) covers everything; prefix match covers namespaced resources; `*` ability covers all abilities.
▶ iterate receipt.scopes — return true on first matching scope; false if none match or if receipt is expired.
⤴ verify: expiry check runs first and short-circuits; no scope is checked if expired.
↺ pure predicate — no side effects, no mutation. Callers own session state.

<<~/ahu >>

<<~ ahu #contract >>

## Contract

`receiptAllows(receipt, resource, ability)` is the inner authorization predicate. It answers: does this auth receipt grant the named ability on the named resource?

**Scope model**: a `LarAuthReceipt` carries a `scopes` array of `{ with: string, can: LarAuthAbility | "*" }` entries. `with: "lararium:*"` is the wildcard resource. `can: "*"` grants all abilities.

**Expiry**: receipts with `expiresAt` set are rejected after that timestamp. The `now` parameter defaults to `new Date()` but is injectable for testing.

**Why compiled-in**: this predicate runs in the Automerge share-policy gate (`LarAuthSessionRegistry.isAuthorized`) and in HTTP handlers before any corpus meme is available. It cannot wait for TW5 to boot.

Keyhive will eventually replace this model: capability proofs carry their own scope and validity without a mutable receipt store. `receiptAllows` will be superseded, not promoted.

<<~/ahu >>

<<~ ahu #source >>

## Source (TypeScript — compiled-in)

```typescript
export function receiptAllows(
  receipt: LarAuthReceipt,
  resource: string,
  ability: LarAuthAbility,
  now = new Date(),
): boolean {
  if (receipt.expiresAt && Date.parse(receipt.expiresAt) < now.getTime()) return false;
  return receipt.scopes.some((scope) => {
    const resourceOk = scope.with === "lararium:*" || scope.with === resource || resource.startsWith(scope.with.replace(/\*$/, ""));
    const abilityOk = scope.can === "*" || scope.can === ability;
    return resourceOk && abilityOk;
  });
}
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #auth-providers ? -> lar:///ha.ka.ba/@lararium/tw5/schema/auth-providers family:control role:depends >>
<<~ pranala #open-phases ? -> lar:///ha.ka.ba/@lararium/tw5/schema/open-phases family:control role:depends >>
<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
