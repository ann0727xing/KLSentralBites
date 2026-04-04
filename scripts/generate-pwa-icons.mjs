/**
 * Rasterizes public/icon.svg to PNG sizes required for installable PWAs.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const pub = join(root, "public");
const iconsDir = join(pub, "icons");
mkdirSync(iconsDir, { recursive: true });

const svgPath = join(pub, "icon.svg");

await sharp(svgPath).resize(192, 192).png().toFile(join(iconsDir, "icon-192.png"));
await sharp(svgPath).resize(180, 180).png().toFile(join(iconsDir, "icon-180.png"));
await sharp(svgPath).resize(512, 512).png().toFile(join(iconsDir, "icon-512.png"));

console.log(
  "Wrote public/icons/icon-180.png, icon-192.png, icon-512.png",
);
