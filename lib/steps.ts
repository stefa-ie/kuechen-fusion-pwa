import { detectStepTimers, splitSentences } from "./duration";
import type { Step } from "./types";

const OPENERS =
  /^(meanwhile|now|then|next|finally|first|after that|in the meantime|inzwischen|nun|jetzt|dann|danach|anschließend|zum schluss|zuerst|in der zwischenzeit),?\s+/i;
/** Leading subordinate clause: "Once it has thickened, turn down the heat" -> "turn down the heat". */
const LEADING_CLAUSE = /^(once|when|as soon as|after|while|sobald|wenn|nachdem|während)\b[^,]{3,90},\s+/i;
/** Trailing detail that is not an action: ", until …", ", reducing the heat if …". */
const TRAILING_DETAIL =
  /,?\s+(until|so that|making sure|reducing|which|if (?:you|it|the)|bis (?:sie|es|er|die|der|das)|sodass|damit|falls|wobei)\b.*$/i;
const ENGLISH_VERBS =
  "add|bring|cook|stir|simmer|bake|season|serve|pour|mix|let|leave|remove|place|cover|transfer|turn|heat|fry|toss|set|drain|whisk|fold|top|sprinkle|reduce|return|spread|roast|blend";
const SPLIT_AND = new RegExp(`,?\\s+(?:and|then|and then)\\s+(?=(?:${ENGLISH_VERBS})\\b)`, "i");

function tidy(b: string): string {
  const t = b
    .trim()
    .replace(/\s*\((?:[^)]{0,60})\)/g, "")
    .replace(/[.;,]+$/, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function heuristicBullets(text: string): string[] {
  const bullets: string[] = [];
  for (const sentence of splitSentences(text)) {
    const s = sentence.replace(OPENERS, "").replace(LEADING_CLAUSE, "");
    for (const part of s.split(SPLIT_AND)) {
      let b = tidy(part.replace(TRAILING_DETAIL, ""));
      // "Cook until lightly golden" must not collapse to just "Cook".
      if (b.split(/\s+/).length < 2) b = tidy(part);
      if (b.length > 2) bullets.push(b);
    }
  }
  return bullets;
}

export function buildStep(text: string): Step {
  const clean = text.replace(/\s+/g, " ").trim();
  return { text: clean, bullets: heuristicBullets(clean), timers: detectStepTimers(clean) };
}
