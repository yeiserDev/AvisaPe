"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const dosDigitos = (n: number) => String(n).padStart(2, "0");

/** 0–23 → 1–12 para mostrar. */
const a12 = (h24: number) => ((h24 + 11) % 12) + 1;

type Props = {
  valor: Date;
  onCambio: (d: Date) => void;
};

export default function SelectorHora({ valor, onCambio }: Props) {
  const h24 = valor.getHours();
  const minuto = valor.getMinutes();
  const tarde = h24 >= 12;

  // Mientras escribes, el campo puede estar a medias ("1" camino a "12").
  const [hTexto, setHTexto] = useState(() => String(a12(h24)));
  const [mTexto, setMTexto] = useState(() => dosDigitos(minuto));

  // Si la hora cambia desde afuera (un atajo, otro pendiente), los campos siguen.
  // Solo se reescriben cuando de verdad dicen otra cosa: si no, escribir "0"
  // camino a "05" se autocompletaría a "00" y ya no cabría el segundo dígito.
  useEffect(() => {
    setHTexto((actual) => (actual !== "" && Number(actual) === a12(h24) ? actual : String(a12(h24))));
    setMTexto((actual) => (actual !== "" && Number(actual) === minuto ? actual : dosDigitos(minuto)));
  }, [h24, minuto]);

  function aplicar({ h12, min, pm }: { h12?: number; min?: number; pm?: boolean }) {
    const horaBase = h12 ?? a12(h24);
    const esTarde = pm ?? tarde;
    const nueva = new Date(valor);
    nueva.setHours((horaBase % 12) + (esTarde ? 12 : 0), min ?? minuto, 0, 0);
    onCambio(nueva);
  }

  /** La hora da la vuelta dentro de 1–12; el turno lo eliges tú. */
  function moverHora(paso: number) {
    aplicar({ h12: ((a12(h24) - 1 + paso + 12) % 12) + 1 });
  }

  /** Los minutos saltan de 5 en 5 y arrastran la hora al dar la vuelta. */
  function moverMinuto(paso: number) {
    const alineado = Math.round(minuto / 5) * 5;
    const total = alineado + paso * 5;
    const nuevoMin = ((total % 60) + 60) % 60;
    const vuelta = Math.floor(total / 60);
    aplicar({
      min: nuevoMin,
      h12: vuelta === 0 ? undefined : ((a12(h24) - 1 + vuelta + 12) % 12) + 1,
    });
  }

  return (
    <div className="rounded-campo bg-lienzo/60 p-3">
      <div className="flex items-center justify-center gap-2.5">
        <Rueda
          etiqueta="Hora"
          texto={hTexto}
          onTexto={(t) => {
            const limpio = t.replace(/\D/g, "").slice(0, 2);
            setHTexto(limpio);
            const n = Number(limpio);
            if (n >= 1 && n <= 12) aplicar({ h12: n });
          }}
          onSalir={() => setHTexto(String(a12(h24)))}
          onSubir={() => moverHora(1)}
          onBajar={() => moverHora(-1)}
        />

        <span className="pb-1 font-mono text-3xl font-bold text-humo">:</span>

        <Rueda
          etiqueta="Minuto"
          texto={mTexto}
          onTexto={(t) => {
            const limpio = t.replace(/\D/g, "").slice(0, 2);
            setMTexto(limpio);
            const n = Number(limpio);
            if (limpio !== "" && n >= 0 && n <= 59) aplicar({ min: n });
          }}
          onSalir={() => setMTexto(dosDigitos(minuto))}
          onSubir={() => moverMinuto(1)}
          onBajar={() => moverMinuto(-1)}
        />

        <div className="ml-1 flex flex-col gap-1">
          {[
            { label: "AM", pm: false },
            { label: "PM", pm: true },
          ].map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => aplicar({ pm: t.pm })}
              aria-pressed={tarde === t.pm}
              className={`rounded-full px-3.5 py-1.5 font-mono text-[12px] font-bold transition-colors ${
                tarde === t.pm
                  ? "bg-tinta text-white"
                  : "border border-borde text-humo hover:border-tinta hover:text-tinta"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Las tarjetas del día muestran 24 h: aquí queda la equivalencia. */}
      <p className="tnum mt-2 text-center font-mono text-[11px] text-humo">
        {dosDigitos(h24)}:{dosDigitos(minuto)} en formato 24 h
      </p>
    </div>
  );
}

/** Un campo de dos dígitos con flechas arriba y abajo. */
function Rueda({
  etiqueta,
  texto,
  onTexto,
  onSalir,
  onSubir,
  onBajar,
}: {
  etiqueta: string;
  texto: string;
  onTexto: (t: string) => void;
  onSalir: () => void;
  onSubir: () => void;
  onBajar: () => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={onSubir}
        aria-label={`Subir ${etiqueta.toLowerCase()}`}
        className="grid h-7 w-14 place-items-center rounded-t-xl text-humo transition-colors hover:bg-borde/60 hover:text-tinta"
      >
        <ChevronUp className="size-4" strokeWidth={2.5} />
      </button>

      <input
        value={texto}
        onChange={(e) => onTexto(e.target.value)}
        onBlur={onSalir}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            onSubir();
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            onBajar();
          }
        }}
        inputMode="numeric"
        aria-label={etiqueta}
        className="tnum w-14 rounded-lg border border-transparent bg-white py-1 text-center font-mono text-[28px] font-bold leading-tight text-tinta focus:border-senal focus:outline-none"
      />

      <button
        type="button"
        onClick={onBajar}
        aria-label={`Bajar ${etiqueta.toLowerCase()}`}
        className="grid h-7 w-14 place-items-center rounded-b-xl text-humo transition-colors hover:bg-borde/60 hover:text-tinta"
      >
        <ChevronDown className="size-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}
