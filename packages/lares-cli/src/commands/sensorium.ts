import { acceptPetName, attachPetName, keepSensorium, listPetNames, proposePetName, sensoriumDir, sensoriumNames } from "@lararium/node";
import { renderCommandHelp } from "../command-help.js";
import { emit } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

function rootFor(name: string): string | null {
  return sensoriumNames().includes(name) ? sensoriumDir(name) : null;
}

function keep(args: ParsedArgs): number {
  const id = args.positional[1];
  if (!id) { console.error("usage: lares sensorium keep <id>"); return 2; }
  const result = keepSensorium(id);
  emit(args, { ok: result.existed, data: { mode: "keep", ...result }, human: () => console.log(result.existed ? `lares sensorium keep — ${id} is now retained` : `lares sensorium keep: no live sensorium "${id}"`) });
  return result.existed ? 0 : 3;
}

function name(args: ParsedArgs): number {
  const [sensorium, subject, ...label] = args.positional.slice(1);
  const root = sensorium ? rootFor(sensorium) : null;
  if (!root || !subject || !label.length) { console.error("usage: lares sensorium name <sensorium> <subject> <label...>"); return 2; }
  const entry = attachPetName(root, { subject, label: label.join(" ") });
  emit(args, { ok: true, data: { entry }, human: () => console.log(`lares sensorium name — ${entry.label} ↦ ${entry.subject}`) });
  return 0;
}

function proposeName(args: ParsedArgs): number {
  const [sensorium, subject, ...label] = args.positional.slice(1);
  const root = sensorium ? rootFor(sensorium) : null;
  const projection = typeof args.options["projection"] === "string" ? args.options["projection"] : "";
  const evidence = typeof args.options["evidence"] === "string" ? args.options["evidence"].split(",").filter(Boolean) : [];
  if (!root || !subject || !label.length || !projection) { console.error("usage: lares sensorium propose-name <sensorium> <subject> <label...> --projection <handle> [--evidence ref,ref]"); return 2; }
  const entry = proposePetName(root, { subject, label: label.join(" "), projection, evidence });
  emit(args, { ok: true, data: { entry }, human: () => console.log(`lares sensorium propose-name — ${entry.label} awaits acceptance (${entry.id})`) });
  return 0;
}

function names(args: ParsedArgs): number {
  const root = args.positional[1] ? rootFor(args.positional[1]) : null;
  if (!root) { console.error("usage: lares sensorium names <sensorium>"); return 2; }
  const entries = listPetNames(root);
  emit(args, { ok: true, data: { names: entries }, human: () => entries.length ? entries.forEach((entry) => console.log(`${entry.id}  [${entry.status}]  ${entry.subject}  ${entry.label}`)) : console.log("lares sensorium names — (none)") });
  return 0;
}

function acceptName(args: ParsedArgs): number {
  const [sensorium, id] = args.positional.slice(1);
  const root = sensorium ? rootFor(sensorium) : null;
  if (!root || !id) { console.error("usage: lares sensorium accept-name <sensorium> <proposal-id>"); return 2; }
  const entry = acceptPetName(root, id);
  emit(args, { ok: entry !== null, data: { entry }, human: () => console.log(entry ? `lares sensorium accept-name — ${entry.label}` : `lares sensorium accept-name: no proposal "${id}"`) });
  return entry ? 0 : 3;
}

export async function cmdSensorium(args: ParsedArgs): Promise<number> {
  const sub = args.positional[0];
  if (!sub || sub === "help" || args.flags["help"]) { renderCommandHelp("sensorium"); return sub ? 0 : 1; }
  switch (sub) {
    case "keep": return keep(args);
    case "name": return name(args);
    case "propose-name": return proposeName(args);
    case "names": return names(args);
    case "accept-name": return acceptName(args);
    default: console.error(`lares sensorium: unknown subcommand "${sub}"`); return 2;
  }
}
