"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** Cuánto se sostiene la marca antes de empezar a irse, en milisegundos. */
const ESPERA = 1150;

/**
 * La entrada de la app. Se renderiza también en el servidor, así que cubre la
 * pantalla desde el primer píxel pintado y tapa el salto de la hidratación.
 */
export default function Arranque() {
  const [mostrar, setMostrar] = useState(true);

  useEffect(() => {
    const salir = setTimeout(() => setMostrar(false), ESPERA);
    return () => clearTimeout(salir);
  }, []);

  return (
    <AnimatePresence>
      {mostrar && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.42, ease: "easeIn" }}
          aria-hidden
          role="presentation"
          className="arranque-fondo fixed inset-0 z-[100] flex flex-col items-center justify-center"
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
            <motion.line
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.5, ease: [0.2, 0.8, 0.3, 1] }}
              style={{ originY: "50%" }}
              x1="36"
              y1="16"
              x2="36"
              y2="84"
              stroke="#ffffff"
              strokeOpacity="0.18"
              strokeWidth="1.1"
              strokeLinecap="round"
            />

            {/* Lo que ya pasó */}
            <motion.circle
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.3 }}
              style={{ originX: "50%", originY: "50%" }}
              cx="36" cy="24.2" r="2.1" fill="#ffffff" fillOpacity="0.25"
            />
            <motion.circle
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.37 }}
              style={{ originX: "50%", originY: "50%" }}
              cx="36" cy="37.1" r="2.1" fill="#ffffff" fillOpacity="0.25"
            />

            {/* Lo que viene */}
            <motion.circle
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.44 }}
              style={{ originX: "50%", originY: "50%" }}
              cx="36" cy="64.3" r="2.7" fill="#ffffff" fillOpacity="0.9"
            />
            <motion.circle
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.51 }}
              style={{ originX: "50%", originY: "50%" }}
              cx="36" cy="77.2" r="2.7" fill="#ffffff" fillOpacity="0.9"
            />

            {/* La línea de ahora */}
            <motion.line
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.45, ease: [0.2, 0.8, 0.3, 1], delay: 0.55 }}
              style={{ originX: "0%" }}
              x1="36"
              y1="50"
              x2="66"
              y2="50"
              stroke="url(#linea-ahora)"
              strokeWidth="3.8"
              strokeLinecap="round"
            />
            <motion.circle
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.58 }}
              style={{ originX: "50%", originY: "50%" }}
              cx="36" cy="50" r="10.8" fill="#c4b2ff" fillOpacity="0.16"
            />
            <motion.circle
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.18, 1] }}
              transition={{ duration: 0.45, ease: [0.3, 1.4, 0.5, 1], delay: 0.5 }}
              style={{ originX: "50%", originY: "50%" }}
              cx="36" cy="50" r="6.2" fill="#c4b2ff"
            />
          </svg>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.3, 1], delay: 0.62 }}
            className="mt-6 font-display text-[2.7rem] font-bold leading-none tracking-tight text-white"
          >
            AvisaPe
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.3, 1], delay: 0.74 }}
            className="mt-3.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#c4b2ff]/50"
          >
            Tus pendientes, a tiempo
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
