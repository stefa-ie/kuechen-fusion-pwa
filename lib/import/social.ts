import * as cheerio from "cheerio";
import { looksLikeIngredientLine } from "../ingredients";
import type { SourceType } from "../types";
import { extractFromHtml } from "./extract";
import { fetchHtml } from "./fetchHtml";
import { emptyRaw, type RawRecipe } from "./types";

const CRAWLER_UA = ["facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"];

export function detectSourceType(url: string): SourceType {
  const host = new URL(url).hostname.replace(/^www\.|^m\./, "");
  if (host.endsWith("instagram.com")) return "instagram";
  if (host.endsWith("tiktok.com")) return "tiktok";
  if (host.endsWith("youtube.com") || host === "youtu.be") return "youtube";
  return "web";
}

function metaContent($: cheerio.CheerioAPI, name: string): string | null {
  return ($(`meta[property="${name}"]`).attr("content") ?? $(`meta[name="${name}"]`).attr("content"))?.trim() || null;
}

/** 'Name auf Instagram: "caption"' / '27K likes, … - user on May 1, 2024: "caption".' */
function parseInstagramMeta(title: string | null, description: string | null) {
  const source = title ?? description ?? "";
  const quoted = source.match(/:\s*[“"]([\s\S]*)[”"]\s*\.?\s*$/);
  const caption = quoted ? quoted[1].trim() : (description ?? "").trim();
  const author =
    title?.match(/^(.*?)\s+(?:auf|on|sur|en|su)\s+Instagram/i)?.[1]?.trim() ??
    description?.match(/-\s*([\w.]+)\s+(?:am|on|le|el)\s/i)?.[1] ??
    null;
  return { caption, author };
}

async function fetchOEmbed(endpoint: string): Promise<Record<string, string> | null> {
  try {
    const res = await fetch(endpoint, { headers: { "User-Agent": CRAWLER_UA[0] }, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, string>;
  } catch {
    return null;
  }
}

export async function fetchSocial(url: string, sourceType: SourceType): Promise<RawRecipe> {
  const raw = emptyRaw(url, sourceType);

  if (sourceType === "tiktok") {
    const o = await fetchOEmbed(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    if (o) {
      raw.text = o.title ?? null;
      raw.author = o.author_name ?? null;
      raw.image = o.thumbnail_url ?? null;
    }
  }

  if (sourceType === "youtube") {
    const o = await fetchOEmbed(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`);
    if (o) {
      raw.title = o.title ?? null;
      raw.author = o.author_name ?? null;
      raw.image = o.thumbnail_url ?? null;
    }
  }

  if (!raw.text) {
    const page = await fetchHtml(url, { userAgents: CRAWLER_UA }).catch(() => null);
    if (page) {
      const $ = cheerio.load(page.html);
      const ogTitle = metaContent($, "og:title");
      const ogDescription = metaContent($, "og:description") ?? metaContent($, "description");
      raw.image ??= metaContent($, "og:image");
      if (sourceType === "instagram") {
        const { caption, author } = parseInstagramMeta(ogTitle, ogDescription);
        raw.text = caption || null;
        raw.author ??= author;
      } else if (sourceType === "youtube") {
        const full = page.html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/)?.[1];
        raw.text = full ? (JSON.parse(`"${full}"`) as string) : ogDescription;
      } else {
        raw.text = ogDescription;
        raw.title ??= ogTitle;
      }
    }
  }

  raw.title ??= captionTitle(raw.text);
  raw.siteName = sourceType.charAt(0).toUpperCase() + sourceType.slice(1);
  return raw;
}

/** First meaningful caption line without hashtags/emojis, e.g. "Creamy Mushroom Sweet Potato Vermicelli". */
export function captionTitle(caption: string | null): string | null {
  if (!caption) return null;
  const first = caption
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#"));
  if (!first) return null;
  let title = first
    .replace(/#[\p{L}\d_]+/gu, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  // "Series name, Ep 1: Dish name" -> "Dish name"
  if (title.includes(":") && title.split(":").pop()!.trim().length > 8) title = title.split(":").pop()!.trim();
  return title.length > 90 ? `${title.slice(0, 87)}…` : title || null;
}

export function captionHasRecipe(caption: string | null): boolean {
  if (!caption) return false;
  if (/\b(zutaten|ingredients?|zubereitung|method|instructions)\b\s*:?/i.test(caption)) return true;
  return caption.split("\n").filter(looksLikeIngredientLine).length >= 3;
}

const SOCIAL_HOSTS = /(instagram|tiktok|youtube|youtu\.be|facebook|linktr\.ee|bit\.ly|pinterest|threads)/i;

export function linkedUrls(caption: string | null): string[] {
  if (!caption) return [];
  const found = new Set<string>();
  for (const m of caption.matchAll(/https?:\/\/[^\s"')]+/gi)) found.add(m[0].replace(/[.,!]+$/, ""));
  for (const m of caption.matchAll(/\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|de|co\.uk|net|org|at|ch|blog|io|kitchen|recipes|food|cooking|fr|it|nl)(?:\/[^\s"')]*)?/gi)) {
    const candidate = m[0].replace(/[.,!]+$/, "");
    if (![...found].some((f) => f.includes(candidate))) found.add(`https://${candidate}`);
  }
  return [...found].filter((u) => !SOCIAL_HOSTS.test(u));
}

function words(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\d\s-]/gu, " ")
    .split(/[\s-]+/)
    .filter((w) => w.length > 2 && !["the", "and", "with", "mit", "und", "der", "die", "das", "recipe", "rezept"].includes(w));
}

function score(candidate: string, query: string[]): number {
  const target = new Set(words(candidate));
  return query.filter((w) => target.has(w)).length;
}

/** Find the recipe on a creator's site: WordPress search API first, then the HTML search page. */
async function searchSite(origin: string, title: string): Promise<string | null> {
  const query = words(title);
  if (!query.length) return null;
  const q = encodeURIComponent(query.join(" "));
  const candidates: { url: string; label: string }[] = [];

  const wp = await fetch(`${origin}/wp-json/wp/v2/search?search=${q}&per_page=10`, { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<{ url: string; title: string }[]>) : []))
    .catch(() => []);
  if (Array.isArray(wp)) for (const item of wp) candidates.push({ url: item.url, label: item.title });

  if (!candidates.length) {
    const page = await fetchHtml(`${origin}/?s=${q}`).catch(() => null);
    if (page) {
      const $ = cheerio.load(page.html);
      const host = new URL(origin).hostname;
      $("a[href]").each((_, a) => {
        const href = $(a).attr("href");
        if (!href) return;
        try {
          const u = new URL(href, origin);
          if (u.hostname === host && u.pathname.length > 2 && !u.search) {
            candidates.push({ url: u.toString(), label: `${$(a).text()} ${u.pathname}` });
          }
        } catch {
          // ignore invalid hrefs
        }
      });
    }
  }

  const ranked = candidates
    .map((c) => ({ ...c, score: score(c.label, query) }))
    .filter((c) => c.score >= Math.min(2, query.length))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.url ?? null;
}

/** Follow a "link in bio" / website mention to the full recipe. */
export async function followLinkedRecipe(raw: RawRecipe): Promise<RawRecipe | null> {
  const urls = linkedUrls(raw.text);
  const title = raw.title ?? captionTitle(raw.text) ?? "";
  for (const link of urls.slice(0, 3)) {
    try {
      const u = new URL(link);
      const target = u.pathname.length > 1 ? link : await searchSite(u.origin, title);
      if (!target) continue;
      const page = await fetchHtml(target);
      const found = extractFromHtml(page.html, page.finalUrl);
      if (found.structured) return found;
    } catch {
      // try next link
    }
  }
  return null;
}

/** Social CDN images expire, so embed them as a data URL to keep the recipe photo. */
export async function inlineImage(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { "User-Agent": CRAWLER_UA[0] }, cache: "no-store" });
    if (!res.ok) return url;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > 600_000) return url;
    return `data:${type};base64,${buffer.toString("base64")}`;
  } catch {
    return url;
  }
}
