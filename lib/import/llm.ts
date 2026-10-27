import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";
import type { RecipeDraft, Step } from "../types";
import { deriveTimes, parseServings } from "./heuristics";
import type { RawRecipe } from "./types";

export function getModel(): LanguageModel | null {
  const provider = (process.env.LLM_PROVIDER ?? "groq").toLowerCase();
  const model = process.env.LLM_MODEL;
  switch (provider) {
    case "groq":
      if (!process.env.GROQ_API_KEY) return null;
      return createGroq({ apiKey: process.env.GROQ_API_KEY })(model ?? "openai/gpt-oss-120b");
    case "google":
      if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return null;
      return createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })(model ?? "gemini-2.5-flash");
    case "openrouter":
      if (!process.env.OPENROUTER_API_KEY) return null;
      return createOpenAICompatible({
        name: "openrouter",
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
        supportsStructuredOutputs: true,
      })(model ?? "openai/gpt-oss-20b:free");
    case "ollama":
      return createOpenAICompatible({
        name: "ollama",
        baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
      })(model ?? "qwen3:8b");
    default:
      return null;
  }
}

const TimerKind = z.enum(["bake", "rest", "simmer", "cook"]);

const LlmRecipe = z.object({
  isRecipe: z.boolean().describe("false if the text contains no actual recipe (no ingredients and no steps)"),
  title: z.string(),
  description: z.string().nullable().describe("1-2 sentence summary, same language as the recipe"),
  servings: z.number().nullable(),
  servingsLabel: z.string().nullable().describe('e.g. "Serves 4", "4 Portionen", "1 loaf"'),
  times: z
    .object({
      prep: z.number().nullable(),
      cook: z.number().nullable().describe("active stove-top cooking minutes, excluding baking"),
      bake: z.number().nullable().describe("minutes in the oven"),
      rest: z.number().nullable().describe("passive minutes: resting, chilling, marinating, rising, soaking"),
      total: z.number().nullable(),
    })
    .describe("minutes; null when not stated or derivable from the text"),
  ingredients: z.array(
    z.object({
      raw: z.string().describe("the original ingredient line"),
      qty: z.number().nullable(),
      qtyMax: z.number().nullable().describe("upper bound for ranges like 2-3"),
      unit: z.string().nullable().describe("short unit as written: g, ml, tbsp, tsp, EL, TL, cup, clove …"),
      name: z.string(),
      note: z.string().nullable().describe("preparation notes like 'finely chopped'"),
      group: z.string().nullable().describe("sub-heading such as 'For the salsa'"),
    }),
  ),
  steps: z.array(
    z.object({
      text: z.string().describe("full instruction text of this step"),
      bullets: z.array(z.string()).describe("2-4 very short imperative bullet points summarising the step"),
      timers: z.array(
        z.object({
          label: z.string().describe("2-5 word label, e.g. 'Simmer the sauce'"),
          minutes: z.number(),
          kind: TimerKind,
        }),
      ),
    }),
  ),
  tags: z.array(z.string()).describe("up to 6 lowercase tags like 'vegetarian', 'pasta', 'quick'"),
  language: z.string().nullable().describe("ISO 639-1 code of the recipe text"),
});

const SYSTEM = `You convert recipes into clean structured data for a cooking app.
Rules:
- Keep the recipe's original language for all text. Never translate.
- If structured ingredients/instructions are given, keep every ingredient and every step in order; keep step text verbatim (only fix whitespace).
- If only free text (social media caption, page text) is given, extract the recipe; write clear steps from it. Do not invent ingredients that are not mentioned.
- Parse quantities as numbers (½ = 0.5, "1 1/2" = 1.5). For "2 x 120g tins sardines" use qty 2, unit null, name "tins sardines", note "120g".
- Timers: add one for every explicit duration of 1 minute or more in a step (baking, resting, chilling, marinating, rising, simmering, boiling, cooking). Use the upper bound of ranges. kind: bake = oven; rest = passive waiting; simmer = gentle liquid cooking/boiling; cook = other active cooking.
- Times: use given prep/cook/total times. Split baking and resting out of cooking when the steps make it clear. total = given total, otherwise the sum.
- Bullets: condense each step into 2-4 short imperative bullet points.`;

function describeRaw(raw: RawRecipe, extraText: string | null): string {
  const parts: string[] = [];
  if (raw.title) parts.push(`Title: ${raw.title}`);
  if (raw.author) parts.push(`Author: ${raw.author}`);
  if (raw.yield) parts.push(`Yield: ${raw.yield}`);
  const times = [
    raw.prepTime && `prep ${raw.prepTime} min`,
    raw.cookTime && `cook ${raw.cookTime} min`,
    raw.totalTime && `total ${raw.totalTime} min`,
  ].filter(Boolean);
  if (times.length) parts.push(`Times: ${times.join(", ")}`);
  if (raw.description) parts.push(`Description: ${raw.description}`);
  if (raw.structured) {
    parts.push(
      `Ingredients:\n${raw.ingredients.map((i) => `- ${i.group ? `[${i.group}] ` : ""}${i.text}`).join("\n")}`,
    );
    parts.push(`Instructions:\n${raw.instructions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`);
  } else if (raw.text) {
    parts.push(`Text:\n${raw.text.slice(0, 12_000)}`);
  }
  if (extraText) parts.push(`Additional text from the user:\n${extraText.slice(0, 8_000)}`);
  return parts.join("\n\n");
}

export async function llmDraft(raw: RawRecipe, extraText: string | null): Promise<RecipeDraft | null> {
  const model = getModel();
  if (!model) return null;

  const { output } = await generateText({
    model,
    system: SYSTEM,
    prompt: describeRaw(raw, extraText),
    output: Output.object({ schema: LlmRecipe, name: "recipe" }),
    maxRetries: 1,
    temperature: 0.1,
  });
  if (!output || !output.isRecipe || !output.ingredients.length) return null;

  const steps: Step[] = output.steps.map((s) => ({
    text: s.text.trim(),
    bullets: s.bullets.map((b) => b.trim()).filter(Boolean),
    timers: s.timers
      .filter((t) => t.minutes >= 1)
      .map((t) => ({ label: t.label, seconds: Math.round(t.minutes * 60), kind: t.kind })),
  }));
  const fallbackTimes = deriveTimes(raw, steps);
  const times = {
    prep: output.times.prep ?? fallbackTimes.prep,
    cook: output.times.cook ?? fallbackTimes.cook,
    bake: output.times.bake ?? fallbackTimes.bake,
    rest: output.times.rest ?? fallbackTimes.rest,
    total: raw.totalTime ?? output.times.total ?? fallbackTimes.total,
  };
  const parsedYield = parseServings(raw.yield);

  return {
    // Prefer the source's own metadata over model output.
    title: raw.structured && raw.title ? raw.title : output.title,
    description: raw.description ?? output.description,
    imageUrl: raw.image,
    author: raw.author,
    sourceUrl: raw.url,
    linkedUrl: null,
    sourceType: raw.sourceType,
    servings: parsedYield.servings ?? output.servings,
    servingsLabel: parsedYield.label ?? output.servingsLabel,
    times,
    ingredients: output.ingredients.map((i) => ({
      qty: i.qty,
      qtyMax: i.qtyMax,
      unit: i.unit,
      name: i.name,
      note: i.note,
      raw: i.raw,
      group: i.group,
    })),
    steps,
    tags: [...new Set([...raw.keywords.map((k) => k.toLowerCase()), ...output.tags.map((t) => t.toLowerCase())])].slice(0, 8),
    language: output.language ?? raw.language,
  };
}
