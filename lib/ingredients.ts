import type { Ingredient } from "./types";
import { canonicalUnit, isUnitToken, parseLeadingQuantity, parseNumber } from "./units";

function cleanup(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^[-•*·▢☐◻️✓✔︎\s]+/u, "")
    .trim();
}

export function parseIngredientLine(line: string, group: string | null = null): Ingredient {
  const raw = cleanup(line);
  let text = raw;
  let qty: number | null = null;
  let qtyMax: number | null = null;
  let unit: string | null = null;

  // "2 x 120g tins" -> keep multiplier as qty, the pack size goes into the note.
  const multi = text.match(/^(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*([a-zA-Zäöü]+)\.?\s+(.*)$/);
  if (multi) {
    qty = parseInt(multi[1], 10);
    const size = `${multi[2]}${multi[3]}`;
    const rest = multi[4];
    const { name, note } = splitNote(rest);
    return { qty, qtyMax: null, unit: null, name, note: note ? `${size}, ${note}` : size, raw, group };
  }

  const parsed = parseLeadingQuantity(text);
  if (parsed.qty != null) {
    qty = parsed.qty;
    qtyMax = parsed.qtyMax;
    text = parsed.rest;
    const unitMatch = text.match(/^([a-zA-Zäöüß]+)\.?(?=\s|$|,)/);
    if (unitMatch && isUnitToken(unitMatch[1])) {
      unit = normaliseUnitLabel(unitMatch[1]);
      text = text.slice(unitMatch[0].length).trim();
    }
    text = text.replace(/^(of|von)\s+/i, "");
  } else {
    const tail = text.match(/[,\s]+(\d+(?:[.,]\d+)?|\d+\/\d+)\s*([a-zA-Zäöü]+)?\.?$/);
    if (tail && (!tail[2] || isUnitToken(tail[2]))) {
      qty = parseNumber(tail[1]);
      unit = tail[2] ? normaliseUnitLabel(tail[2]) : null;
      text = text.slice(0, tail.index).trim();
    }
  }

  const { name, note } = splitNote(text);
  return { qty, qtyMax, unit, name: name || raw, note, raw, group };
}

function splitNote(text: string): { name: string; note: string | null } {
  const paren = text.match(/^(.*?)\s*\(([^)]*)\)\s*(.*)$/);
  let main = text;
  const notes: string[] = [];
  if (paren) {
    main = `${paren[1]} ${paren[3]}`.trim();
    notes.push(paren[2]);
  }
  const comma = main.indexOf(",");
  if (comma > 0) {
    notes.unshift(main.slice(comma + 1).trim());
    main = main.slice(0, comma).trim();
  }
  return { name: main.trim(), note: notes.filter(Boolean).join(", ") || null };
}

function normaliseUnitLabel(token: string): string {
  const canonical = canonicalUnit(token);
  // Keep German abbreviations as written, they read naturally in German recipes.
  if (/^(EL|TL)$/i.test(token)) return token.toUpperCase();
  if (canonical && ["g", "kg", "mg", "ml", "cl", "dl", "l", "tsp", "tbsp", "oz", "lb", "cm"].includes(canonical)) {
    return canonical;
  }
  return token.toLowerCase();
}

export function scaleIngredient(ing: Ingredient, factor: number): Ingredient {
  if (factor === 1 || ing.qty == null) return ing;
  return { ...ing, qty: ing.qty * factor, qtyMax: ing.qtyMax != null ? ing.qtyMax * factor : null };
}

export function looksLikeIngredientLine(line: string): boolean {
  const t = cleanup(line);
  if (!t || t.length > 120) return false;
  if (/^\d/.test(t) || /^[½⅓⅔¼¾⅛]/.test(t)) return true;
  return /\b(salt|pepper|salz|pfeffer|to taste|nach geschmack|optional)\b/i.test(t);
}
