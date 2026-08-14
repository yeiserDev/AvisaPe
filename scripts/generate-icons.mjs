// Genera los íconos de la app a partir del logo base. Uso: npm run icons
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "public", "icons");
const imagenBase = join(raiz, "public", "avisape.png");

/** El badge de Android va en blanco sobre transparente (barra de estado). */
function badge(size) {
  const c = size / 2;
  const e = size / 96;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <line x1="${c}" y1="${18 * e}" x2="${c}" y2="${78 * e}" stroke="#fff" stroke-width="${6 * e}" stroke-linecap="round"/>
  <line x1="${20 * e}" y1="${c}" x2="${76 * e}" y2="${c}" stroke="#fff" stroke-width="${10 * e}" stroke-linecap="round"/>
</svg>`;
}

const salidas = [
  { archivo: "icon-192.png", size: 192 },
  { archivo: "icon-512.png", size: 512 },
  { archivo: "apple-touch-icon.png", size: 180 },
  { archivo: "maskable-512.png", size: 512, padding: true },
];

await mkdir(destino, { recursive: true });

let baseBuffer;
try {
  baseBuffer = await readFile(imagenBase);
} catch (error) {
  console.error("❌ No se encontró public/avisape.png. Asegúrate de que el archivo exista.");
  process.exit(1);
}

for (const { archivo, size, padding } of salidas) {
  let img = sharp(baseBuffer).resize(size, size, { 
    fit: padding ? "contain" : "cover", 
    background: { r: 0, g: 0, b: 0, alpha: 0 } 
  });
  
  const png = await img.png().toBuffer();
  await writeFile(join(destino, archivo), png);
  console.log(`✓ public/icons/${archivo}`);
}

// Badge de Android (Notificaciones)
const badgePng = await sharp(Buffer.from(badge(96))).png().toBuffer();
await writeFile(join(destino, "badge-96.png"), badgePng);
console.log("✓ public/icons/badge-96.png");

// El favicon del navegador
await writeFile(
  join(raiz, "public", "favicon.ico"),
  await sharp(baseBuffer).resize(64, 64).png().toBuffer(),
);
console.log("✓ public/favicon.ico");
