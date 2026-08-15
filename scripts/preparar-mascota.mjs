// Prepara la mascota de la tarjeta principal. Uso: npm run mascota
//
// Entrada : public/mascota-original.png  (la ilustración tal como la exportaste)
// Salida  : public/mascota.png           (la que usa la app)
//           + el color de su fondo, que la tarjeta necesita para camuflarla.
//
// Nota sobre por qué no se recorta aquí:
// la ilustración trae el fondo horneado y es morado, igual que el personaje.
// Se probó separar por color, inundar desde los bordes y estimar el fondo por
// difusión; ninguna funciona, porque el fondo tiene viñeta —se aclara hacia el
// centro— y detrás del personaje no hay ninguna pista de qué color tendría ahí.
// Eso lo resuelve un modelo de segmentación, no un umbral.
//
// Lo que sí es determinista: difuminar los bordes y decirle a la tarjeta de qué
// color es este fondo, para que pinte lo mismo por debajo. Si el color de abajo
// coincide, el rectángulo deja de existir.
//
// Si consigues una versión con transparencia real, déjala igual como
// mascota-original.png: el alfa que traiga se respeta y el difuminado solo la
// suaviza en los bordes.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const origen = join(raiz, "public", "mascota-original.png");
const destino = join(raiz, "public", "mascota.png");

/** Ancho final. La tarjeta la muestra a ~230 px; esto cubre pantallas 3x. */
const ANCHO = 700;

/** Hasta dónde llega la zona intacta antes de empezar a desvanecer. */
const NUCLEO = "58%";

/** ¿La imagen ya viene recortada? Se mira cuánto hay realmente transparente. */
async function vieneRecortada(archivo) {
  const { data, info } = await sharp(archivo)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let vacios = 0;
  for (let p = 0; p < info.width * info.height; p++) {
    if (data[p * info.channels + 3] === 0) vacios++;
  }
  return vacios / (info.width * info.height) > 0.05;
}

if (await vieneRecortada(origen)) {
  // Con un recorte de verdad no hay nada que camuflar: se recortan los márgenes
  // vacíos para que el personaje llene su caja, y se optimiza. Aplicarle el
  // difuminado aquí sería estropearlo, porque comería el cartel y las orejas.
  const info = await sharp(origen)
    .trim()
    .resize({ width: ANCHO, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(destino);

  console.log(`✓ public/mascota.png — ${info.width}x${info.height}, ya venía recortada`);
  console.log("  La tarjeta no necesita pintar ninguna mancha detrás.");
  process.exit(0);
}

const { data, info } = await sharp(origen)
  .resize({ width: ANCHO, withoutEnlargement: true })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width: W, height: H, channels: C } = info;

const mascara = Buffer.from(
  `<svg width="${W}" height="${H}">
     <defs>
       <radialGradient id="g" cx="55%" cy="50%" r="76%">
         <stop offset="${NUCLEO}" stop-color="#ffffff"/>
         <stop offset="100%" stop-color="#000000"/>
       </radialGradient>
     </defs>
     <rect width="${W}" height="${H}" fill="url(#g)"/>
   </svg>`,
);

const alfa = await sharp(mascara).greyscale().raw().toBuffer();
for (let p = 0; p < W * H; p++) {
  data[p * C + 3] = Math.round((data[p * C + 3] * alfa[p]) / 255);
}

await sharp(data, { raw: { width: W, height: H, channels: C } })
  .png({ compressionLevel: 9 })
  .toFile(destino);

// El color medio del fondo, tomado del marco exterior. Es el valor que la
// tarjeta tiene que pintar detrás para que no se vea el recuadro.
const original = await sharp(origen).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const OW = original.info.width;
const OH = original.info.height;
const OC = original.info.channels;
const suma = [0, 0, 0];
let n = 0;

for (let y = 0; y < OH; y++) {
  for (let x = 0; x < OW; x++) {
    const enMarco = x < 6 || y < 6 || x >= OW - 6 || y >= OH - 6;
    if (!enMarco) continue;
    const i = (y * OW + x) * OC;
    suma[0] += original.data[i];
    suma[1] += original.data[i + 1];
    suma[2] += original.data[i + 2];
    n++;
  }
}

const hex =
  "#" +
  suma
    .map((s) => Math.round(s / n).toString(16).padStart(2, "0"))
    .join("");

console.log(`✓ public/mascota.png — ${W}x${H}`);
console.log(`  Color de fondo de la ilustración: ${hex}`);
console.log("  Debe coincidir con el de la mancha que la tarjeta pinta detrás.");
