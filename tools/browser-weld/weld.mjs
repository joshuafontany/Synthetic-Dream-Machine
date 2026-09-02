/**
 * browser-weld — the founding gate, driven through a REAL browser.
 *
 * ── WHAT THIS EXISTS TO CATCH ───────────────────────────────────────────────────────────────────
 * Every leg of the browser round-trip passes alone. The vessel boots, the crossing syncs a doc both
 * ways, the projection renders, the input leg dispatches, and the disk projector writes carriers. What
 * has never run is the COMPOSITION — and this house has learned five times in one session that two
 * correct halves with nothing welding them is where the defect lives.
 *
 * ── ONE VECTOR, ONE FAILURE ─────────────────────────────────────────────────────────────────────
 * A single "an edit reaches disk" assertion fails ambiguously: it reports that the weld broke and says
 * nothing about WHERE. So each vector isolates exactly one seam and names it. Over-asserting inside a
 * vector would buy a shorter file and cost the diagnosis, which is the whole reason to run it.
 *
 * The vectors also split by PREREQUISITE, and that split does diagnostic work on its own:
 *   W1-W3 need only a browser — the app boots a sovereign island, "no node attached". A red here is
 *         browser-side and cannot be a crossing fault.
 *   W4-W5 need a node vessel — a red here cannot be a DOM fault, because W1-W3 already passed.
 *
 * Nothing here retries or waits on a wall clock beyond a bounded settle: a vector that needs patience
 * says how much and why, so a slow machine reads as slow rather than as broken.
 */
import { chromium } from "playwright";

const APP = process.env.WELD_APP_URL ?? "http://localhost:5173";
const SETTLE_MS = Number(process.env.WELD_SETTLE_MS ?? 15_000);

let failures = 0, gaps = 0;
const ok   = (n, m) => console.log(`  \x1b[32mok\x1b[0m       ${n} — ${m}`);
const bad  = (n, m) => { failures++; console.log(`  \x1b[31mFAILED\x1b[0m   ${n} — ${m}`); };
const gap  = (n, m) => { gaps++;     console.log(`  \x1b[33mgap\x1b[0m      ${n} — ${m}`); };

/** Poll a predicate to a bound. Returns the value or null — never throws, so a vector reports rather than dies. */
async function until(fn, ms = SETTLE_MS, every = 250) {
  const stop = Date.now() + ms;
  for (;;) {
    try { const v = await fn(); if (v) return v; } catch { /* a not-yet-mounted surface is not an error */ }
    if (Date.now() > stop) return null;
    await new Promise((r) => setTimeout(r, every));
  }
}

/** The projected pane lives inside a shadow root; every read of it goes through this one accessor. */
const paneHtml = (page) => page.evaluate(() =>
  document.getElementById("projection")?.shadowRoot?.querySelector(".lar-projection")?.innerHTML ?? "");

const main = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  console.log(`\n\x1b[1mBROWSER WELD — a tiddler edited in a browser, followed to the node's disk\x1b[0m`);
  console.log(`  app: ${APP}\n`);

  // ── W0 · the app answers at all ───────────────────────────────────────────────────────────────
  // Not a seam — a precondition. Separated so "the dev server is down" never reads as "the render leg
  // is broken", which is the misdiagnosis a combined vector would hand us.
  try {
    await page.goto(APP, { waitUntil: "domcontentloaded", timeout: 20_000 });
    ok("W0 app-answers", "the shell loaded");
  } catch (e) {
    bad("W0 app-answers", `no app at ${APP} — ${String(e).slice(0, 90)}`);
    await browser.close();
    return finish();
  }

  // ── W1 · the vessel boots to a live sovereign island ──────────────────────────────────────────
  // The app writes its own verdict into #status / #vessel. Reading ITS words rather than inferring
  // from the DOM keeps this vector honest about what the app itself claims.
  const status = await until(async () => {
    const t = await page.evaluate(() => document.getElementById("vessel")?.textContent ?? "");
    return t.includes("live") ? t : null;
  });
  if (status) ok("W1 vessel-boots", "the island reports live");
  else bad("W1 vessel-boots", `no "live" in #vessel within ${SETTLE_MS}ms — the browser vessel never stood`);

  // ── W2 · the projection RENDERS, and carries render ids ───────────────────────────────────────
  // Two facts, one seam: the frame arrived AND it is addressable. A pane with html but no
  // `data-lar-rid` is a render leg that landed with the return leg unbound, which is a different
  // defect from an empty pane and must not read the same.
  const html = await until(async () => { const h = await paneHtml(page); return h && h.length > 0 ? h : null; });
  if (!html) {
    bad("W2 projection-renders", "the projection shadow root stayed empty — no `projection:frame` applied");
  } else if (!html.includes("data-lar-rid")) {
    bad("W2 projection-renders", "a frame rendered but carries NO data-lar-rid — the return leg has nothing to address");
  } else {
    ok("W2 projection-renders", `${html.length} bytes, rid-stamped`);
  }

  // ── W3 · a CLICK crosses the thread and TW5's own handler fires ───────────────────────────────
  // The proof is that the projection CHANGES: TW5 navigates and re-projects. Asserting only that the
  // click dispatched would pass against a dead worker.
  if (html?.includes("data-lar-rid")) {
    const before = html;
    const clicked = await page.evaluate(() => {
      const pane = document.getElementById("projection")?.shadowRoot?.querySelector(".lar-projection");
      const el = pane?.querySelector("a[data-lar-rid], button[data-lar-rid], [data-lar-rid] a");
      if (!el) return false;
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
      return true;
    });
    if (!clicked) {
      gap("W3 click-crosses", "no clickable rid-stamped node in this projection — the surface offers no target yet");
    } else {
      const after = await until(async () => { const h = await paneHtml(page); return h && h !== before ? h : null; }, 8_000);
      if (after) ok("W3 click-crosses", "TW5 handled the click and re-projected");
      else bad("W3 click-crosses", "the click relayed and the projection never changed — the handler never fired in the worker");
    }
  } else {
    gap("W3 click-crosses", "skipped — W2 gave it nothing to click");
  }

  // ── W4 · a KEYSTROKE reaches the wiki store ───────────────────────────────────────────────────
  // The text leg relays the WHOLE value on `input`, so the assertion is that the wiki now holds it.
  // Reading it back out of the projection proves the round-trip rather than the dispatch.
  const typed = `weld-${Date.now()}`;
  const field = await page.evaluate(() => {
    const pane = document.getElementById("projection")?.shadowRoot?.querySelector(".lar-projection");
    return !!pane?.querySelector("input[data-lar-rid], textarea[data-lar-rid]");
  });
  if (!field) {
    gap("W4 keystroke-lands", "no edit widget in this projection — the surface stands read-only until a tiddler opens for edit");
  } else {
    await page.evaluate((v) => {
      const pane = document.getElementById("projection")?.shadowRoot?.querySelector(".lar-projection");
      const el = pane?.querySelector("input[data-lar-rid], textarea[data-lar-rid]");
      el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    }, typed);
    const seen = await until(async () => (await paneHtml(page)).includes(typed), 8_000);
    if (seen) ok("W4 keystroke-lands", `"${typed}" reached the wiki and came back through a frame`);
    else bad("W4 keystroke-lands", "the value relayed and never re-projected — the input leg did not reach the store");
  }

  // ── W5 · the edit reaches the NODE's disk ─────────────────────────────────────────────────────
  // The founding gate. Declared here and reported as a gap while unwired, so the vector exists and
  // says what it waits on rather than being absent and forgotten.
  gap("W5 reaches-disk", "UNWIRED — wants a node vessel attached and a .mem read; W1-W4 are its precondition");

  if (consoleErrors.length) {
    console.log(`\n  \x1b[33mconsole\x1b[0m  ${consoleErrors.length} browser error(s), first: ${consoleErrors[0].slice(0, 140)}`);
  }
  await browser.close();
  return finish();
};

function finish() {
  console.log(`\n  ── ${failures} failed · ${gaps} gap(s) ──\n`);
  process.exitCode = failures > 0 ? 1 : 0;
}

main().catch((e) => { console.error("weld driver threw:", e); process.exitCode = 1; });
