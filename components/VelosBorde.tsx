"use client";

import { useEffect, useState } from "react";

/**
 * Los velos que difuminan el contenido contra los bordes de la pantalla.
 *
 * El de arriba solo aparece cuando algo ha empezado a pasar por debajo, igual
 * que la barra de navegación de las apps nativas: en reposo la tarjeta
 * principal se ve limpia, sin un velo oscureciéndole la cabecera.
 * El de abajo se queda siempre, porque ahí la lista siempre está cortada por
 * la barra flotante.
 */
export default function VelosBorde() {
  const [rodado, setRodado] = useState(false);

  useEffect(() => {
    const alRodar = () => setRodado(window.scrollY > 8);
    alRodar();
    window.addEventListener("scroll", alRodar, { passive: true });
    return () => window.removeEventListener("scroll", alRodar);
  }, []);

  return (
    <>
      <div
        aria-hidden
        className={`velo velo-arriba ${rodado ? "opacity-100" : "opacity-0"}`}
      />
      <div aria-hidden className="velo velo-abajo" />
    </>
  );
}
