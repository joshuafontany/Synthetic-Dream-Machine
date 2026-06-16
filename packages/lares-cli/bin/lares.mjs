#!/usr/bin/env node
// Committed bin shim: exists at install time so pnpm's bin link never
// dangles on a cold clone (the dist target only exists after a build —
// the cold-start wart found on the 2026-06-11 blank-slate rebuild).
try {
  const { runCli } = await import("../dist/src/bin/lares.js");
  runCli();
} catch (err) {
  if (err?.code === "ERR_MODULE_NOT_FOUND") {
    console.error("lares: not built yet — run `pnpm -r build` first.");
    process.exit(1);
  }
  throw err;
}
