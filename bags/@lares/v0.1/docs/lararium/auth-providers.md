<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium/auth-providers >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/docs/lararium/auth-providers"
file-path = "bags/@lares/v0.1/docs/lararium/auth-providers.md"
type  = "text/x-memetic-wikitext"
register      = "CS"
confidence    = 17
mana          = 17
manao         = 17
manaoio       = 16
tagspace      = "stable"
role          = "lararium auth provider taxonomy: providers, HTTP abilities, principal shapes, scope model"
cacheable     = true
retain        = true
status-date   = "2026-04-30"
source-symbol = "LarAuthProvider LarAuthAbility LarAuthPrincipal LarAuthScope LarAuthReceipt"
```



<<~ ahu #head >>

# Auth Providers

Three auth providers gate session entry. HTTP-level abilities form a resource/can
scope model distinct from the Orichalcum capability ladder. Only `local-dev`
executes today; `bluesky-oauth` and `github-vscode` carry principal shapes.

<<~/ahu >>

<<~&#x0002; >>

<<~ ahu #schema >>

## Schema (machine-readable)

```toml
# Auth providers — currently active: local-dev only
auth-providers = ["bluesky-oauth", "github-vscode", "local-dev"]

# HTTP-level abilities — resource/can scope model
# Distinct from Orichalcum ability ladder (which governs CRDT/federation)
auth-abilities = [
  "auth/session",
  "catalog/read",
  "room/read",
  "room/write",
  "corpus/read",
  "corpus/write",
  "canon/move",
  "admin",
]

# Scope shape: { with: "lararium:* | room:altar-fire | corpus:sdm", can: ability | "*" }

# Principal shapes per provider
[principal.bluesky-oauth]
fields = ["did: string (ATProto DID, did:plc:... or did:web:...)", "handle?: string"]

[principal.github-vscode]
fields = ["login: string", "githubId?: string", "editor: vscode|vscode-insiders", "localInstanceId: string"]

[principal.local-dev]
fields = ["label: string"]
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #to-causal-islands ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands family:control role:depends >>
<<~ pranala #to-open-phases ? -> lar:///ha.ka.ba/@lararium/tw5/schema/open-phases family:control role:depends >>

<<~/ahu >>

<<~&#x0003; >>

<<~&#x0004; -> ? >>
