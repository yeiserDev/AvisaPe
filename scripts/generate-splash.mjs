// Pantallas de arranque para iOS con Gengar. Uso: npm run splash
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "public", "splash");
const logoPath = join(raiz, "public", "avisape.png");

// Tonos oscuros para encuadrar la imagen de Gengar
// El mismo negro violáceo que el fondo de la app: al terminar el arranque no
// hay salto de color.
const FONDO = "#140a23";
const CENTRO = "#582199";

/** iPhones vigentes: puntos CSS, densidad y píxeles reales. */
const PANTALLAS = [
  { w: 320, h: 568, r: 2 }, // SE 1.ª
  { w: 375, h: 667, r: 2 }, // 8, SE 2.ª y 3.ª
  { w: 414, h: 736, r: 3 }, // 8 Plus
  { w: 375, h: 812, r: 3 }, // X, XS, 11 Pro, 12 mini, 13 mini
  { w: 414, h: 896, r: 2 }, // XR, 11
  { w: 414, h: 896, r: 3 }, // XS Max, 11 Pro Max
  { w: 390, h: 844, r: 3 }, // 12, 13, 14
  { w: 428, h: 926, r: 3 }, // 12 Pro Max, 13 Pro Max, 14 Plus
  { w: 393, h: 852, r: 3 }, // 14 Pro, 15, 15 Pro, 16
  { w: 430, h: 932, r: 3 }, // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  { w: 402, h: 874, r: 3 }, // 16 Pro
  { w: 440, h: 956, r: 3 }, // 16 Pro Max
];

await mkdir(destino, { recursive: true });

let logoBuffer;
try {
  logoBuffer = await readFile(logoPath);
} catch (error) {
  console.error("❌ No se encontró public/avisape.png. Asegúrate de que el archivo exista.");
  process.exit(1);
}

const enlaces = [];

for (const { w, h, r } of PANTALLAS) {
  const ancho = w * r;
  const alto = h * r;
  const archivo = `splash-${ancho}x${alto}.png`;

  // Tamaño del logo según el ancho de la pantalla (45% del ancho)
  const logoSize = Math.round(ancho * 0.45);

  const backgroundSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="${CENTRO}"/>
      <stop offset="100%" stop-color="${FONDO}"/>
    </radialGradient>
  </defs>
  <rect width="${ancho}" height="${alto}" fill="url(#bg)"/>
</svg>`;

  const logoResized = await sharp(logoBuffer)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const png = await sharp(Buffer.from(backgroundSvg))
    .composite([
      { input: logoResized, gravity: "center" }
    ])
    .png()
    .toBuffer();

  await writeFile(join(destino, archivo), png);

  enlaces.push({
    url: `/splash/${archivo}`,
    media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
  });

  console.log(`✓ public/splash/${archivo}`);
}

// El layout importa esta lista para armar los <link rel="apple-touch-startup-image">.
await writeFile(
  join(raiz, "lib", "splash.ts"),
  `// Generado por scripts/generate-splash.mjs. No lo edites a mano.
export const SPLASH_LINKS = ${JSON.stringify(enlaces, null, 2)} as const;
`,
);
console.log("✓ lib/splash.ts");
