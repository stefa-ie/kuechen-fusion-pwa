# Küchen Fusion

A recipe PWA in the style of NYT Cooking. Paste any recipe link – a website or an Instagram/TikTok/YouTube post – and Küchen Fusion pulls out ingredients, times, steps and timers. Recipe folders and the grocery list are shared live within a household, across devices, without sign-up.

- **Import from links**: schema.org data, microdata, page headings, social captions, and the recipe link behind a reel (e.g. the creator's blog). An optional LLM tidies up messy text.
- **Times**: total time split into prep, cook, bake and rest where known.
- **Ingredients** with a servings calculator, checkboxes and "add to grocery list".
- **Preparation** as written or condensed into bullet points; durations in steps become one-tap timers.
- **Timers**: several at once, rotary dial, snooze/repeat, sound, vibration and notifications. Also usable without a recipe.
- **Households**: anonymous profiles, invite codes/links, shared Recipe Box, folders, cooked history and grocery list (realtime).
- **Grocery list**: quick add ("2 Zitronen, Milch"), drag to reorder, sort by own order/aisle/recipe/A–Z/newest, filter by status/recipe/person.
- German (default) and English.

## Run locally

```bash
pnpm install
cp .env.example .env.local   # optional, see below
pnpm dev
```

Open <http://localhost:3000>. With no environment variables set, the app runs in **local mode**: data is stored in the browser (shared between tabs), and imports use structured data and heuristics only.

## Shared data with Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **Authentication → Sign In / Providers**: enable **Anonymous sign-ins**.
3. **SQL Editor**: run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). It creates the tables, row-level security, RPCs, the realtime publication and the `recipe-images` storage bucket.
4. Add to `.env.local`:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

Every device gets an anonymous profile with its own household. Invite others from **Haushalt & Profil** (avatar top left on the home screen) by sharing the link `/join/CODE`.

Anonymous sessions live in the browser: clearing site data loses access to that profile. Members can rejoin a household with its invite code.

## LLM (optional, free)

Imports work without an LLM, but it helps with free-text captions, condensed bullet points and timer detection. The default is [Groq](https://console.groq.com) (free tier, no credit card):

```bash
LLM_PROVIDER=groq
LLM_MODEL=openai/gpt-oss-120b
GROQ_API_KEY=gsk_...
```

`google` (Gemini), `openrouter` and `ollama` are supported as alternatives; see [`.env.example`](.env.example).

## Deploy and install via link

Deploy to [Vercel](https://vercel.com/new) (or any Node host), add the same environment variables, and share the URL. On the phone:

- **iPhone**: open in Safari → Share → *Add to Home Screen*.
- **Android**: Chrome shows *Install app*; after installing, links can be shared straight into Küchen Fusion (share target).

The `/install` page explains this inside the app. HTTPS is required for the service worker, notifications and the share target.

## Logo

Four black-and-white Fraktur "KF" proposals are in [`public/branding`](public/branding) and on the `/branding` page:

| Seal | Bookplate | Plate |
| --- | --- | --- |
| ![Seal](public/branding/kf-circle.png) | ![Bookplate](public/branding/kf-tile.png) | ![Plate](public/branding/kf-plate.png) |

![Wordmark](public/branding/kf-wordmark.png)

`pnpm icons` regenerates the proposals and the app icons from the Unifraktur fonts (SIL Open Font License, in `scripts/fonts`).

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm lint` / `pnpm typecheck` | ESLint, TypeScript |
| `pnpm icons` | Rebuild logos and PWA icons |
| `pnpm test:import <url>` | Try the importer from the command line |

## Project layout

- `app/`: routes (Browse, Search, Recipe Box, grocery list, timers, recipe detail and cooking mode, import, household, settings, install, branding) and `api/import`
- `lib/import/`: fetching, structured-data extraction, social media, heuristics, LLM normalisation
- `lib/data/`: `DataStore` with Supabase and local implementations, React Query hooks
- `lib/timers/`: timer store, alarm sound and notifications
- `messages/`: German and English texts
- `public/sw.js`: service worker (offline shell, image cache, notification clicks)
