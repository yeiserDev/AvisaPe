"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Task } from "@/lib/types";
import { diaCorto, diasDeDiferencia, hora, inicioDeSemana, rangoSemana } from "@/lib/time";

type Props = {
  tasks: Task[];
  now: Date;
  abierto: boolean;
  onCerrar: () => void;
  onAbrirTarea: (t: Task) => void;
};

export default function AgendaSemana({ tasks, now, abierto, onCerrar, onAbrirTarea }: Props) {
  /** Semanas de distancia respecto a la actual. */
  const [salto, setSalto] = useState(0);
  const inicioToque = useRef<{ x: number; y: number } | null>(null);

  // Al reabrir el panel siempre se vuelve a la semana en curso.
  useEffect(() => {
    if (abierto) setSalto(0);
  }, [abierto]);

  useEffect(() => {
    const escape = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onCerrar]);

  const lunes = useMemo(() => {
    const d = inicioDeSemana(now);
    d.setDate(d.getDate() + salto * 7);
    return d;
  }, [now, salto]);

  const semana = useMemo(() => {
    const dias = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      return d;
    });

    return dias.map((fecha) => ({
      fecha,
      esHoy: diasDeDiferencia(fecha, now) === 0,
      items: tasks
        .filter((t) => !t.done_at && diasDeDiferencia(new Date(t.due_at), fecha) === 0)
        .sort((a, b) => a.due_at.localeCompare(b.due_at)),
    }));
  }, [lunes, tasks, now]);

  const carga = Math.max(1, ...semana.map((d) => d.items.length));
  const total = semana.reduce((s, d) => s + d.items.length, 0);

  return (
    <motion.aside
      aria-hidden={!abierto}
      initial={false}
      animate={{ x: abierto ? "0%" : "104%" }}
      transition={{ type: "spring", stiffness: 320, damping: 34 }}
      onTouchStart={(e) => {
        const t = e.touches[0];
        inicioToque.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const p = inicioToque.current;
        inicioToque.current = null;
        if (!p) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - p.x;
        const dy = t.clientY - p.y;
        // Cerrar devolviendo el panel hacia la derecha.
        if (dx > 80 && Math.abs(dx) > Math.abs(dy) * 2) onCerrar();
      }}
      className="vidrio fixed inset-y-0 right-0 z-40 flex w-[86vw] max-w-md flex-col rounded-l-[2rem] shadow-[0_0_60px_-10px_rgba(0,0,0,0.9)]"
    >
      {/* Cabecera */}
      <div className="safe-top shrink-0 px-5 pb-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-humo">
            La semana
          </p>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar la semana"
            className="vidrio-toque grid size-9 place-items-center rounded-full bg-white/10 text-tinta"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSalto((s) => s - 1)}
            aria-label="Semana anterior"
            className="vidrio-toque grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.07] text-humo hover:text-tinta"
          >
            <ChevronLeft className="size-4" />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate font-display text-[17px] font-bold capitalize tracking-tight">
              {rangoSemana(lunes)}
            </p>
            <p className="mt-0.5 text-[12px] text-humo">
              {salto === 0
                ? "Esta semana"
                : salto === 1
                  ? "La próxima"
                  : salto === -1
                    ? "La pasada"
                    : `${Math.abs(salto)} semanas ${salto > 0 ? "adelante" : "atrás"}`}
              {" · "}
              {total} {total === 1 ? "pendiente" : "pendientes"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSalto((s) => s + 1)}
            aria-label="Semana siguiente"
            className="vidrio-toque grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.07] text-humo hover:text-tinta"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Carga de la semana: dónde se te acumula el trabajo, de un vistazo. */}
        <div className="mt-4 flex items-end gap-1.5">
          {semana.map((d) => {
            const alto = d.items.length === 0 ? 6 : 6 + (d.items.length / carga) * 34;
            const { dia, numero } = diaCorto(d.fecha);

            return (
              <div key={d.fecha.toISOString()} className="flex flex-1 flex-col items-center gap-1.5">
                <span
                  className={`w-full rounded-full transition-all ${
                    d.esHoy ? "bg-senal" : d.items.length ? "bg-white/25" : "bg-white/10"
                  }`}
                  style={{ height: `${alto}px` }}
                />
                <span
                  className={`text-[10px] font-semibold uppercase ${
                    d.esHoy ? "text-senal" : "text-humo"
                  }`}
                >
                  {dia}
                </span>
                <span
                  className={`tnum font-mono text-[11px] ${
                    d.esHoy ? "font-bold text-tinta" : "text-humo/70"
                  }`}
                >
                  {numero}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda día por día */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {semana.map((d) => {
          const { dia, numero } = diaCorto(d.fecha);

          return (
            <section key={d.fecha.toISOString()} className="border-t border-white/[0.07] py-3">
              <div className="flex items-baseline gap-2">
                <h3
                  className={`font-display text-[15px] font-bold tracking-tight ${
                    d.esHoy ? "text-senal" : "text-tinta"
                  }`}
                >
                  {dia} {numero}
                </h3>
                {d.esHoy && (
                  <span className="rounded-full bg-senal/20 px-2 py-px text-[10px] font-bold uppercase tracking-wider text-senal">
                    Hoy
                  </span>
                )}
                {d.items.length > 0 && (
                  <span className="tnum ml-auto font-mono text-[11px] text-humo">
                    {d.items.length}
                  </span>
                )}
              </div>

              {d.items.length === 0 ? (
                <p className="mt-1.5 text-[12px] text-humo/60">Libre</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {d.items.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => onAbrirTarea(t)}
                        className="vidrio-toque flex w-full items-center gap-3 rounded-xl bg-white/[0.05] px-3 py-2 text-left"
                      >
                        <span className="tnum shrink-0 font-mono text-[13px] font-semibold text-tinta">
                          {hora(new Date(t.due_at))}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[14px] text-tinta/90">
                          {t.title}
                        </span>
                        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-humo">
                          {t.kind}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </motion.aside>
  );
}
