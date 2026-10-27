import type { GroceryCategory } from "../types";

const RULES: [GroceryCategory, RegExp][] = [
  [
    "spices",
    /\b(salt|pepper|cumin|paprika|chilli|chili|cinnamon|nutmeg|oregano|thyme dried|curry|turmeric|saffron|vanilla|spice|salz|pfeffer|kreuzkümmel|zimt|muskat|kurkuma|safran|gewürz|aleppo|sumac|za'?atar|cardamom|kardamom|clove|nelke)/i,
  ],
  [
    "produce",
    /\b(onion|garlic|ginger|lemon|lime|orange|apple|banana|berry|berries|tomato|potato|carrot|celery|leek|pepper(?!corn)|courgette|zucchini|aubergine|eggplant|spinach|lettuce|salad|cabbage|kale|herb|coriander|cilantro|parsley|basil|mint|dill|chive|rosemary|thyme|sage|mushroom|avocado|cucumber|corn|pea|bean sprout|fruit|vegetable|zwiebel|knoblauch|ingwer|zitrone|limette|apfel|tomate|kartoffel|möhre|karotte|sellerie|lauch|paprika|spinat|salat|kohl|koriander|petersilie|basilikum|minze|dill|schnittlauch|pilz|champignon|gurke|obst|gemüse|frühlingszwiebel|spring onion|scallion|shallot|schalotte|kürbis|squash|beet|rote bete)/i,
  ],
  [
    "dairy",
    /\b(milk|butter|cream|cheese|yoghurt|yogurt|egg|feta|parmesan|mozzarella|ricotta|labneh|crème|creme|milch|sahne|käse|joghurt|quark|ei\b|eier|schmand|mascarpone|burrata|halloumi)/i,
  ],
  [
    "meat",
    /\b(chicken|beef|pork|lamb|bacon|sausage|mince|turkey|duck|fish|salmon|tuna|cod|shrimp|prawn|sardine|anchov|huhn|hähnchen|rind|schwein|lamm|speck|wurst|hack|pute|ente|fisch|lachs|thunfisch|garnele|sardelle)/i,
  ],
  ["bakery", /\b(bread|bun|roll|tortilla|pita|baguette|brot|brötchen|toast|croissant|naan|wrap)/i],
  ["frozen", /\b(frozen|ice cream|tiefkühl|tk-|gefroren|eis\b)/i],
  ["drinks", /\b(wine|beer|juice|water|soda|coffee|tea|wein|bier|saft|wasser|kaffee|tee)/i],
  [
    "household",
    /\b(paper|foil|soap|detergent|tissue|sponge|bag|batter(y|ies)|papier|folie|seife|spülmittel|schwamm|tüte|müllbeutel|klopapier|zahnpasta)/i,
  ],
  [
    "pantry",
    /\b(flour|sugar|rice|pasta|noodle|vermicelli|oil|vinegar|sauce|stock|broth|tin|can|bean|lentil|chickpea|polenta|oat|honey|syrup|paste|nut|seed|chocolate|cocoa|yeast|baking|mehl|zucker|reis|nudel|öl|essig|soße|sauce|brühe|fond|dose|bohne|linse|kichererbse|hafer|honig|sirup|mark|nuss|samen|schokolade|kakao|hefe|backpulver|sesam|tahini|soy|soja|miso|mustard|senf|ketchup|mayo)/i,
  ],
];

export function categorize(name: string): GroceryCategory {
  for (const [category, re] of RULES) if (re.test(name)) return category;
  return "other";
}

export const CATEGORY_ORDER: GroceryCategory[] = [
  "produce",
  "bakery",
  "dairy",
  "meat",
  "pantry",
  "spices",
  "frozen",
  "drinks",
  "household",
  "other",
];
