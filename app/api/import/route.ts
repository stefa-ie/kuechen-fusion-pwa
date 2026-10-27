import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { extractUrl, importRecipe } from "@/lib/import";
import { FetchError } from "@/lib/import/fetchHtml";
import type { ImportResult } from "@/lib/import/types";
import { getServerClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const Body = z.object({
  url: z.string().nullish(),
  text: z.string().max(20_000).nullish(),
  refresh: z.boolean().optional(),
});

const memoryCache = new Map<string, ImportResult>();

function cacheKey(url: string) {
  return createHash("sha256").update(url.replace(/[?#].*$/, "").replace(/\/$/, "")).digest("hex");
}

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const url = extractUrl(parsed.data.url) ?? extractUrl(parsed.data.text);
  const text = parsed.data.text && parsed.data.text.trim() !== url ? parsed.data.text.trim() : null;
  if (!url && !text) return NextResponse.json({ error: "missing_input" }, { status: 400 });

  // Only plain URL imports are cached; user-supplied text changes the result.
  const key = url && !text ? cacheKey(url) : null;
  const supabase = await getServerClient();

  if (key && !parsed.data.refresh) {
    const hit = memoryCache.get(key);
    if (hit) return NextResponse.json({ ...hit, cached: true });
    if (supabase) {
      const { data } = await supabase.from("recipe_imports").select("normalized").eq("url_hash", key).maybeSingle();
      if (data?.normalized) return NextResponse.json({ ...(data.normalized as ImportResult), cached: true });
    }
  }

  try {
    const result = await importRecipe({ url, text });
    if (key && !result.needsText) {
      memoryCache.set(key, result);
      if (supabase) {
        await supabase
          .from("recipe_imports")
          .upsert({ url_hash: key, url, normalized: result, method: result.method })
          .then(() => undefined, () => undefined);
      }
    }
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof FetchError ? error.status : 0;
    return NextResponse.json(
      { error: status === 403 || status === 429 ? "blocked" : "fetch_failed", detail: String(error) },
      { status: 422 },
    );
  }
}
