"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Plus, SlidersHorizontal } from "lucide-react";

/** Atajos de hora que cubren casi todo lo que uno anota al vuelo. */
function atajos(): { label: string; fecha: () => Date }[] {
  return [
    {
      label: "En 30 min",
      fecha: () => new Date(Date.now() + 30 * 60_000),
    },
    {
      label: "Hoy 6 p.m.",
      fecha: () => {
        const d = new Date();
        d.setHours(18, 0, 0, 0);
        // Si ya pasaron las 6, se entiende que es la de mañana.
        if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
        return d;
      },
    },
    {
      label: "Mañana 9 a.m.",
      fecha: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return d;
      },
    },
  ];
}

type Props = {
  onCrearRapido: (titulo: string, cuando: Date) => Promise<void>;
  onDetalles: (titulo: string) => void;
};

export default function Composer({ onCrearRapido, onDetalles }: Props) {
  const [titulo, setTitulo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [enfocado, setEnfocado] = useState(false);
  const [minimo, setMinimo] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  const hayTexto = titulo.trim().length > 0;
  // Se encoge al bajar por la lista y vuelve al subir, como la barra flotante
  // del sistema. Nunca mientras escribes: sería quitarte el control de la mano.
  const encogido = minimo && !hayTexto && !enfocado;

  useEffect(() => {
    let anterior = window.scrollY;

    const alRodar = () => {
      const actual = window.scrollY;
      if (actual > anterior + 6 && actual > 140) setMinimo(true);
      else if (actual < anterior - 6) setMinimo(false);
      anterior = actual;
    };

    window.addEventListener("scroll", alRodar, { passive: true });
    return () => window.removeEventListener("scroll", alRodar);
  }, []);

  async function crear(cuando: Date) {
    if (!hayTexto || ocupado) return;
    setOcupado(true);
    try {
      await onCrearRapido(titulo.trim(), cuando);
      setTitulo("");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pt-10">
      <div className="pointer-events-auto mx-auto max-w-2xl">
        {hayTexto && (
          <div className="entrada sin-barra mb-2.5 flex justify-center gap-2 overflow-x-auto">
            {atajos().map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => crear(a.fecha())}
                disabled={ocupado}
                className="vidrio vidrio-toque shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold text-tinta disabled:opacity-50"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (encogido) {
              setMinimo(false);
              campo.current?.focus();
              return;
            }
            onDetalles(titulo.trim());
            setTitulo("");
          }}
          className={`vidrio-oscuro ml-auto flex items-center gap-2 overflow-hidden rounded-full p-1.5 transition-[max-width,padding] duration-300 ease-[cubic-bezier(0.2,0.8,0.3,1)] ${
            encogido ? "max-w-[3.75rem] pl-1.5" : "max-w-full pl-5"
          }`}
        >
          <input
            ref={campo}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onFocus={() => setEnfocado(true)}
            onBlur={() => setEnfocado(false)}
            placeholder="¿Qué no se te puede pasar?"
            aria-label="Nuevo pendiente"
            tabIndex={encogido ? -1 : 0}
            className={`min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-white placeholder:text-white/45 focus:outline-none ${
              encogido ? "pointer-events-none opacity-0" : "opacity-100"
            } transition-opacity duration-200`}
          />
          <button
            type="submit"
            aria-label={
              encogido
                ? "Agregar pendiente"
                : hayTexto
                  ? "Elegir día, hora y avisos"
                  : "Agregar pendiente"
            }
            className="vidrio-toque grid size-11 shrink-0 place-items-center rounded-full bg-senal text-white shadow-[0_6px_18px_-6px_rgba(107,75,214,0.9)]"
          >
            {encogido ? (
              <Plus className="size-5" strokeWidth={2.5} />
            ) : hayTexto ? (
              <SlidersHorizontal className="size-[18px]" />
            ) : (
              <ArrowUp className="size-5" strokeWidth={2.5} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
