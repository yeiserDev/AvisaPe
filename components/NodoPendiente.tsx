"use client";

import { Check, Clock3, Repeat2, Trash2 } from "lucide-react";
import type { Task } from "@/lib/types";
import { faltan, hora, urgencia, type Urgencia } from "@/lib/time";

const TIEMPO: Record<Urgencia, string> = {
  vencido: "text-alerta",
  inminente: "text-senal",
  proximo: "text-humo",
  lejano: "text-humo",
};

type Props = {
  task: Task;
  now: Date;
  onListo: (task: Task) => void;
  onPosponer: (task: Task) => void;
  onBorrar: (task: Task) => void;
  onAbrir: (task: Task) => void;
};

export default function NodoPendiente({
  task,
  now,
  onListo,
  onPosponer,
  onBorrar,
  onAbrir,
}: Props) {
  const due = new Date(task.due_at);
  const hecho = Boolean(task.done_at);
  const u = urgencia(due, now);

  return (
    <li className="entrada">
      <div
        className={`flex items-start gap-3 rounded-tarjeta border p-3.5 transition-colors ${
          hecho
            ? "border-transparent bg-lienzo/60"
            : u === "vencido"
              ? "border-alerta/25 bg-alerta/[0.06]"
              : "border-transparent bg-white"
        }`}
      >
        {/* Hora y cuánto falta */}
        <div className="w-[3.6rem] shrink-0 pt-0.5">
          <p
            className={`tnum font-mono text-[15px] font-semibold leading-none ${
              hecho ? "text-humo/50" : "text-tinta"
            }`}
          >
            {hora(due)}
          </p>
          {!hecho && (
            <p className={`tnum mt-1.5 font-mono text-[11px] leading-none ${TIEMPO[u]}`}>
              {u === "vencido" ? faltan(due, now).replace("hace ", "−") : faltan(due, now)}
            </p>
          )}
        </div>

        {/* Contenido */}
        <button type="button" onClick={() => onAbrir(task)} className="min-w-0 flex-1 text-left">
          <p
            className={`truncate font-display text-[16px] font-semibold leading-snug ${
              hecho ? "text-humo/70 line-through" : "text-tinta"
            }`}
          >
            {task.title}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-humo">
            <span className="rounded-full bg-lienzo px-2 py-0.5 font-medium">
              {task.kind}
            </span>
            {task.repeat && (
              <span className="inline-flex items-center gap-1 rounded-full bg-lienzo px-2 py-0.5">
                <Repeat2 className="size-3" />
                {task.repeat}
              </span>
            )}
          </div>

          {task.notes && (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-humo">
              {task.notes}
            </p>
          )}
        </button>

        {/* Acciones */}
        <div className="flex shrink-0 items-center gap-1">
          {!hecho && (
            <button
              type="button"
              onClick={() => onPosponer(task)}
              aria-label={`Posponer ${task.title} 10 minutos`}
              title="Posponer 10 min"
              className="grid size-9 place-items-center rounded-full text-humo transition-colors hover:bg-lienzo hover:text-tinta"
            >
              <Clock3 className="size-[18px]" />
            </button>
          )}

          {hecho && (
            <button
              type="button"
              onClick={() => onBorrar(task)}
              aria-label={`Borrar ${task.title}`}
              title="Borrar"
              className="grid size-9 place-items-center rounded-full text-humo transition-colors hover:bg-lienzo hover:text-alerta"
            >
              <Trash2 className="size-[18px]" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onListo(task)}
            aria-pressed={hecho}
            aria-label={hecho ? `Reabrir ${task.title}` : `Marcar ${task.title} como listo`}
            className={`grid size-9 place-items-center rounded-full border-2 transition-colors ${
              hecho
                ? "border-listo bg-listo text-white"
                : "border-borde text-transparent hover:border-listo hover:text-listo/50"
            }`}
          >
            <Check className="size-4" strokeWidth={3} />
          </button>
        </div>
      </div>
    </li>
  );
}
