// Dibuja los íconos de la app a partir de un SVG. Uso: npm run icons
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "public", "icons");

const FONDO = "#140f26";     /* medianoche lila, igual que el arranque */
const RESPLANDOR = "#6b4bd6";
const TENUE = "#ffffff3d";
const CLARO = "#ffffffe6";
const SENAL = "#c4b2ff";     /* la línea de ahora */

/**
 * La marca: el riel del día con la línea de ahora saliendo hacia lo que falta.
 * A tamaño de ícono se simplifica —un pendiente por lado, trazos más gruesos—
 * porque a 60 píxeles el detalle fino se convierte en suciedad.
 */
function marca({ size, padding = 0, fondo = true }) {
  const c = size / 2;
  const util = size / 2 - padding;
  const alcance = util * 0.66;

  // El riel a la izquierda, la línea de ahora a la derecha: centrado óptico.
  const rx = c - util * 0.2;
  const finLinea = rx + util * 0.86;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="foco" gradientUnits="userSpaceOnUse"
                    cx="${rx}" cy="${c}" r="${util * 1.05}">
      <stop offset="0%" stop-color="${RESPLANDOR}" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="${RESPLANDOR}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ahora" gradientUnits="userSpaceOnUse"
                    x1="${rx}" y1="${c}" x2="${finLinea}" y2="${c}">
      <stop offset="0%" stop-color="${SENAL}"/>
      <stop offset="55%" stop-color="${SENAL}" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="${SENAL}" stop-opacity="0.05"/>
    </linearGradient>
  </defs>

  ${fondo ? `<rect width="${size}" height="${size}" fill="${FONDO}"/>` : ""}
  ${fondo ? `<rect width="${size}" height="${size}" fill="url(#foco)"/>` : ""}

  <line x1="${rx}" y1="${c - alcance}" x2="${rx}" y2="${c + alcance}"
        stroke="${TENUE}" stroke-width="${size * 0.022}" stroke-linecap="round"/>
  <circle cx="${rx}" cy="${c - alcance * 0.62}" r="${size * 0.035}" fill="${TENUE}"/>
  <circle cx="${rx}" cy="${c + alcance * 0.66}" r="${size * 0.042}" fill="${CLARO}"/>

  <line x1="${rx}" y1="${c}" x2="${finLinea}" y2="${c}"
        stroke="url(#ahora)" stroke-width="${size * 0.062}" stroke-linecap="round"/>
  <circle cx="${rx}" cy="${c}" r="${size * 0.175}" fill="${SENAL}" fill-opacity="0.18"/>
  <circle cx="${rx}" cy="${c}" r="${size * 0.105}" fill="${SENAL}"/>
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
