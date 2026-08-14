// Pantallas de arranque para iOS. Uso: npm run splash
//
// iOS no escala una sola imagen: exige un PNG por resolución exacta, y si no
// encuentra el de tu modelo muestra una pantalla en blanco. Por eso la lista.
//
// El texto se dibuja como vectores con la tipografía real de la app. Depender
// de las fuentes instaladas en la máquina daría un resultado distinto en cada
// computadora, y ninguna tiene Bricolage Grotesque.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import sharp from "sharp";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "public", "splash");

// Medianoche lila: la app es clara, pero el arranque es hondo y luminoso.
const FONDO = "#140f26";
const FONDO_BORDE = "#0b0817";
const BRUMA = "#3b2a73";
const RESPLANDOR = "#6b4bd6";
const SENAL = "#c4b2ff";

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

const fuente = opentype.parse(
  (await readFile(join(raiz, "scripts", "fuentes", "BricolageGrotesque-Bold.ttf"))).buffer,
);

/**
 * Texto a curvas, centrado en `cx`.
 *
 * Se recorre glifo por glifo en vez de usar `font.getPath`: el motor de
 * composición de opentype.js no soporta una de las tablas de esta fuente y
 * revienta. El cmap y el kerning sí se leen bien, que es todo lo que hace
 * falta para una palabra en latín.
 */
function palabra(texto, cx, baseline, tamano, respiro = 0) {
  const escala = tamano / fuente.unitsPerEm;
  const glifos = [...texto].map((ch) => fuente.charToGlyph(ch));

  const avances = glifos.map((g, i) => {
    const kern = i > 0 ? fuente.getKerningValue(glifos[i - 1], g) : 0;
    return { kern: kern * escala, avance: g.advanceWidth * escala };
  });

  const ancho =
    avances.reduce((suma, a) => suma + a.kern + a.avance + respiro, 0) - respiro;

  let x = cx - ancho / 2;
  const partes = [];

  glifos.forEach((g, i) => {
    x += avances[i].kern;
    partes.push(g.getPath(x, baseline, tamano).toPathData(2));
    x += avances[i].avance + respiro;
  });

  return partes.join(" ");
}

/**
 * El arte del arranque: el riel del día suspendido en la oscuridad, con la
 * línea de ahora encendida y su señal expandiéndose. Todo lo demás calla.
 */
function arte(ancho, alto) {
  const u = Math.min(ancho, alto) / 100;
  const cx = ancho / 2;
  const cy = alto * 0.415;

  // El riel se corre a la izquierda y la línea de ahora sale a la derecha,
  // igual que en la app. El conjunto queda centrado ópticamente.
  const rx = cx - u * 7;
  const alcance = u * 17;
  const finLinea = rx + u * 15;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">
  <defs>
    <radialGradient id="bruma" gradientUnits="userSpaceOnUse"
                    cx="${cx}" cy="${cy}" r="${u * 62}">
      <stop offset="0%" stop-color="${BRUMA}"/>
      <stop offset="100%" stop-color="${FONDO}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="foco" gradientUnits="userSpaceOnUse"
                    cx="${rx}" cy="${cy}" r="${u * 30}">
      <stop offset="0%" stop-color="${RESPLANDOR}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${RESPLANDOR}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vineta" gradientUnits="userSpaceOnUse"
                    cx="${cx}" cy="${cy}" r="${Math.max(ancho, alto) * 0.62}">
      <stop offset="45%" stop-color="${FONDO_BORDE}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${FONDO_BORDE}" stop-opacity="0.9"/>
    </radialGradient>
    <!-- En una línea horizontal la caja delimitadora tiene alto cero, así que
         el degradado necesita coordenadas del lienzo, no proporcionales. -->
    <linearGradient id="ahora" gradientUnits="userSpaceOnUse"
                    x1="${rx}" y1="${cy}" x2="${finLinea}" y2="${cy}">
      <stop offset="0%" stop-color="${SENAL}"/>
      <stop offset="55%" stop-color="${SENAL}" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="${SENAL}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${ancho}" height="${alto}" fill="${FONDO}"/>
  <rect width="${ancho}" height="${alto}" fill="url(#bruma)"/>
  <rect width="${ancho}" height="${alto}" fill="url(#foco)"/>
  <rect width="${ancho}" height="${alto}" fill="url(#vineta)"/>

  <!-- El riel del día: arriba lo que pasó, abajo lo que viene -->
  <line x1="${rx}" y1="${cy - alcance}" x2="${rx}" y2="${cy + alcance}"
        stroke="#ffffff" stroke-opacity="0.18" stroke-width="${u * 0.55}" stroke-linecap="round"/>
  <circle cx="${rx}" cy="${cy - alcance * 0.76}" r="${u * 1.05}" fill="#ffffff" fill-opacity="0.25"/>
  <circle cx="${rx}" cy="${cy - alcance * 0.38}" r="${u * 1.05}" fill="#ffffff" fill-opacity="0.25"/>
  <circle cx="${rx}" cy="${cy + alcance * 0.42}" r="${u * 1.35}" fill="#ffffff" fill-opacity="0.9"/>
  <circle cx="${rx}" cy="${cy + alcance * 0.8}" r="${u * 1.35}" fill="#ffffff" fill-opacity="0.9"/>

  <!-- La línea de ahora, encendida y desvaneciéndose hacia lo que falta -->
  <line x1="${rx}" y1="${cy}" x2="${finLinea}" y2="${cy}"
        stroke="url(#ahora)" stroke-width="${u * 1.9}" stroke-linecap="round"/>
  <circle cx="${rx}" cy="${cy}" r="${u * 5.4}" fill="${SENAL}" fill-opacity="0.16"/>
  <circle cx="${rx}" cy="${cy}" r="${u * 3.1}" fill="${SENAL}"/>

  <!-- Marca -->
  <path d="${palabra("AvisaPe", cx, cy + alcance + u * 15, u * 10.5)}" fill="#ffffff"/>
  <path d="${palabra("TUS PENDIENTES, A TIEMPO", cx, cy + alcance + u * 21.5, u * 2.5, u * 0.62)}"
        fill="${SENAL}" fill-opacity="0.5"/>
</svg>`;
}

await mkdir(destino, { recursive: true });

const enlaces = [];

for (const { w, h, r } of PANTALLAS) {
  const ancho = w * r;
  const alto = h * r;
  const archivo = `splash-${ancho}x${alto}.png`;

  const png = await sharp(Buffer.from(arte(ancho, alto))).png().toBuffer();
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
