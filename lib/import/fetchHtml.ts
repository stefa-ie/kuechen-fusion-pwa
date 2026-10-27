const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  // Many shops (e.g. Shopify) rate-limit browsers on server IPs but always serve link-preview crawlers.
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
];

export interface FetchedPage {
  html: string;
  finalUrl: string;
  status: number;
}

export class FetchError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchHtml(
  url: string,
  { userAgents = USER_AGENTS, timeoutMs = 12_000 }: { userAgents?: string[]; timeoutMs?: number } = {},
): Promise<FetchedPage> {
  let lastStatus = 0;
  for (let attempt = 0; attempt < userAgents.length; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": userAgents[attempt],
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
        },
        cache: "no-store",
      });
      lastStatus = res.status;
      if (res.ok) {
        const html = await res.text();
        // Some rate limiters answer 200 with a tiny body.
        if (html.length > 500) return { html, finalUrl: res.url || url, status: res.status };
      }
      if (![403, 429, 503, 200].includes(res.status)) break;
      if (res.status === 429) await sleep(400);
    } catch (error) {
      if (attempt === userAgents.length - 1) {
        throw new FetchError(error instanceof Error ? error.message : "fetch_failed", lastStatus);
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw new FetchError(`HTTP ${lastStatus}`, lastStatus);
}
