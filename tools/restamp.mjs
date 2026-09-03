#!/usr/bin/env node
/**
 * restamp — re-compute a carrier's block check over its own checked span, for NAMED files only.
 *
 * ── WHY IT REFUSES A GLOB ───────────────────────────────────────────────────────────────────────
 * The habit this replaces was a one-liner over `git diff --name-only`: stamp everything that moved.
 * It works right up until something OTHER than the session moves a file — a live daemon's projector,
 * a parallel agent, a watcher — and then the stamp signs a rewrite nobody here authored as correct.
 * Measured: two boot carriers arrived rewritten in a working tree, and a diff-driven re-stamp
 * blessed both before the diff was read. THE OTHER WRITER WAS THE OPERATOR, editing by hand — which
 * is the first hypothesis about any unexplained change to a working tree and the one easiest to skip.
 *
 * A check exists to answer "do these bytes match their hash". Stamping whatever moved converts it
 * into "these bytes are whatever was last written", which answers nothing.
 *
 * So: PATHS ARE NAMED, ONE BY ONE. The friction is the point — naming a file is the moment a hand
 * decides it authored the change.
 *
 * ⚠ AND A DIRTY FILE THIS RUN DID NOT NAME IS REPORTED, NEVER TOUCHED. Not stamped, and not reverted
 * either: `git checkout --` on uncommitted work has no recovery path, and "this looks foreign" is a
 * claim about authorship that a tree cannot answer. Set something aside by COPYING it aside and
 * saying where it went. Reporting costs a sentence; guessing wrong costs somebody their work.
 *
 * Usage:  node tools/restamp.mjs <carrier.mem> [more.mem ...]
 *         node tools/restamp.mjs --check <carrier.mem> ...   (report, write nothing)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { execSync } from "node:child_process";

const argv = process.argv.slice(2);
const checkOnly = argv.includes("--check");
const paths = argv.filter((a) => !a.startsWith("--"));

if (paths.length === 0) {
  console.error("restamp: name the carriers to stamp — this tool takes no glob and reads no diff.");
  console.error("  usage: node tools/restamp.mjs <carrier.mem> [more.mem ...] [--check]");
  process.exitCode = 2;
} else {
  const { bccOf, checkSpan, verifyBcc } =
    await import(pathToFileURL("packages/lararium-tw5/dist/carrier-check.js"));

  // WHAT ELSE MOVED, said out loud. A file this run does not name but the tree shows dirty is exactly
  // the case worth seeing before stamping anything — it is either yours and forgotten, or nobody's.
  let dirty = [];
  try {
    dirty = execSync("git diff --name-only -- 'bags/**/*.mem'", { encoding: "utf8" })
      .split("\n").filter(Boolean);
  } catch { /* not a git tree; the naming rule carries alone */ }
  const unnamed = dirty.filter((d) => !paths.some((p) => p.endsWith(d) || d.endsWith(p)));

  let bad = 0;
  for (const f of paths) {
    const before = readFileSync(f, "utf8");
    const span = checkSpan(before);
    if (!span || span.end <= span.start) {
      console.error(`  ✗ ${f} — no checked span; the frame is torn or absent, and a stamp would cover nothing`);
      bad++; continue;
    }
    const want = bccOf(before);
    const after = before.slice(0, span.end) +
      before.slice(span.end).replace(/^ni:\/\/\/[a-z0-9-]+;[A-Za-z0-9_-]+/, want);
    const moved = after !== before;
    if (!checkOnly && moved) writeFileSync(f, after);
    const verdict = verifyBcc(readFileSync(f, "utf8"));
    console.log(`  ${verdict === "ok" ? "✓" : "✗"} ${f.split("/").pop().padEnd(34)} span ${span.end - span.start} bytes · ${moved ? (checkOnly ? "WOULD restamp" : "restamped") : "already current"} · ${verdict}`);
    if (verdict !== "ok") bad++;
  }

  if (unnamed.length > 0) {
    console.log("\n  ⚠ dirty and NOT named on this run — read each before stamping it:");
    for (const u of unnamed) console.log(`      ${u}`);
  }
  if (bad > 0) process.exitCode = 1;
}
