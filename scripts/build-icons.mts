// Generates the logo proposals and PWA icons; glyphs are outlined so the SVGs need no font.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const loadFont = (file: string) => {
  const buf = readFileSync(join(root, "scripts/fonts", file));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};
const maguntia = loadFont("UnifrakturMaguntia-Book.ttf");
const cook = loadFont("UnifrakturCook-Bold.ttf");

const INK = "#121212";
const PAPER = "#ffffff";

function centred(font: opentype.Font, text: string, size: number, cx: number, cy: number): string {
  const box = font.getPath(text, 0, 0, size).getBoundingBox();
  const x = cx - (box.x1 + box.x2) / 2;
  const y = cy - (box.y1 + box.y2) / 2;
  return font.getPath(text, x, y, size).toPathData(2);
}

function onArc(font: opentype.Font, text: string, size: number, cx: number, cy: number, r: number, tracking = 0): string {
  const widths = [...text].map((ch) => font.getAdvanceWidth(ch, size) + tracking);
  const total = widths.reduce((a, b) => a + b, 0) - tracking;
  let angle = -Math.PI / 2 - total / r / 2;
  const parts: string[] = [];
  [...text].forEach((ch, i) => {
    const w = widths[i] - tracking;
    const mid = angle + w / 2 / r;
    const path = font.getPath(ch, -w / 2, 0, size);
    const rot = mid + Math.PI / 2;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const px = cx + r * Math.cos(mid);
    const py = cy + r * Math.sin(mid);
    const map = (x: number, y: number) => [px + x * cos - y * sin, py + x * sin + y * cos];
    for (const c of path.commands) {
      if ("x" in c) [c.x, c.y] = map(c.x, c.y);
      if ("x1" in c) [c.x1, c.y1] = map(c.x1, c.y1);
      if ("x2" in c) [c.x2, c.y2] = map(c.x2, c.y2);
    }
    parts.push(path.toPathData(2));
    angle += widths[i] / r;
  });
  return parts.join("");
}

const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>\n`;

/* ---------- Logo proposals ---------- */

function wordmark(): string {
  const height = 300;
  const margin = 60;
  const gap = 44;
  const mono = maguntia.getPath("KF", 0, 0, 200).getBoundingBox();
  const name = cook.getPath("Küchen Fusion", 0, 0, 120).getBoundingBox();
  const monoW = mono.x2 - mono.x1;
  const nameW = name.x2 - name.x1;
  const ruleX = margin + monoW + gap;
  const nameX = ruleX + 6 + gap;
  const width = Math.ceil(nameX + nameW + margin);
  return svg(
    width,
    height,
    `<rect width="${width}" height="${height}" fill="${PAPER}"/>` +
      `<path fill="${INK}" d="${centred(maguntia, "KF", 200, margin + monoW / 2, 155)}"/>` +
      `<rect x="${ruleX}" y="60" width="6" height="180" fill="${INK}"/>` +
      `<path fill="${INK}" d="${cook.getPath("Küchen Fusion", nameX - name.x1, 192, 120).toPathData(2)}"/>`,
  );
}

const proposals: Record<string, string> = {
  // 1. Solid seal: white Fraktur KF reversed out of a black disc. The primary app icon.
  "kf-circle": svg(
    512,
    512,
    `<circle cx="256" cy="256" r="256" fill="${INK}"/>` +
      `<path fill="${PAPER}" d="${centred(maguntia, "KF", 250, 256, 262)}"/>`,
  ),
  // 2. Bookplate tile: black KF on paper inside a double rule, like an ex-libris stamp.
  "kf-tile": svg(
    512,
    512,
    `<rect width="512" height="512" rx="96" fill="${PAPER}"/>` +
      `<rect x="28" y="28" width="456" height="456" rx="72" fill="none" stroke="${INK}" stroke-width="10"/>` +
      `<rect x="50" y="50" width="412" height="412" rx="54" fill="none" stroke="${INK}" stroke-width="3"/>` +
      `<path fill="${INK}" d="${centred(maguntia, "KF", 230, 256, 262)}"/>`,
  ),
  // 3. Wordmark: the full name in Fraktur, monogram set apart by a rule (header lockup).
  "kf-wordmark": wordmark(),
  // 4. Plate: KF on a dinner plate, the name running around the rim.
  "kf-plate": svg(
    512,
    512,
    `<circle cx="256" cy="256" r="250" fill="${PAPER}" stroke="${INK}" stroke-width="12"/>` +
      `<circle cx="256" cy="256" r="166" fill="none" stroke="${INK}" stroke-width="4"/>` +
      `<path fill="${INK}" d="${onArc(cook, "Küchen Fusion", 54, 256, 256, 186, 3)}"/>` +
      `<path fill="${INK}" d="${centred(maguntia, "KF", 170, 256, 262)}"/>`,
  ),
};

/* ---------- App icons ---------- */

/** Full-bleed square for launchers; `scale` keeps the glyphs inside the maskable safe zone. */
const appIcon = (scale: number) =>
  svg(512, 512, `<rect width="512" height="512" fill="${INK}"/><path fill="${PAPER}" d="${centred(maguntia, "KF", 260 * scale, 256, 262)}"/>`);

/** Android status-bar badge: only the alpha channel is used. */
const badge = svg(96, 96, `<path fill="${PAPER}" d="${centred(maguntia, "KF", 64, 48, 50)}"/>`);

const faviconSvg = svg(
  64,
  64,
  `<rect width="64" height="64" rx="14" fill="${INK}"/><path fill="${PAPER}" d="${centred(maguntia, "KF", 40, 32, 33)}"/>`,
);

function ico(pngs: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

const png = (source: string, size: number) => sharp(Buffer.from(source)).resize(size, size).png().toBuffer();

async function main() {
  const brandingDir = join(root, "public/branding");
  const iconsDir = join(root, "public/icons");
  mkdirSync(brandingDir, { recursive: true });
  mkdirSync(iconsDir, { recursive: true });

  for (const [name, source] of Object.entries(proposals)) {
    writeFileSync(join(brandingDir, `${name}.svg`), source);
    const meta = await sharp(Buffer.from(source)).metadata();
    await sharp(Buffer.from(source), { density: 144 })
      .resize(meta.width! * 2)
      .png()
      .toFile(join(brandingDir, `${name}.png`));
  }

  const full = appIcon(1);
  writeFileSync(join(iconsDir, "icon.svg"), faviconSvg);
  writeFileSync(join(iconsDir, "icon-192.png"), await png(full, 192));
  writeFileSync(join(iconsDir, "icon-512.png"), await png(full, 512));
  writeFileSync(join(iconsDir, "maskable-512.png"), await png(appIcon(0.78), 512));
  writeFileSync(join(iconsDir, "apple-touch-icon.png"), await png(full, 180));
  writeFileSync(join(iconsDir, "badge-96.png"), await png(badge, 96));
  writeFileSync(
    join(root, "public/favicon.ico"),
    ico([
      { size: 16, data: await png(faviconSvg, 16) },
      { size: 32, data: await png(faviconSvg, 32) },
      { size: 48, data: await png(faviconSvg, 48) },
    ]),
  );
  console.log(`Wrote ${Object.keys(proposals).length} logo proposals and the icon set.`);
}

await main();
