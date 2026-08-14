"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SelectorHora from "./SelectorHora";

const DIAS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

const HORAS_FRECUENTES = [
  { valor: "06:00", label: "6 a.m." },
  { valor: "08:00", label: "8 a.m." },
  { valor: "09:00", label: "9 a.m." },
  { valor: "12:00", label: "Mediodía" },
  { valor: "15:00", label: "3 p.m." },
  { valor: "18:00", label: "6 p.m." },
  { valor: "21:00", label: "9 p.m." },
];

/** Índice del día de la semana con el lunes en la posición 0. */
function diaLunesPrimero(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function mismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function aHoraTexto(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

type Props = {
  valor: Date;
  onCambio: (d: Date) => void;
};

export default function SelectorFecha({ valor, onCambio }: Props) {
  const hoy = useMemo(() => new Date(), []);
  const [mesVisible, setMesVisible] = useState(
    () => new Date(valor.getFullYear(), valor.getMonth(), 1),
  );

  // Seis semanas completas: la rejilla nunca cambia de alto al pasar de mes.
  const celdas = useMemo(() => {
    const primero = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1);
    const inicio = new Date(primero);
    inicio.setDate(1 - diaLunesPrimero(primero));

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d;
    });
  }, [mesVisible]);

  const nombreMes = mesVisible.toLocaleDateString("es-PE", {
    month: "long",
    year: "numeric",
  });

  function moverMes(delta: number) {
    setMesVisible(
      new Date(mesVisible.getFullYear(), mesVisible.getMonth() + delta, 1),
    );
  }

  /** Cambia el día conservando la hora ya elegida. */
  function elegirDia(d: Date) {
    const nueva = new Date(d);
    nueva.setHours(valor.getHours(), valor.getMinutes(), 0, 0);
    onCambio(nueva);
    if (d.getMonth() !== mesVisible.getMonth()) {
      setMesVisible(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }

  /** Cambia la hora conservando el día ya elegido. */
  function elegirHora(texto: string) {
    const [h, m] = texto.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return;
    const nueva = new Date(valor);
    nueva.setHours(h, m, 0, 0);
    onCambio(nueva);
  }

  function desplazarDias(dias: number) {
    const nueva = new Date(hoy);
    nueva.setDate(nueva.getDate() + dias);
    nueva.setHours(valor.getHours(), valor.getMinutes(), 0, 0);
    onCambio(nueva);
    setMesVisible(new Date(nueva.getFullYear(), nueva.getMonth(), 1));
  }

  const yaPaso = valor.getTime() < Date.now();

  return (
    <div className="mt-1.5 rounded-campo border border-white/70 bg-white/50 p-3">
      {/* Atajos de día */}
      <div className="sin-barra mb-3 flex gap-2 overflow-x-auto">
        {[
          { label: "Hoy", dias: 0 },
          { label: "Mañana", dias: 1 },
          { label: "En una semana", dias: 7 },
        ].map((a) => {
          const objetivo = new Date(hoy);
          objetivo.setDate(objetivo.getDate() + a.dias);
          const activo = mismoDia(valor, objetivo);

          return (
            <button
              key={a.label}
              type="button"
              onClick={() => desplazarDias(a.dias)}
              aria-pressed={activo}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                activo
                  ? "bg-tinta text-white"
                  : "border border-white/70 bg-white/40 text-humo hover:border-tinta hover:text-tinta"
              }`}
            >
              {a.label}
            </button>
          );
        })}
      </div>

      {/* Mes */}
      <div className="mb-2 flex items-center justify-between">
        <p className="font-display text-[15px] font-bold capitalize tracking-tight">
          {nombreMes}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => moverMes(-1)}
            aria-label="Mes anterior"
            className="grid size-8 place-items-center rounded-full text-humo transition-colors hover:bg-tinta/[0.07] hover:text-tinta"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => moverMes(1)}
            aria-label="Mes siguiente"
            className="grid size-8 place-items-center rounded-full text-humo transition-colors hover:bg-tinta/[0.07] hover:text-tinta"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Rejilla */}
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {DIAS.map((d) => (
          <div key={d} className="pb-1 text-[10px] font-semibold uppercase text-humo">
            {d}
          </div>
        ))}

        {celdas.map((d) => {
          const deOtroMes = d.getMonth() !== mesVisible.getMonth();
          const esHoy = mismoDia(d, hoy);
          const elegido = mismoDia(d, valor);

          return (
            <div key={d.toISOString()} className="flex justify-center">
              <button
                type="button"
                onClick={() => elegirDia(d)}
                aria-label={d.toLocaleDateString("es-PE", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
                aria-pressed={elegido}
                className={`tnum grid size-9 place-items-center rounded-full font-mono text-[13px] transition-colors ${
                  elegido
                    ? "bg-senal font-bold text-white"
                    : esHoy
                      ? "font-bold text-senal ring-1 ring-inset ring-senal/40 hover:bg-tinta/[0.07]"
                      : deOtroMes
                        ? "text-humo/35 hover:bg-tinta/[0.07]"
                        : "text-tinta hover:bg-tinta/[0.07]"
                }`}
              >
                {d.getDate()}
              </button>
            </div>
          );
        })}
      </div>

      {/* Hora */}
      <div className="mt-3 border-t border-white/70 pt-3">
        <SelectorHora valor={valor} onCambio={onCambio} />

        <div className="sin-barra mt-2.5 flex gap-1.5 overflow-x-auto">
          {HORAS_FRECUENTES.map((h) => (
            <button
              key={h.valor}
              type="button"
              onClick={() => elegirHora(h.valor)}
              aria-pressed={aHoraTexto(valor) === h.valor}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                aHoraTexto(valor) === h.valor
                  ? "bg-tinta text-white"
                  : "border border-white/70 bg-white/40 text-humo hover:border-tinta hover:text-tinta"
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {yaPaso && (
        <p className="mt-3 rounded-campo bg-alerta/[0.08] px-3 py-2 text-[12px] leading-snug text-alerta">
          Esa hora ya pasó. Se guardará, pero no te va a avisar.
        </p>
      )}
    </div>
  );
}
