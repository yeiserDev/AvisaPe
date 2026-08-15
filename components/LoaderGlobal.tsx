"use client";

import { motion } from "framer-motion";

/**
 * La espera mientras se guarda.
 *
 * Repite la entrada del arranque —mismo logo, mismo rebote, misma aura, mismo
 * flotar— para que la app tenga un solo gesto de carga en vez de dos lenguajes
 * distintos. Solo cambia la escala: aquí es un momento breve dentro de la app,
 * no la presentación de la marca.
 */
export default function LoaderGlobal() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="fixed inset-0 z-[200] grid place-items-center bg-[#11081e]/70 backdrop-blur-md"
      aria-live="polite"
      aria-busy
    >
      <span className="sr-only">Guardando</span>

      <motion.img
        src="/avisape.png"
        alt=""
        aria-hidden
        initial={{ scale: 0.3, opacity: 0, filter: "blur(20px)" }}
        animate={{
          scale: 1,
          opacity: 1,
          filter: "blur(0px)",
          y: [0, -10, 0],
        }}
        exit={{ scale: 1.5, opacity: 0, filter: "blur(20px)", y: -30 }}
        transition={{
          scale: { duration: 0.7, type: "spring", bounce: 0.5 },
          opacity: { duration: 0.4 },
          filter: { duration: 0.5, ease: "easeOut" },
          y: { duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 },
        }}
        className="h-auto w-28 rounded-[1.6rem] drop-shadow-[0_0_60px_rgba(107,75,214,0.9)]"
      />
    </motion.div>
  );
}
