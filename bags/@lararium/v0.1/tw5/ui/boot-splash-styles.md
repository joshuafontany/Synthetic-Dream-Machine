<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/ui/boot-splash-styles >>
```toml iam
uri-path = "ha.ka.ba/@lararium/v0.1/tw5/ui/boot-splash-styles"
file-path = "bags/@lararium/v0.1/tw5/ui/boot-splash-styles.md"
type         = "text/vnd.tiddlywiki"
register     = "CS"
confidence   = 0.88
mana         = 0.88
manao        = 0.85
manaoio      = 0.82
role         = "CSS for Lararium boot-splash banner — visible while causal islands warm"
cacheable    = true
retain       = true
tags         = ["$:/tags/Stylesheet"]
```



<<~&#x0002;>>

.lar-boot-banner {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  background: #1a1a2e;
  color: #e0e0ff;
  border-radius: 8px;
  padding: .6rem 1.2rem;
  font-size: .85rem;
  font-family: monospace;
  box-shadow: 0 2px 12px rgba(0,0,0,.4);
  z-index: 9999;
  animation: lar-pulse 2s ease-in-out infinite;
}

@keyframes lar-pulse {
  0%, 100% { opacity: .8; }
  50%       { opacity: 1; }
}

.lar-engine-update-banner {
  position: fixed;
  top: 1rem;
  right: 1.5rem;
  background: #1a2e1a;
  color: #b0ffb0;
  border-radius: 8px;
  padding: .6rem 1.2rem;
  font-size: .85rem;
  font-family: monospace;
  box-shadow: 0 2px 12px rgba(0,0,0,.4);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: .6rem;
}

.lar-engine-update-reload {
  background: #2a5a2a;
  color: #b0ffb0;
  border: 1px solid #4a8a4a;
  border-radius: 4px;
  padding: .15rem .6rem;
  cursor: pointer;
  font-family: monospace;
  font-size: .85rem;
}

<<~&#x0003;>>

<<~&#x0004; -> ? >>
