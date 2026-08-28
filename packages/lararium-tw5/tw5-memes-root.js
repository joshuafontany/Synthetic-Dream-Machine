import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the `lararium` bag's tw5 corpus — the memes this package carries. */
export const tw5MemesRoot = resolve(__dirname, "..", "..", "bags", "lararium", "ha.ka.ba", "lararium", "tw5");

/** Absolute path to packages/lararium-tw5/plugins/ — vendored TW5 plugin JSON files. */
export const tw5PluginsRoot = resolve(__dirname, "plugins");
