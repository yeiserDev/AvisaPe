"use client";

import { motion } from "framer-motion";

export default function LoaderGlobal() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-tinta/10 backdrop-blur-sm"
      aria-hidden
    >
      <div className="vidrio grid size-16 place-items-center rounded-2xl shadow-xl">
        <motion.div
          animate={{ scale: [1, 0.8, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          className="size-4 rounded-full bg-senal"
        />
      </div>
    </motion.div>
  );
}
