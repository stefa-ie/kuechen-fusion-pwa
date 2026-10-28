import type { StepTimer, TimerKind } from "./types";

/** ISO 8601 duration ("PT1H25M", "P0DT0H30M") -> minutes. */
export function parseIsoDuration(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = value
    .trim()
    .match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (!m) {
    const plain = parseFreeDuration(value);
    return plain;
  }
  const [, d, h, min, s] = m;
  const total =
    (d ? parseFloat(d) * 1440 : 0) +
    (h ? parseFloat(h) * 60 : 0) +
    (min ? parseFloat(min) : 0) +
    (s ? parseFloat(s) / 60 : 0);
  return total > 0 ? Math.round(total) : null;
}

const UNIT_PATTERN =
  "(seconds?|secs?|sekunden?|sek\\.?|minutes?|mins?\\.?|minuten?|min\\.?|hours?|hrs?\\.?|stunden?|std\\.?|h)";
const NUM_PATTERN = "(\\d+(?:[.,]\\d+)?|½|an?|one|two|three|four|five|ten|twenty|thirty|eine?r?|zwei|drei|vier|fünf|zehn)";

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  ein: 1,
  eine: 1,
  einer: 1,
  two: 2,
  zwei: 2,
  three: 3,
  drei: 3,
  four: 4,
  vier: 4,
  five: 5,
  fünf: 5,
  ten: 10,
  zehn: 10,
  twenty: 20,
  thirty: 30,
  "½": 0.5,
};

function toNumber(token: string): number {
  const lower = token.toLowerCase();
  if (lower in WORD_NUMBERS) return WORD_NUMBERS[lower];
  return parseFloat(lower.replace(",", "."));
}

function unitToSeconds(unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith("h") || u.startsWith("std") || u.startsWith("stund")) return 3600;
  if (u.startsWith("s")) return 1;
  return 60;
}

export interface FoundDuration {
  seconds: number;
  /** Upper bound when given as a range ("20-25 minutes"). */
  maxSeconds: number | null;
  index: number;
  length: number;
  match: string;
}

const DURATION_RE = new RegExp(
  `\\b${NUM_PATTERN}(?:\\s*(?:-|–|to|bis|or|oder)\\s*${NUM_PATTERN})?\\s*${UNIT_PATTERN}(?![a-zäöü])` +
    `(?:\\s*(?:and|und)\\s*(\\d+)\\s*(minutes?|mins?|minuten?|min\\.?))?`,
  "gi",
);

export function findDurations(text: string): FoundDuration[] {
  const out: FoundDuration[] = [];
  for (const m of text.matchAll(DURATION_RE)) {
    const unitSeconds = unitToSeconds(m[3]);
    // "h" alone is ambiguous in prose; only accept when directly attached to a number.
    if (m[3].toLowerCase() === "h" && !/\d\s?h$/i.test(m[0].replace(/\s*(and|und).*$/i, ""))) continue;
    let seconds = toNumber(m[1]) * unitSeconds;
    let maxSeconds = m[2] ? toNumber(m[2]) * unitSeconds : null;
    if (m[4]) {
      const extra = parseInt(m[4], 10) * 60;
      seconds += extra;
      if (maxSeconds != null) maxSeconds += extra;
    }
    if (!Number.isFinite(seconds) || seconds <= 0) continue;
    out.push({ seconds, maxSeconds, index: m.index ?? 0, length: m[0].length, match: m[0] });
  }
  return out;
}

export function parseFreeDuration(text: string): number | null {
  const found = findDurations(text);
  if (!found.length) return null;
  return Math.round(found.reduce((sum, d) => sum + d.seconds, 0) / 60);
}

const KIND_KEYWORDS: [TimerKind, RegExp][] = [
  ["bake", /\b(bake|baking|oven|roast|backen|backofen|ofen|rösten|gratinieren|grill)/i],
  [
    "rest",
    /\b(rest(?:ed|ing|s)?\b|chill(?:ed|ing|s)?\b|refrigerat|fridge|marinat|prove\b|proof(?:ing)?\b|rise\b|rising|soak|set aside|cool(?:ed|ing|s)?\b|stand\b|ruhen|gehen lassen|kühl|marinier|einweichen|abkühlen|ziehen lassen|quellen)/i,
  ],
  ["simmer", /\b(simmer|boil|poach|braise|stew|reduce|köcheln|kochen|garen|schmoren|sieden|einkochen)/i],
];

export function classifyTimerKind(sentence: string): TimerKind {
  for (const [kind, re] of KIND_KEYWORDS) if (re.test(sentence)) return kind;
  return "cook";
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9„"(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function detectStepTimers(stepText: string): StepTimer[] {
  const timers: StepTimer[] = [];
  for (const sentence of splitSentences(stepText)) {
    for (const d of findDurations(sentence)) {
      const seconds = d.maxSeconds ?? d.seconds;
      if (seconds < 60) continue;
      const kind = classifyTimerKind(sentence);
      timers.push({ label: shortLabel(sentence, d), seconds, kind });
    }
  }
  return timers;
}

function shortLabel(sentence: string, d: FoundDuration): string {
  const withoutDuration = (sentence.slice(0, d.index) + sentence.slice(d.index + d.length))
    .replace(/\s+(for|für|about|ca\.|etwa|another|weitere|noch)(?=\s|,|$)/gi, " ")
    .replace(/\s+/g, " ");
  const clause = withoutDuration
    .split(/[,;:.](?:\s|$)/)[0]
    .replace(/^\s*(meanwhile|then|now|dann|nun|inzwischen)\s+/i, "")
    .trim();
  const words = clause.split(/\s+/).filter(Boolean);
  const label = words.length > 7 ? `${words.slice(0, 6).join(" ")} …` : clause;
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : d.match;
}

export function formatMinutes(minutes: number | null | undefined, locale = "de"): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  const de = locale.startsWith("de");
  const hLabel = de ? "Std." : h === 1 ? "hr" : "hrs";
  const mLabel = "Min.";
  if (h && m) return `${h} ${hLabel} ${m} ${de ? mLabel : "min"}`;
  if (h) return `${h} ${hLabel}`;
  return `${m} ${de ? mLabel : "min"}`;
}

export function formatShort(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
