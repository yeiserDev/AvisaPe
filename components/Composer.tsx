"use client";

import { useState } from "react";
import { ArrowUp, SlidersHorizontal } from "lucide-react";

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

  const hayTexto = titulo.trim().length > 0;

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
      {/* Difuminado para que el contenido no choque con la barra */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-lienzo via-lienzo/85 to-transparent"
      />

      <div className="pointer-events-auto mx-auto max-w-2xl">
        {hayTexto && (
          <div className="entrada sin-barra mb-2.5 flex justify-center gap-2 overflow-x-auto">
            {atajos().map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => crear(a.fecha())}
                disabled={ocupado}
                className="shrink-0 rounded-full bg-white px-3.5 py-2 text-[13px] font-medium text-tinta shadow-sm transition-colors hover:bg-senal hover:text-white disabled:opacity-50"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (hayTexto) {
              onDetalles(titulo.trim());
              setTitulo("");
            } else {
              onDetalles("");
            }
          }}
          className="flex items-center gap-2 rounded-full bg-tinta p-1.5 pl-5 shadow-[0_10px_30px_-8px_rgba(23,19,37,0.45)]"
        >
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="¿Qué no se te puede pasar?"
            aria-label="Nuevo pendiente"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-white placeholder:text-white/45 focus:outline-none"
          />
          <button
            type="submit"
            aria-label={hayTexto ? "Elegir día, hora y avisos" : "Agregar pendiente"}
            title={hayTexto ? "Elegir día, hora y avisos" : "Agregar pendiente"}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-senal text-white transition-transform active:scale-95"
          >
            {hayTexto ? (
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
