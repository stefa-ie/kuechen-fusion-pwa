import * as cheerio from "cheerio";
import { parseFreeDuration, parseIsoDuration } from "../duration";
import { emptyRaw, type RawRecipe } from "./types";

type Json = Record<string, unknown>;

const decode = (s: string) => cheerio.load(`<p>${s}</p>`).text();

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function isRecipe(node: unknown): node is Json {
  if (!node || typeof node !== "object") return false;
  const type = (node as Json)["@type"];
  return asArray(type as string | string[]).some((t) => typeof t === "string" && t.toLowerCase() === "recipe");
}

function findRecipe(node: unknown, depth = 0): Json | null {
  if (!node || depth > 6) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipe(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== "object") return null;
  if (isRecipe(node)) return node as Json;
  const obj = node as Json;
  for (const key of ["@graph", "mainEntity", "mainEntityOfPage", "itemListElement", "item"]) {
    const found = findRecipe(obj[key], depth + 1);
    if (found) return found;
  }
  return null;
}

function text(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return decode(v).replace(/\s+/g, " ").trim() || null;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === "object") return text((v as Json).name ?? (v as Json).text ?? (v as Json)["@value"]);
  return null;
}

function imageUrl(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    // Prefer the largest when sizes are given, otherwise the first.
    return imageUrl(v[v.length > 1 && typeof v[v.length - 1] === "string" ? v.length - 1 : 0]);
  }
  if (typeof v === "object") return imageUrl((v as Json).url ?? (v as Json).contentUrl ?? (v as Json)["@id"]);
  return null;
}

function flattenInstructions(v: unknown, out: string[] = []): string[] {
  for (const item of asArray(v)) {
    if (typeof item === "string") {
      const cleaned = decode(item).trim();
      // Single blob with line breaks or numbered steps
      const parts = cleaned.split(/\n+|(?=\b\d+\.\s+[A-ZÄÖÜ])/).map((s) => s.replace(/^\d+[.)]\s*/, "").trim());
      out.push(...parts.filter(Boolean));
    } else if (item && typeof item === "object") {
      const obj = item as Json;
      const type = asArray(obj["@type"] as string | string[]).join(",");
      if (/HowToSection/i.test(type)) {
        flattenInstructions(obj.itemListElement, out);
      } else {
        const t = text(obj.text) ?? text(obj.name);
        if (t) out.push(t);
      }
    }
  }
  return out;
}

function parseJsonLd($: cheerio.CheerioAPI): Json | null {
  let recipe: Json | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (recipe) return;
    const raw = $(el).contents().text().trim();
    if (!raw) return;
    try {
      recipe = findRecipe(JSON.parse(raw));
    } catch {
      try {
        // Some sites ship control characters or trailing commas.
        recipe = findRecipe(JSON.parse(raw.replace(/[\u0000-\u001f]+/g, " ").replace(/,\s*([}\]])/g, "$1")));
      } catch {
        // ignore malformed blocks
      }
    }
  });
  return recipe;
}

function meta($: cheerio.CheerioAPI, ...names: string[]): string | null {
  for (const name of names) {
    const v =
      $(`meta[property="${name}"]`).attr("content") ??
      $(`meta[name="${name}"]`).attr("content") ??
      $(`meta[itemprop="${name}"]`).attr("content");
    if (v?.trim()) return v.trim();
  }
  return null;
}

function absolute(url: string | null, base: string): string | null {
  if (!url) return null;
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

function fromMicrodata($: cheerio.CheerioAPI, raw: RawRecipe) {
  const ingredients = $('[itemprop="recipeIngredient"], [itemprop="ingredients"]')
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean);
  const instructions = $('[itemprop="recipeInstructions"]')
    .map((_, el) => {
      const items = $(el).find("li, p");
      return items.length
        ? items.map((__, li) => $(li).text().replace(/\s+/g, " ").trim()).get()
        : [$(el).text().replace(/\s+/g, " ").trim()];
    })
    .get()
    .flat()
    .filter(Boolean);
  if (ingredients.length && instructions.length) {
    raw.ingredients = ingredients.map((t) => ({ text: t, group: null }));
    raw.instructions = instructions;
    raw.structured = true;
  }
}

const INGREDIENT_HEADINGS = /^(ingredients?|zutaten|you will need|what you need|für \d+ (personen|portionen))\b/i;
const METHOD_HEADINGS =
  /^((cooking|the) )?(method|instructions?|directions?|preparation|zubereitung|anleitung|so geht'?s|steps)\b/i;
const STOP_HEADINGS =
  /^(notes?|recipe notes|nutrition|tips?|comments?|leave a (reply|comment)|related|you may also like|share this|more recipes|rezept-?tipps?|hinweise?|nährwerte|kommentare|das könnte dir auch)\b/i;
const BLOCK_TAGS = "p,div,li,tr,h1,h2,h3,h4,h5,h6,section,article,ul,ol,table,dt,dd,figcaption,header,footer,blockquote";

/** Page content as one line per block element, in document order. */
function blockLines($: cheerio.CheerioAPI): string[] {
  const $c = cheerio.load($.html());
  $c("script,style,noscript,svg,nav,form,iframe,button,select").remove();
  $c("br").replaceWith("\n");
  $c(BLOCK_TAGS).each((_, el) => {
    $c(el).prepend("\n").append("\n");
  });
  $c("td,th").each((_, el) => {
    $c(el).append(" ");
  });
  return $c("body")
    .text()
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const isHeading = (line: string, re: RegExp) => line.length < 40 && re.test(line.replace(/[*:#]/g, "").trim());
const isCounter = (line: string) => /^(\d{1,2}|step \d+|schritt \d+)\.?$/i.test(line);
const GROUP_LINE = /^\*?\s*((for|für) (the |den |die |das )?)?[^\d*]{2,30}\s*\*?:?$/i;

/** Finds "Ingredients" / "Method" headings in page text and collects the lines that follow. */
function fromHeadings($: cheerio.CheerioAPI, raw: RawRecipe) {
  const lines = blockLines($);
  for (let start = 0; start < lines.length; start++) {
    if (!isHeading(lines[start], INGREDIENT_HEADINGS)) continue;

    const ingredients: { text: string; group: string | null }[] = [];
    let group: string | null = null;
    let i = start + 1;
    for (; i < lines.length && ingredients.length < 80; i++) {
      const line = lines[i];
      if (isHeading(line, METHOD_HEADINGS) || isHeading(line, STOP_HEADINGS)) break;
      if (isCounter(line)) continue;
      if (GROUP_LINE.test(line) && (line.includes("*") || line.endsWith(":") || /^(for|für)\b/i.test(line))) {
        group = line.replace(/[*:]/g, "").trim();
        continue;
      }
      if (line.length < 160) ingredients.push({ text: line, group });
    }
    if (ingredients.length < 2 || i >= lines.length || !isHeading(lines[i], METHOD_HEADINGS)) continue;

    const steps: string[] = [];
    for (let j = i + 1; j < lines.length && steps.length < 40; j++) {
      const line = lines[j];
      if (isHeading(line, STOP_HEADINGS) || isHeading(line, INGREDIENT_HEADINGS)) break;
      if (isCounter(line) || line.length < 16) {
        if (steps.length && !isCounter(line) && line.length < 40 && !/[.!]$/.test(line)) break;
        continue;
      }
      if (steps[steps.length - 1] !== line) steps.push(line);
    }
    if (steps.length) {
      raw.ingredients = ingredients;
      raw.instructions = steps;
      raw.structured = true;
      return;
    }
  }
}

/** Reads "Serves 4", "Prep 5 min", "Kochzeit: 25 Minuten" style labels from the page text. */
function scanMetaLines(lines: string[], raw: RawRecipe) {
  const pairs = lines.slice(0, 600).flatMap((l, i) => [l, `${l} ${lines[i + 1] ?? ""}`]);
  const minutesOf = (s: string) => parseFreeDuration(s);
  for (const line of pairs) {
    if (line.length > 60) continue;
    if (!raw.yield) {
      const y = line.match(/^(serves|servings|yield|makes|portionen|personen|für)\s*:?\s*(\d+(?:\s*[-–]\s*\d+)?)/i);
      if (y) raw.yield = `${y[1]} ${y[2]}`;
    }
    if (raw.prepTime == null && /^(prep(aration)?( time)?|vorbereitung(szeit)?|arbeitszeit)\b/i.test(line)) {
      raw.prepTime = minutesOf(line);
    }
    if (raw.cookTime == null && /^(cook(ing)?( time)?|kochzeit|garzeit)\b/i.test(line)) {
      raw.cookTime = minutesOf(line);
    }
    if (raw.totalTime == null && /^(total( time)?|gesamtzeit|gesamt)\b/i.test(line)) {
      raw.totalTime = minutesOf(line);
    }
  }
}

function pageText($: cheerio.CheerioAPI): string {
  return blockLines($).join("\n").slice(0, 14_000);
}

export function extractFromHtml(html: string, url: string): RawRecipe {
  const $ = cheerio.load(html);
  const raw = emptyRaw(url, "web");
  raw.language = $("html").attr("lang")?.slice(0, 2) ?? null;
  raw.siteName = meta($, "og:site_name") ?? new URL(url).hostname.replace(/^www\./, "");

  const ld = parseJsonLd($);
  if (ld) {
    raw.title = text(ld.name);
    raw.description = text(ld.description);
    raw.image = absolute(imageUrl(ld.image), url);
    raw.author = text(ld.author);
    raw.yield = text(asArray(ld.recipeYield as unknown).find((y) => /\d/.test(String(y))) ?? ld.recipeYield);
    raw.prepTime = parseIsoDuration(ld.prepTime);
    raw.cookTime = parseIsoDuration(ld.cookTime);
    raw.totalTime = parseIsoDuration(ld.totalTime);
    raw.ingredients = asArray(ld.recipeIngredient ?? ld.ingredients)
      .map((i) => text(i))
      .filter((i): i is string => Boolean(i))
      .map((t) => ({ text: t, group: null }));
    raw.instructions = flattenInstructions(ld.recipeInstructions);
    raw.keywords = [
      ...asArray(ld.keywords as string | string[]).flatMap((k) => String(k).split(",")),
      ...asArray(ld.recipeCategory as string | string[]),
      ...asArray(ld.recipeCuisine as string | string[]),
    ]
      .map((k) => k.trim())
      .filter((k) => k && k.length < 30);
    raw.language = text(ld.inLanguage)?.slice(0, 2) ?? raw.language;
    raw.structured = raw.ingredients.length > 0 && raw.instructions.length > 0;
  }

  raw.title ??= meta($, "og:title", "twitter:title") ?? ($("title").text().trim() || null);
  raw.description ??= meta($, "og:description", "description", "twitter:description");
  raw.image ??= absolute(meta($, "og:image", "og:image:url", "twitter:image"), url);
  raw.author ??= meta($, "author", "article:author");

  if (!raw.yield || (raw.prepTime == null && raw.cookTime == null && raw.totalTime == null)) {
    scanMetaLines(blockLines($), raw);
  }

  if (!raw.structured) fromMicrodata($, raw);
  if (!raw.structured) fromHeadings($, raw);
  if (!raw.structured) raw.text = pageText($);
  return raw;
}
