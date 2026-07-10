/*\
title: lar:///ha.ka.ba/lararium/tw5/lib/smol-toml
type: application/javascript
module-type: library
\*/
/**
 * lib-smol-toml — smol-toml re-export as a TW5 library tiddler.
 *
 * Ships smol-toml as a single `module-type: library` tiddler inside the
 * lares/memetic-wikitext plugin. Other module tiddlers require it via:
 *
 *   const { parse } = require("lar:///ha.ka.ba/lararium/tw5/lib/smol-toml");
 *
 * Vite externalizes the `smol-toml` npm import in every other module build
 * and rewrites it to this require() call, so smol-toml travels once in the
 * plugin rather than once per consuming module.
 */
export * from "smol-toml";
