import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import Arranque from "@/components/Arranque";
import { SPLASH_LINKS } from "@/lib/splash";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AvisaPe",
  description: "Tus pendientes en un riel de tiempo, con aviso en la pantalla de bloqueo.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "AvisaPe",
    // La app es clara: la barra de estado necesita texto oscuro.
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    // iOS exige un PNG por resolución exacta: sin el de tu modelo, muestra
    // una pantalla en blanco al abrir la app. Se generan con `npm run splash`.
    other: SPLASH_LINKS.map((s) => ({
      rel: "apple-touch-startup-image",
      url: s.url,
      media: s.media,
    })),
  },
  formatDetection: { telephone: false, date: false, address: false },
};

export const viewport: Viewport = {
  // Sin atributo `media`: Safari en iOS descarta los theme-color que lo llevan
  // y deja sus barras en el gris oscuro del sistema. La app es clara siempre,
  // así que un único valor es además lo correcto.
  themeColor: "#e6e2f0",
  width: "device-width",
  initialScale: 1,
  // Evita el zoom al enfocar inputs en iOS sin bloquear el zoom manual.
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${bricolage.variable} ${instrument.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-dvh antialiased">
        <Arranque />
        {children}
      </body>
    </html>
  );
}
