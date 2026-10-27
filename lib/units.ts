const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 1 / 2,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 1 / 4,
  "¾": 3 / 4,
  "⅕": 1 / 5,
  "⅖": 2 / 5,
  "⅗": 3 / 5,
  "⅘": 4 / 5,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 1 / 8,
  "⅜": 3 / 8,
  "⅝": 5 / 8,
  "⅞": 7 / 8,
};

const FRACTION_CHARS = Object.keys(UNICODE_FRACTIONS).join("");

/** Canonical unit -> aliases (lowercase, without trailing dot). */
const UNIT_ALIASES: Record<string, string[]> = {
  g: ["g", "gr", "gram", "grams", "gramm", "gramme"],
  kg: ["kg", "kilo", "kilos", "kilogram", "kilograms", "kilogramm"],
  mg: ["mg", "milligram", "milligrams"],
  ml: ["ml", "millilitre", "millilitres", "milliliter", "milliliters", "millilitres"],
  cl: ["cl"],
  dl: ["dl"],
  l: ["l", "litre", "litres", "liter", "liters", "ltr"],
  tsp: ["tsp", "teaspoon", "teaspoons", "tl", "teelöffel", "tsps"],
  tbsp: ["tbsp", "tablespoon", "tablespoons", "el", "esslöffel", "tbs", "tbsps", "tbl"],
  cup: ["cup", "cups", "tasse", "tassen"],
  oz: ["oz", "ounce", "ounces", "unze"],
  lb: ["lb", "lbs", "pound", "pounds", "pfund"],
  pinch: ["pinch", "pinches", "prise", "prisen"],
  clove: ["clove", "cloves", "zehe", "zehen"],
  can: ["can", "cans", "tin", "tins", "dose", "dosen"],
  bunch: ["bunch", "bunches", "bund", "bündel"],
  piece: ["piece", "pieces", "stück", "stk", "pc", "pcs"],
  slice: ["slice", "slices", "scheibe", "scheiben"],
  sprig: ["sprig", "sprigs", "zweig", "zweige", "stiel", "stiele"],
  handful: ["handful", "handfuls", "handvoll"],
  pack: ["pack", "packet", "packets", "package", "packung", "packungen", "päckchen", "pck", "pkg"],
  cm: ["cm"],
  stick: ["stick", "sticks", "stange", "stangen"],
  cup_de: ["becher"],
  dash: ["dash", "dashes", "schuss", "spritzer"],
};

const ALIAS_TO_UNIT = new Map<string, string>();
for (const [unit, aliases] of Object.entries(UNIT_ALIASES)) {
  for (const alias of aliases) ALIAS_TO_UNIT.set(alias, unit);
}

export function canonicalUnit(unit: string | null | undefined): string | null {
  if (!unit) return null;
  const key = unit.toLowerCase().replace(/\.$/, "").trim();
  return ALIAS_TO_UNIT.get(key) ?? key;
}

export function isUnitToken(token: string): boolean {
  return ALIAS_TO_UNIT.has(token.toLowerCase().replace(/\.$/, ""));
}

const METRIC = new Set(["g", "kg", "mg", "ml", "cl", "dl", "l"]);

/** Parses "1", "1.5", "1,5", "1/2", "1 1/2", "1½", "½". Returns null if not a number. */
export function parseNumber(input: string): number | null {
  const s = input.trim();
  if (!s) return null;
  const mixedUnicode = s.match(new RegExp(`^(\\d+)?\\s*([${FRACTION_CHARS}])$`));
  if (mixedUnicode) {
    return (mixedUnicode[1] ? parseInt(mixedUnicode[1], 10) : 0) + UNICODE_FRACTIONS[mixedUnicode[2]];
  }
  const mixed = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return parseInt(frac[1], 10) / parseInt(frac[2], 10);
  const dec = s.match(/^\d+(?:[.,]\d+)?$/);
  if (dec) return parseFloat(s.replace(",", "."));
  return null;
}

const NUM = `(?:\\d+\\s+\\d+\\s*\\/\\s*\\d+|\\d+\\s*\\/\\s*\\d+|\\d*\\s*[${FRACTION_CHARS}]|\\d+(?:[.,]\\d+)?)`;
export const QUANTITY_RE = new RegExp(`^\\s*(${NUM})(?:\\s*(?:-|–|to|bis)\\s*(${NUM}))?`, "i");

export interface ParsedQuantity {
  qty: number | null;
  qtyMax: number | null;
  rest: string;
}

export function parseLeadingQuantity(line: string): ParsedQuantity {
  // "2 x 120g tins sardines" -> qty 2, rest "x 120g tins sardines" is handled by caller
  const m = line.match(QUANTITY_RE);
  if (!m) return { qty: null, qtyMax: null, rest: line.trim() };
  return {
    qty: parseNumber(m[1]),
    qtyMax: m[2] ? parseNumber(m[2]) : null,
    rest: line.slice(m[0].length).trim(),
  };
}

const NICE_FRACTIONS: [number, string][] = [
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [3 / 8, "⅜"],
  [1 / 2, "½"],
  [5 / 8, "⅝"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [7 / 8, "⅞"],
];

function formatDecimal(n: number, maxDigits: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: maxDigits }).format(n);
}

function formatFraction(n: number, locale: string): string {
  const whole = Math.floor(n);
  const frac = n - whole;
  if (frac < 0.06) return formatDecimal(whole, 0, locale);
  if (frac > 0.94) return formatDecimal(whole + 1, 0, locale);
  let best = NICE_FRACTIONS[0];
  for (const candidate of NICE_FRACTIONS) {
    if (Math.abs(candidate[0] - frac) < Math.abs(best[0] - frac)) best = candidate;
  }
  if (Math.abs(best[0] - frac) > 0.05) return formatDecimal(n, 1, locale);
  return whole > 0 ? `${whole}${best[1]}` : best[1];
}

export function formatQuantity(n: number | null, unit: string | null, locale = "de"): string {
  if (n == null || !Number.isFinite(n)) return "";
  const canonical = canonicalUnit(unit);
  if (canonical && METRIC.has(canonical)) {
    if (canonical === "kg" || canonical === "l") return formatDecimal(n, 2, locale);
    if (n >= 100) return formatDecimal(Math.round(n / 5) * 5, 0, locale);
    if (n >= 10) return formatDecimal(Math.round(n), 0, locale);
    return formatDecimal(n, 1, locale);
  }
  if (n >= 20) return formatDecimal(Math.round(n), 0, locale);
  return formatFraction(n, locale);
}

export function formatQuantityRange(
  qty: number | null,
  qtyMax: number | null,
  unit: string | null,
  locale = "de",
): string {
  const a = formatQuantity(qty, unit, locale);
  if (qtyMax == null) return a;
  return `${a}–${formatQuantity(qtyMax, unit, locale)}`;
}
