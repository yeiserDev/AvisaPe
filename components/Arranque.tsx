"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** Cuánto se sostiene el splash en pantalla. */
const ESPERA = 1400;

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
          exit={{ opacity: 0, scale: 1.08 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          aria-hidden
          role="presentation"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#150a24]"
        >
          {/* Fondo luminoso centrado en la imagen */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#582199] via-[#241042] to-[#11081e] opacity-90" />
          
          {/* Logo animado de Gengar */}
          <motion.img
            src="/avisape.png"
            alt="AvisaPe Logo"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: [0.8, 1.03, 1], opacity: 1, y: [0, -8, 0] }}
            transition={{ 
              scale: { duration: 0.7, ease: [0.34, 1.56, 0.64, 1] },
              opacity: { duration: 0.5 },
              y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }
            }}
            className="w-56 md:w-72 h-auto relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.7)] rounded-[3rem]"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
