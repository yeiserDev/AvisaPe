"use client";

import { useEffect, useState } from "react";

/** Cuánto se sostiene la marca antes de empezar a irse, en milisegundos. */
const ESPERA = 1150;
const DESVANECIDO = 460;

/**
 * La entrada de la app. Se renderiza también en el servidor, así que cubre la
 * pantalla desde el primer píxel pintado y tapa el salto de la hidratación.
 * Repite el fondo y la composición de la imagen de arranque de iOS: al pasar
 * de una a otra no hay corte visible.
 */
export default function Arranque() {
  const [saliendo, setSaliendo] = useState(false);
  const [fuera, setFuera] = useState(false);

  useEffect(() => {
    const salir = setTimeout(() => setSaliendo(true), ESPERA);
    const quitar = setTimeout(() => setFuera(true), ESPERA + DESVANECIDO);
    return () => {
      clearTimeout(salir);
      clearTimeout(quitar);
    };
  }, []);

  if (fuera) return null;

  return (
    <div
      aria-hidden
      role="presentation"
      className={`arranque-fondo fixed inset-0 z-[100] flex flex-col items-center justify-center ${
        saliendo ? "arranque-sale" : ""
      }`}
    >
      <svg viewBox="0 0 100 100" className="w-[150px]" fill="none" aria-hidden>
        <defs>
          <linearGradient
            id="linea-ahora"
            gradientUnits="userSpaceOnUse"
            x1="36"
            y1="50"
            x2="66"
            y2="50"
          >
            <stop offset="0%" stopColor="#c4b2ff" />
            <stop offset="55%" stopColor="#c4b2ff" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#c4b2ff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* El riel del día */}
        <line
          x1="36"
          y1="16"
          x2="36"
          y2="84"
          stroke="#ffffff"
          strokeOpacity="0.18"
          strokeWidth="1.1"
          strokeLinecap="round"
          className="arranque-riel"
        />

        {/* Lo que ya pasó */}
        <circle cx="36" cy="24.2" r="2.1" fill="#ffffff" fillOpacity="0.25" className="arranque-punto-1" />
        <circle cx="36" cy="37.1" r="2.1" fill="#ffffff" fillOpacity="0.25" className="arranque-punto-2" />

        {/* Lo que viene */}
        <circle cx="36" cy="64.3" r="2.7" fill="#ffffff" fillOpacity="0.9" className="arranque-punto-3" />
        <circle cx="36" cy="77.2" r="2.7" fill="#ffffff" fillOpacity="0.9" className="arranque-punto-4" />

        {/* La línea de ahora */}
        <line
          x1="36"
          y1="50"
          x2="66"
          y2="50"
          stroke="url(#linea-ahora)"
          strokeWidth="3.8"
          strokeLinecap="round"
          className="arranque-ahora"
        />
        <circle cx="36" cy="50" r="10.8" fill="#c4b2ff" fillOpacity="0.16" className="arranque-halo" />
        <circle cx="36" cy="50" r="6.2" fill="#c4b2ff" className="arranque-marcador" />
      </svg>

      <p className="arranque-nombre mt-6 font-display text-[2.7rem] font-bold leading-none tracking-tight text-white">
        AvisaPe
      </p>
      <p className="arranque-lema mt-3.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#c4b2ff]/50">
        Tus pendientes, a tiempo
      </p>
    </div>
  );
}
