"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { motion } from "framer-motion";
import {
  LARGO_MAX_TIPO,
  LEAD_OPTIONS,
  REPEATS,
  TIPOS_SUGERIDOS,
  TIPO_POR_DEFECTO,
  normalizarTipo,
  type NewTask,
  type Repeat,
  type Task,
} from "@/lib/types";
import { proximoBloque } from "@/lib/time";
import SelectorFecha from "./SelectorFecha";

/** Postgres y Supabase responden en inglés y hablando de tablas, no de la app. */
function traducir(mensaje: string): string {
  if (/tasks_kind_check/i.test(mensaje))
    return "Tu base de datos todavía tiene la lista cerrada de tipos. Corre la migración 001-tipos-libres.sql en el SQL Editor de Supabase.";
  if (/tasks_kind_largo/i.test(mensaje))
    return "El tipo quedó muy largo. Usa como máximo 24 caracteres.";
  if (/tasks_title_check|char_length\(trim\(title\)\)/i.test(mensaje))
    return "El título no puede quedar vacío.";
  if (/violates row-level security/i.test(mensaje))
    return "Se cerró la sesión. Vuelve a entrar y reintenta.";
  if (/Failed to fetch|NetworkError/i.test(mensaje))
    return "No hay conexión con el servidor. Revisa tu internet y reintenta.";
  return mensaje;
}

const CAMPO =
  "mt-1.5 w-full rounded-campo border border-white/70 bg-white/45 px-4 py-3 text-base text-tinta placeholder:text-humo/60 focus:border-senal focus:bg-white/80 focus:outline-none";
const ETIQUETA = "block text-[12px] font-semibold uppercase tracking-[0.1em] text-humo";

type Props = {
  task: Task | null;
  tituloInicial?: string;
  /** Tipos que ya usaste antes, para no volver a escribirlos. */
  tiposConocidos?: string[];
  onGuardar: (datos: NewTask, id?: string) => Promise<void>;
  onBorrar?: (task: Task) => void;
  onCerrar: () => void;
};

export default function HojaDetalle({
  task,
  tituloInicial = "",
  tiposConocidos = [],
  onGuardar,
  onBorrar,
  onCerrar,
}: Props) {
  const [titulo, setTitulo] = useState(task?.title ?? tituloInicial);
  const [notas, setNotas] = useState(task?.notes ?? "");
  const [kind, setKind] = useState(task?.kind ?? TIPO_POR_DEFECTO);
  const [cuando, setCuando] = useState<Date>(() =>
    task ? new Date(task.due_at) : proximoBloque(),
  );
  const [leads, setLeads] = useState<number[]>(task?.lead_times ?? [10, 0]);
  const [repeat, setRepeat] = useState<Repeat | "">(task?.repeat ?? "");
  const [tipoNuevo, setTipoNuevo] = useState("");
  const [escribiendoTipo, setEscribiendoTipo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sugeridos + los tuyos + el del pendiente que estás editando, sin repetir.
  const tipos = useMemo(() => {
    const vistos = new Set<string>();
    return [...TIPOS_SUGERIDOS, ...tiposConocidos, kind].filter((t) => {
      const clave = t.toLowerCase();
      if (!t || vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    });
  }, [tiposConocidos, kind]);

  useEffect(() => {
    const escape = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onCerrar]);

  function alternarLead(min: number) {
    setLeads((prev) =>
      prev.includes(min) ? prev.filter((m) => m !== min) : [...prev, min].sort((a, b) => b - a),
    );
  }

  function confirmarTipoNuevo() {
    const limpio = normalizarTipo(tipoNuevo);
    if (tipoNuevo.trim()) setKind(limpio);
    setTipoNuevo("");
    setEscribiendoTipo(false);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!titulo.trim()) return setError("Escribe qué es lo que no se te puede pasar.");
    if (leads.length === 0) return setError("Elige al menos un momento para avisarte.");

    setGuardando(true);
    try {
      await onGuardar(
        {
          title: titulo.trim(),
          notes: notas.trim() || null,
          kind: normalizarTipo(kind),
          due_at: cuando.toISOString(),
          lead_times: leads,
          repeat: repeat || null,
        },
        task?.id,
      );
      onCerrar();
    } catch (err) {
      setError(traducir((err as Error).message));
      setGuardando(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onCerrar}
        className="absolute inset-0 bg-tinta/40 backdrop-blur-md"
      />

      <motion.form
        layout
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onSubmit={guardar}
        className="vidrio safe-bottom relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-bloque p-6 sm:rounded-bloque"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {task ? "Editar pendiente" : "Nuevo pendiente"}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="vidrio-toque grid size-9 place-items-center rounded-full bg-tinta/[0.07] text-humo transition-colors hover:bg-tinta/15 hover:text-tinta"
          >
            <X className="size-5" />
          </button>
        </div>

        <label className={ETIQUETA} htmlFor="titulo">
          Qué
        </label>
        <input
          id="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          autoFocus={!task}
          placeholder="Reunión con el equipo de datos"
          className={CAMPO}
        />

        <p className={`${ETIQUETA} mt-5`}>Cuándo</p>
        <SelectorFecha valor={cuando} onCambio={setCuando} />

        <fieldset className="mt-5">
          <legend className={ETIQUETA}>Tipo</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {tipos.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setKind(t)}
                aria-pressed={kind === t}
                className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                  kind === t
                    ? "bg-tinta text-white"
                    : "border border-white/70 bg-white/40 text-humo hover:border-tinta hover:text-tinta"
                }`}
              >
                {t}
              </button>
            ))}

            {escribiendoTipo ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-senal bg-white/85 pl-4 pr-1.5">
                <input
                  value={tipoNuevo}
                  onChange={(e) => setTipoNuevo(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter aquí confirmaría el formulario completo.
                    if (e.key === "Enter") {
                      e.preventDefault();
                      confirmarTipoNuevo();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setEscribiendoTipo(false);
                      setTipoNuevo("");
                    }
                  }}
                  onBlur={confirmarTipoNuevo}
                  autoFocus
                  maxLength={LARGO_MAX_TIPO}
                  placeholder="Despertar"
                  aria-label="Nombre del tipo"
                  className="w-28 bg-transparent py-1.5 text-[13px] text-tinta placeholder:text-humo/60 focus:outline-none max-sm:text-base"
                />
                <span className="grid size-7 place-items-center rounded-full bg-senal text-white">
                  <Plus className="size-3.5" strokeWidth={3} />
                </span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setEscribiendoTipo(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-humo/50 px-4 py-2 text-[13px] font-medium text-humo transition-colors hover:border-senal hover:text-senal"
              >
                <Plus className="size-3.5" strokeWidth={3} />
                Otro
              </button>
            )}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className={ETIQUETA}>Avísame</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {LEAD_OPTIONS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => alternarLead(l.value)}
                aria-pressed={leads.includes(l.value)}
                className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                  leads.includes(l.value)
                    ? "bg-senal text-white"
                    : "border border-white/70 bg-white/40 text-humo hover:border-senal hover:text-senal"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Píldoras en vez de un <select>: el desplegable nativo lo dibuja el
            sistema operativo y no hay forma de que combine con el resto. */}
        <fieldset className="mt-5">
          <legend className={ETIQUETA}>Se repite</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {REPEATS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRepeat(r.value)}
                aria-pressed={repeat === r.value}
                className={`vidrio-toque rounded-full px-4 py-2 text-[13px] font-medium ${
                  repeat === r.value
                    ? "bg-tinta text-white"
                    : "border border-white/70 bg-white/40 text-humo hover:border-tinta hover:text-tinta"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className={`${ETIQUETA} mt-5`} htmlFor="notas">
          Nota <span className="font-normal normal-case tracking-normal">(opcional)</span>
        </label>
        <textarea
          id="notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          placeholder="Link del meet, sala, con quién…"
          className={`${CAMPO} resize-none`}
        />

        {error && (
          <p role="alert" className="mt-4 text-sm font-medium text-alerta">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="vidrio-toque mt-6 w-full rounded-full bg-senal py-4 font-semibold text-white shadow-[0_10px_26px_-10px_rgba(107,75,214,0.95)] disabled:opacity-50"
        >
          {guardando ? "Guardando…" : task ? "Guardar cambios" : "Agregar pendiente"}
        </button>

        {/* Borrar pide confirmación en el mismo botón: es la única acción de
            la app que no se puede deshacer. */}
        {task && onBorrar && (
          <>
            <button
              type="button"
              onClick={() => {
                if (!confirmando) return setConfirmando(true);
                onBorrar(task);
                onCerrar();
              }}
              className={`vidrio-toque mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold transition-colors ${
                confirmando
                  ? "bg-alerta text-white shadow-[0_10px_26px_-10px_rgba(168,72,15,0.9)]"
                  : "border border-alerta/30 bg-alerta/[0.07] text-alerta hover:bg-alerta/15"
              }`}
            >
              <Trash2 className="size-4" />
              {confirmando ? "Sí, borrar este pendiente" : "Borrar pendiente"}
            </button>

            {confirmando && (
              <p className="mt-2 text-center text-[12px] leading-snug text-humo">
                Se borra para siempre, junto con sus avisos.{" "}
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  className="font-semibold text-tinta underline underline-offset-2"
                >
                  Mejor no
                </button>
              </p>
            )}
          </>
        )}
      </motion.form>
    </motion.div>
  );
}
