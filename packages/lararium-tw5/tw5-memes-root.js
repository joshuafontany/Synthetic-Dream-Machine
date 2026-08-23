import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Absolute path to repo bags/lararium/tw5/ — the @lararium/tw5 meme corpus. */
export const tw5MemesRoot = resolve(__dirname, "..", "..", "bags", "@lararium", "tw5");

/** Absolute path to packages/lararium-tw5/plugins/ — vendored TW5 plugin JSON files. */
export const tw5PluginsRoot = resolve(__dirname, "plugins");
