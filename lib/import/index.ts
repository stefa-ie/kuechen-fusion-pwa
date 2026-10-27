import { extractFromHtml } from "./extract";
import { fetchHtml } from "./fetchHtml";
import { cleanTitle, heuristicDraft } from "./heuristics";
import { llmDraft } from "./llm";
import { captionHasRecipe, captionTitle, detectSourceType, fetchSocial, followLinkedRecipe, inlineImage } from "./social";
import { emptyRaw, type ImportMethod, type ImportResult, type RawRecipe } from "./types";

export function extractUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = input.match(/https?:\/\/[^\s"'<>]+/i);
  if (!m) return null;
  try {
    return new URL(m[0].replace(/[.,!)]+$/, "")).toString();
  } catch {
    return null;
  }
}

export async function importRecipe({ url, text }: { url: string | null; text: string | null }): Promise<ImportResult> {
  const warnings: string[] = [];
  let raw: RawRecipe;
  let linkedUrl: string | null = null;
  let caption: string | null = null;
  let needsText = false;

  if (!url) {
    raw = emptyRaw(null, "manual");
    raw.text = text;
    raw.title = captionTitle(text);
  } else {
    const sourceType = detectSourceType(url);
    if (sourceType === "web") {
      const page = await fetchHtml(url);
      raw = extractFromHtml(page.html, page.finalUrl);
      raw.url = url;
    } else {
      const social = await fetchSocial(url, sourceType);
      caption = social.text;
      raw = social;
      if (!captionHasRecipe(social.text) && !text) {
        const linked = await followLinkedRecipe(social);
        if (linked) {
          linkedUrl = linked.url;
          raw = {
            ...linked,
            url,
            sourceType,
            image: linked.image ?? social.image,
            author: social.author ?? linked.author,
            description: linked.description ?? social.text,
          };
          warnings.push("followed_link");
        } else {
          needsText = true;
        }
      }
      if (raw.sourceType !== "web" && raw.image && !linkedUrl) raw.image = await inlineImage(raw.image);
    }
  }

  let method: ImportMethod = raw.structured ? "schema" : "heuristic";
  let draft = null;
  const hasContent = raw.structured || Boolean(raw.text) || Boolean(text);
  if (hasContent && !needsText) {
    try {
      draft = await llmDraft(raw, url ? text : null);
      if (draft) method = raw.structured ? "schema+llm" : "llm";
    } catch (error) {
      warnings.push(`llm_failed: ${error instanceof Error ? error.message.slice(0, 160) : "unknown"}`);
    }
  }
  if (!draft) {
    if (text && url && !raw.structured) raw.text = [raw.text, text].filter(Boolean).join("\n\n");
    draft = heuristicDraft(raw);
    if (!raw.structured && !draft.ingredients.length && raw.sourceType !== "web") needsText = true;
  }

  draft.linkedUrl = linkedUrl;
  draft.title = cleanTitle(draft.title, raw.siteName);
  return { draft, method, needsText, caption, warnings };
}
