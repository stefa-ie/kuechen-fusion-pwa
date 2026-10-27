/**
 * Runs the importer against real URLs without the UI.
 *   pnpm test:import [url ...]
 */
import { importRecipe } from "../lib/import";

const urls = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "https://ottolenghi.co.uk/pages/recipes/polenta-sardines-coriander-salsa",
      "https://www.instagram.com/reel/C1DTWidJhcO/?hl=de",
    ];

for (const url of urls) {
  console.log(`\n=== ${url}`);
  try {
    const { draft, method, needsText, warnings } = await importRecipe({ url, text: null });
    console.log({ method, needsText, warnings, linkedUrl: draft.linkedUrl });
    console.log(`title: ${draft.title}`);
    console.log(`servings: ${draft.servings} (${draft.servingsLabel})  times: ${JSON.stringify(draft.times)}`);
    console.log(`image: ${draft.imageUrl?.slice(0, 80)}`);
    console.log(`ingredients (${draft.ingredients.length}):`);
    for (const i of draft.ingredients) console.log(`  - [${i.qty ?? ""}${i.qtyMax ? `-${i.qtyMax}` : ""} ${i.unit ?? ""}] ${i.name}${i.note ? ` (${i.note})` : ""}`);
    console.log(`steps (${draft.steps.length}):`);
    draft.steps.forEach((s, n) => {
      console.log(`  ${n + 1}. ${s.text.slice(0, 110)}…`);
      for (const b of s.bullets) console.log(`       • ${b}`);
      for (const t of s.timers) console.log(`       ⏱ ${t.label} – ${t.seconds / 60} min (${t.kind})`);
    });
  } catch (error) {
    console.log("FAILED", error);
  }
}
