// Dibuja los íconos de la app a partir de un SVG. Uso: npm run icons
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "public", "icons");

const FONDO = "#4e4270";  /* lila profundo */
const TENUE = "#ffffff40";
const CLARO = "#ffffffb3";
const SENAL = "#a78bfa";  /* la línea de ahora */

/** La marca es el riel: una vertical de tiempo cruzada por la línea de ahora. */
function marca({ size, padding = 0, fondo = true }) {
  const c = size / 2;
  const escala = size / 512;
  const alcance = (size / 2 - padding) * 0.62;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${fondo ? `<rect width="${size}" height="${size}" fill="${FONDO}"/>` : ""}
  <line x1="${c}" y1="${c - alcance}" x2="${c}" y2="${c + alcance}"
        stroke="${TENUE}" stroke-width="${10 * escala}" stroke-linecap="round"/>
  <circle cx="${c}" cy="${c - alcance * 0.66}" r="${18 * escala}" fill="${TENUE}"/>
  <circle cx="${c}" cy="${c + alcance * 0.72}" r="${18 * escala}" fill="${CLARO}"/>
  <line x1="${c - alcance * 0.95}" y1="${c}" x2="${c + alcance * 0.95}" y2="${c}"
        stroke="${SENAL}" stroke-width="${22 * escala}" stroke-linecap="round"/>
  <circle cx="${c}" cy="${c}" r="${40 * escala}" fill="${SENAL}"/>
</svg>`;
}

/** El badge de Android va en blanco sobre transparente. */
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
  { archivo: "icon-192.png", svg: marca({ size: 192 }) },
  { archivo: "icon-512.png", svg: marca({ size: 512 }) },
  // iOS recorta las esquinas por su cuenta: el arte va a sangre.
  { archivo: "apple-touch-icon.png", svg: marca({ size: 180 }) },
  // Maskable: el arte se queda dentro del 60% central.
  { archivo: "maskable-512.png", svg: marca({ size: 512, padding: 102 }) },
  { archivo: "badge-96.png", svg: badge(96) },
];

await mkdir(destino, { recursive: true });

for (const { archivo, svg } of salidas) {
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  await writeFile(join(destino, archivo), png);
  console.log(`✓ public/icons/${archivo}`);
}

// El favicon del navegador reusa el de 192.
await writeFile(
  join(raiz, "public", "favicon.ico"),
  await sharp(Buffer.from(marca({ size: 64 }))).png().toBuffer(),
);
console.log("✓ public/favicon.ico");
