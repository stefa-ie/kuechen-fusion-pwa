/**
 * Lists translation keys used in the code that are missing from messages/{de,en}.json.
 * Static keys only; template keys like t(`kind.${k}`) are expanded with their known values below.
 *
 *   pnpm check:messages
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const DYNAMIC: Record<string, string[]> = {
  "kind.${": ["kind.bake", "kind.rest", "kind.simmer", "kind.cook"],
  "categories.${": ["produce", "dairy", "meat", "bakery", "pantry", "spices", "frozen", "drinks", "household", "other"].map((c) => `categories.${c}`),
  "sort.${": [],
  "sortHint.${": [],
  "status.${": ["status.open", "status.done", "status.all"],
  "sources.${": ["sources.all", "sources.web", "sources.social"],
  "stage.${": ["stage.fetching", "stage.reading", "stage.structuring"],
  "method.${": ["method.schema+llm", "method.llm", "method.schema", "method.heuristic"],
  "notif.${": ["notif.granted", "notif.denied", "notif.unsupported", "notif.default"],
  "error.${": ["error.blocked", "error.generic"],
  "${p.id}.": ["kf-circle", "kf-tile", "kf-wordmark", "kf-plate"].flatMap((id) => [`${id}.name`, `${id}.body`]),
};
const SORTS: Record<string, string[]> = {
  filter: ["newest", "az", "quickest", "relevance"],
  grocery: ["manual", "category", "recipe", "az", "newest"],
};

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const used = new Set<string>();
for (const file of [...walk(join(root, "app")), ...walk(join(root, "components")), ...walk(join(root, "lib"))]) {
  const src = readFileSync(file, "utf8");
  const aliases = new Map<string, string>();
  for (const m of src.matchAll(/const (\w+) = useTranslations\("([\w.]+)"\)/g)) aliases.set(m[1], m[2]);
  for (const [alias, ns] of aliases) {
    const re = new RegExp(`\\b${alias}(?:\\.rich)?\\(\\s*(["\`])([^"\`]+)\\1`, "g");
    for (const m of src.matchAll(re)) {
      const key = m[2];
      if (!key.includes("${")) {
        used.add(`${ns}.${key}`);
        continue;
      }
      const prefix = Object.keys(DYNAMIC).find((k) => key.startsWith(k));
      if (prefix === "sort.${" || prefix === "sortHint.${") {
        for (const s of SORTS[ns] ?? []) used.add(`${ns}.${prefix.replace(".${", "")}.${s}`);
      } else if (prefix) for (const k of DYNAMIC[prefix]) used.add(`${ns}.${k}`);
      else console.warn(`? dynamic key in ${file.replace(root, "")}: ${key}`);
    }
  }
}

const has = (obj: unknown, key: string): boolean => {
  let cur = obj as Record<string, unknown> | undefined;
  const parts = key.split(".");
  // Keys like "method.schema+llm" contain no further dots, so walk segment by segment.
  for (const part of parts) {
    if (!cur || typeof cur !== "object" || !(part in cur)) return false;
    cur = cur[part] as Record<string, unknown>;
  }
  return typeof cur === "string";
};

let missing = 0;
for (const locale of ["de", "en"]) {
  const file = join(root, "messages", `${locale}.json`);
  const messages = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const gaps = [...used].filter((k) => !has(messages, k)).sort();
  missing += gaps.length;
  if (gaps.length) console.log(`${locale}: ${gaps.length} missing\n  ${gaps.join("\n  ")}`);
}
console.log(`${used.size} keys used, ${missing} missing`);
process.exit(missing ? 1 : 0);
