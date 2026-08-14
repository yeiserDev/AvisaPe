"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** Cuánto se sostiene el splash en pantalla. Reducido para que sea rápido y fluido. */
const ESPERA = 1000;

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
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          aria-hidden
          role="presentation"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#150a24]"
        >
          {/* Fondo luminoso pulsante */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#582199] via-[#241042] to-[#11081e] opacity-90" 
          />
          
          {/* Logo animado de Gengar FANTASMA */}
          <motion.img
            src="/avisape.png"
            alt="AvisaPe Logo"
            initial={{ scale: 0.3, opacity: 0, filter: "blur(20px)" }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              filter: "blur(0px)", 
              y: [0, -10, 0] 
            }}
            exit={{ 
              scale: 1.5, 
              opacity: 0, 
              filter: "blur(20px)",
              y: -30 
            }}
            transition={{ 
              scale: { duration: 0.7, type: "spring", bounce: 0.5 },
              opacity: { duration: 0.4 },
              filter: { duration: 0.5, ease: "easeOut" },
              y: { duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }
            }}
            // Usamos drop-shadow lila intenso para que parezca un aura mágica
            className="w-56 md:w-72 h-auto relative z-10 drop-shadow-[0_0px_80px_rgba(107,75,214,0.9)] rounded-[3rem]"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
