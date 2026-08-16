// authoring-probe — an operator authors a meme; the disk projection reads back schema-correct.
//
// ── THE LEG THE CORPUS CANNOT TEST ──────────────────────────────────────────────────────────────
// `round-trip` reads every carrier in `bags/` and proves each renders back to its own bytes. Every one
// of those was already canonical when it landed, so the check answers "does canon stay canon" and can
// never answer "does a HAND-AUTHORED file become canon". The corpus tests only shapes the corpus holds.
//
// An operator writes prose in an editor and saves `.mem`. A live wiki VM edits a tiddler and the
// projector writes it back. Neither arrives pre-framed, and neither has a witness — so this one authors
// the shapes an operator actually produces and holds the projection to the schema:
//
//   the frame closes        SOH · STX · ETX · EOT, each on the control head, each stating its `code:`
//   the bearing stands      `? -> uri` at the heading, `-> ?` at the release
//   the namespace homes     whatever the iam declares, and nothing when it declares none
//   the projection settles  projecting the projection changes nothing
//   the fields survive      a re-parse recovers what the first parse read
//
// ── WHY EVERY SHAPE BELOW, AND NOT JUST THE CANONICAL ONE ───────────────────────────────────────
// A frameless file is what an operator MOST often writes — the frame is the carrier's business, not the
// author's. A pre-param frame is what every file written before the named-param migration carries, and
// those keep arriving from editors, clipboards and older sessions. Refusing either would make the
// grammar the author's problem; mangling either would corrupt canon quietly. Both must MINT.
import { memeticWikitextDeserializer, expandMemeRefs } from "../packages/lararium-tw5/dist/deserializer.js";
import { CARRIER_TYPE, CARRIER_TYPE_UNSUFFIXED } from "../packages/lararium-mesh/dist/carrier-type.js";

const URI = "lar:///ha.ka.ba/lares/docs/authoring-probe";
const IAM = [
  "```toml iam",
  'uri-path = "ha.ka.ba/lares/docs/authoring-probe"',
  `type     = "${CARRIER_TYPE}"`,
  "```",
].join("\n");
const IAM_NS = IAM.replace("```\n", "").replace("type     =", 'namespace = "⊙"\ntype     =');

const BODY = "! A New Thought\n\nThe operator writes a file and saves it.\n";

// A SLOT'S IAM IS THE SLOT'S. Every iam block that does not open the file heads the ahu tiddler it sits
// in — its own register, its own confidence — and it overrides what the parent declared without
// reaching back up. An author who writes a slot heading has addressed the slot, not the carrier.
const SLOT = [
  "<<~ ahu #inner >>",
  "",
  "```toml iam",
  'register = "Provisional"',
  'confidence = "7"',
  "```",
  "",
  "! Inner",
  "",
  "slot prose.",
  "",
  "<<~/ahu >>",
].join("\n");

/** What an operator, an editor, or a wiki VM actually hands the ingest. */
const AUTHORED = [
  ["bare prose, no frame and no iam", `${BODY}`, ""],
  ["iam only — the author states identity, not framing", `${IAM}\n\n${BODY}`, ""],
  ["iam declaring a namespace, still unframed", `${IAM_NS}\n\n${BODY}`, "⊙"],
  [
    "a frame from before the named params",
    `<<^ ⊙&#x0001; ? -> ${URI} >>\n${IAM_NS}\n<<^ &#x0002; >>\n\n${BODY}\n<<^ &#x0003; >>\n\n<<^ &#x0004; -> ? >>\n`,
    "⊙",
  ],
  [
    "the canonical frame, authored by hand",
    `<<^ code:"&#x0001;" namespace:"⊙" ? -> ${URI} >>\n${IAM_NS}\n<<^ code:"&#x0002;" >>\n\n${BODY}\n<<^ code:"&#x0003;" >>\n\n<<^ code:"&#x0004;" -> ? >>\n`,
    "⊙",
  ],
  [
    // A carrier written before the suffix names the same syntax and always did. It must project, and
    // it must project under the CANONICAL name — the reader stays wide, the writer stays singular.
    "a carrier declaring the type name written before the suffix",
    `${IAM_NS.replace(CARRIER_TYPE, CARRIER_TYPE_UNSUFFIXED)}\n\n${BODY}`,
    "⊙",
  ],
  [
    "an ahu slot carrying its own iam, under an unframed carrier",
    `${IAM_NS}\n\n${BODY}\n${SLOT}\n`,
    "⊙",
    { "#inner": { register: "Provisional", confidence: "7" }, parent: { register: undefined } },
  ],
];

const project = (src) => {
  const records = memeticWikitextDeserializer(src, { title: URI });
  if (!records?.length) return { records: 0, out: null };
  // A carrier's slots project THROUGH the parent, so the reader must answer for every record the parse
  // produced — handing back only the parent renders the slots as empty refs.
  const by = new Map(records.map((r) => [r["title"], r]));
  const out = expandMemeRefs((u) => by.get(u) ?? null, URI);
  return { records: records.length, out, fields: records[0], by };
};

const SCHEMA = [
  ["SOH states its code", (t) => /^<<\^ code:"&#x(?:0001|0011);"/m.test(t)],
  ["SOH states its bearing", (t) => /^<<\^ code:"&#x(?:0001|0011);"[^>\n]*?\? -> \S+ >>/m.test(t)],
  ["STX opens the body", (t) => t.includes('<<^ code:"&#x0002;" >>')],
  ["ETX closes the body", (t) => t.includes('<<^ code:"&#x0003;" >>')],
  ["EOT releases forward", (t) => /^<<\^ code:"&#x(?:0004|0014);"[^>\n]*?-> \? >>/m.test(t)],
  ["no mark rides the speaking head", (t) => !/^<<~[^>\n]*&#x00(?:01|02|03|04|11|14|17);/m.test(t)],
];

const faults = [];
for (const [name, src, wantNs, wantSlots] of AUTHORED) {
  let first;
  try {
    first = project(src);
  } catch (e) {
    faults.push([name, `the ingest REFUSED it: ${e.message}`]);
    continue;
  }
  if (!first.out) {
    faults.push([name, "projected to nothing — the ingest read no carrier"]);
    continue;
  }
  for (const [claim, holds] of SCHEMA) {
    if (!holds(first.out)) faults.push([name, `the projection breaks the schema: ${claim}`]);
  }
  // The namespace has one witness that is not the head: the iam the author wrote.
  const gotNs = /^<<\^ code:"&#x(?:0001|0011);" namespace:"([^"]*)"/m.exec(first.out)?.[1] ?? "";
  if (gotNs !== wantNs) {
    faults.push([name, `the head carries namespace "${gotNs}" where the iam declares "${wantNs}"`]);
  }
  // The slot ruling, checked on the RECORDS rather than the rendered text: a field the author wrote in
  // a slot heading must land on that slot, and must not have climbed to the parent.
  for (const [frag, want] of Object.entries(wantSlots ?? {})) {
    const rec = frag === "parent" ? first.fields : first.by.get(`${URI}${frag}`);
    if (!rec) { faults.push([name, `the parse produced no record for ${frag}`]); continue; }
    for (const [k, v] of Object.entries(want)) {
      if (rec[k] !== v) faults.push([name, `${frag} carries ${k}=${JSON.stringify(rec[k])} where the author wrote ${JSON.stringify(v)}`]);
    }
  }
  // A projection that changes on the second pass never settles, so the ingest loop reads the file as
  // edited forever and a write-back rewrites the operator's source on every scan.
  const second = project(first.out);
  if (second.out !== first.out) faults.push([name, "projecting the projection changed it — the file never settles"]);
  if (second.records !== first.records) {
    faults.push([name, `re-parse recovered ${second.records} record(s) where the first read ${first.records}`]);
  }
}

console.log(`[authoring] ${AUTHORED.length} authored shapes · ${faults.length} that do not project pono`);
if (faults.length === 0) {
  console.log("  every shape an operator writes mints a schema-correct carrier, and settles on the second pass");
  process.exit(0);
}
for (const [name, why] of faults) console.log(`  ${name}\n    ${why}`);
console.log("  Repair the INGEST or the PROJECTION — an authored file is the operator's, and the");
console.log("  grammar is the carrier's business. A shape that arrives unframed must leave framed.");
process.exit(1);
