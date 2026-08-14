"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TIPO_POR_DEFECTO, type NewTask, type Task } from "@/lib/types";
import {
  diasDeDiferencia,
  etiquetaDia,
  faltan,
  hora,
  siguienteOcurrencia,
} from "@/lib/time";
import AvisosGate from "./AvisosGate";
import Composer from "./Composer";
import HojaDetalle from "./HojaDetalle";
import NodoPendiente from "./NodoPendiente";

type Grupo = { clave: string; etiqueta: string; fecha: Date; items: Task[] };
/** "todo" o el nombre de un tipo. */
type Filtro = string;

export default function Riel({ inicial, email }: { inicial: Task[]; email: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [tasks, setTasks] = useState<Task[]>(inicial);
  const [now, setNow] = useState(() => new Date());
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const [hoja, setHoja] = useState<{ task: Task | null; titulo: string } | null>(null);
  const paramsProcesados = useRef(false);

  // El riel es un reloj: sin este latido las cuentas regresivas mienten.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  const recargar = useCallback(async () => {
    const desde = new Date();
    desde.setHours(0, 0, 0, 0);
    desde.setDate(desde.getDate() - 1);

    const { data } = await supabase
      .from("tasks")
      .select("*")
      .gte("due_at", desde.toISOString())
      .order("due_at", { ascending: true });

    if (data) setTasks(data as Task[]);
  }, [supabase]);

  // Los cambios hechos en la laptop tienen que aparecer en el iPhone solos.
  useEffect(() => {
    const canal = supabase
      .channel("tasks-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, recargar)
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [supabase, recargar]);

  // Al volver a la app (desde el bloqueo, por ejemplo) los datos se refrescan.
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === "visible") {
        setNow(new Date());
        recargar();
      }
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [recargar]);

  // ── Acciones ────────────────────────────────────────────────

  const crear = useCallback(
    async (datos: NewTask) => {
      const { data: sesion } = await supabase.auth.getUser();
      if (!sesion.user) throw new Error("Se cerró la sesión. Vuelve a entrar.");

      const { error } = await supabase.from("tasks").insert({
        ...datos,
        user_id: sesion.user.id,
      });
      if (error) throw new Error(error.message);
      await recargar();
    },
    [supabase, recargar],
  );

  const actualizar = useCallback(
    async (datos: NewTask, id: string) => {
      const { error } = await supabase.from("tasks").update(datos).eq("id", id);
      if (error) throw new Error(error.message);
      await recargar();
    },
    [supabase, recargar],
  );

  const alternarListo = useCallback(
    async (task: Task) => {
      const hecho = Boolean(task.done_at);

      // Actualización optimista: el toque tiene que sentirse inmediato.
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, done_at: hecho ? null : new Date().toISOString() } : t,
        ),
      );

      await supabase
        .from("tasks")
        .update({ done_at: hecho ? null : new Date().toISOString() })
        .eq("id", task.id);

      // Al cerrar uno que se repite, queda listo el de la siguiente vuelta.
      if (!hecho && task.repeat) {
        const { data: sesion } = await supabase.auth.getUser();
        if (sesion.user) {
          await supabase.from("tasks").insert({
            user_id: sesion.user.id,
            title: task.title,
            notes: task.notes,
            kind: task.kind,
            lead_times: task.lead_times,
            repeat: task.repeat,
            due_at: siguienteOcurrencia(new Date(task.due_at), task.repeat).toISOString(),
          });
        }
      }

      await recargar();
    },
    [supabase, recargar],
  );

  const posponer = useCallback(
    async (task: Task, minutos = 10) => {
      // Desde ahora, no desde la hora original: posponer algo vencido a las
      // 3 p.m. no debería dejarlo vencido otra vez.
      const base = Math.max(Date.now(), new Date(task.due_at).getTime());
      const nueva = new Date(base + minutos * 60_000).toISOString();

      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, due_at: nueva } : t)));
      await supabase.from("tasks").update({ due_at: nueva }).eq("id", task.id);
      await recargar();
    },
    [supabase, recargar],
  );

  const borrar = useCallback(
    async (task: Task) => {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      await supabase.from("tasks").delete().eq("id", task.id);
    },
    [supabase],
  );

  // Órdenes que llegan desde los botones de la notificación.
  useEffect(() => {
    if (paramsProcesados.current) return;
    const params = new URLSearchParams(window.location.search);
    const listo = params.get("listo");
    const posponerId = params.get("posponer");
    const nuevo = params.get("nuevo");

    if (!listo && !posponerId && !nuevo) return;
    paramsProcesados.current = true;

    const objetivo = tasks.find((t) => t.id === (listo ?? posponerId));
    if (listo && objetivo && !objetivo.done_at) alternarListo(objetivo);
    if (posponerId && objetivo) posponer(objetivo);
    if (nuevo) setHoja({ task: null, titulo: "" });

    window.history.replaceState({}, "", window.location.pathname);
  }, [tasks, alternarListo, posponer]);

  // ── Armado de la lista ──────────────────────────────────────

  const { grupos, listos, proximo, vencidos, hoyTotal } = useMemo(() => {
    const pendientes = tasks
      .filter((t) => !t.done_at)
      .sort((a, b) => a.due_at.localeCompare(b.due_at));

    const visibles =
      filtro === "todo" ? pendientes : pendientes.filter((t) => t.kind === filtro);

    const listos = tasks
      .filter((t) => t.done_at)
      .sort((a, b) => b.done_at!.localeCompare(a.done_at!));

    const mapa = new Map<string, Grupo>();
    for (const t of visibles) {
      const d = new Date(t.due_at);
      const clave = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!mapa.has(clave)) {
        mapa.set(clave, { clave, etiqueta: etiquetaDia(d, now), fecha: d, items: [] });
      }
      mapa.get(clave)!.items.push(t);
    }

    return {
      grupos: [...mapa.values()],
      listos,
      // El resumen del encabezado siempre habla de todo, no del filtro activo.
      proximo: pendientes.find((t) => new Date(t.due_at) >= now) ?? null,
      vencidos: pendientes.filter((t) => new Date(t.due_at) < now),
      hoyTotal: pendientes.filter((t) => diasDeDiferencia(new Date(t.due_at), now) === 0)
        .length,
    };
  }, [tasks, now, filtro]);

  // El día de hoy es donde vive la línea de ahora.
  const claveHoy = grupos.find((g) => diasDeDiferencia(g.fecha, now) === 0)?.clave ?? null;

  const titular = vencidos.length
    ? `${vencidos.length} se ${vencidos.length === 1 ? "te pasó" : "te pasaron"}`
    : proximo
      ? `Lo próximo, ${faltan(new Date(proximo.due_at), now)}`
      : "Todo bajo control";

  const subtitular = vencidos.length
    ? vencidos[0].title
    : proximo
      ? proximo.title
      : "No tienes nada por delante.";

  // Los filtros salen de lo que realmente tienes, no de una lista fija.
  const tiposConocidos = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const t of tasks) cuenta.set(t.kind, (cuenta.get(t.kind) ?? 0) + 1);
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1]).map(([tipo]) => tipo);
  }, [tasks]);

  const filtros: Filtro[] = ["todo", ...tiposConocidos];

  return (
    <>
      <div className="mx-auto max-w-2xl pb-36">
        {/* ── Bloque protagonista ── */}
        <header className="safe-top px-3">
          <div className="vidrio-tinte rounded-bloque px-6 pb-7 pt-5 text-white">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-white/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] backdrop-blur-sm">
                AvisaPe
              </span>
              <form action="/auth/salir" method="post">
                <button
                  type="submit"
                  title={`Salir de ${email}`}
                  aria-label={`Salir de ${email}`}
                  className="vidrio-toque grid size-9 place-items-center rounded-full bg-white/20 backdrop-blur-sm transition-colors hover:bg-white/30"
                >
                  <LogOut className="size-4" />
                </button>
              </form>
            </div>

            <h1 className="mt-7 font-display text-[2.4rem] font-bold leading-[1.02] tracking-tight">
              {titular}
            </h1>
            <p className="mt-2 line-clamp-2 text-[15px] leading-snug text-white/80">
              {subtitular}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-medium backdrop-blur-sm">
                {hoyTotal} {hoyTotal === 1 ? "pendiente hoy" : "pendientes hoy"}
              </span>
              {vencidos.length > 0 && (
                <span className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-alerta">
                  {vencidos.length} sin cerrar
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="px-3">
          <AvisosGate />
        </div>

        {/* ── Filtros ── */}
        {filtros.length > 2 && (
          <div className="sticky top-0 z-20 mt-4 px-3 py-1">
            <div className="sin-barra flex gap-2 overflow-x-auto">
              {filtros.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFiltro(f)}
                  aria-pressed={filtro === f}
                  className={`vidrio-toque shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold ${
                    filtro === f
                      ? "vidrio-oscuro text-white"
                      : "vidrio-fino text-tinta/75"
                  }`}
                >
                  {f === "todo" ? "Todo" : f}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Lista ── */}
        {grupos.length === 0 ? (
          <div className="vidrio mx-3 mt-4 rounded-bloque px-6 py-12 text-center">
            <p className="font-display text-xl font-bold">
              {filtro === "todo" ? "Nada por delante" : "Nada de este tipo"}
            </p>
            <p className="mx-auto mt-2 max-w-xs text-[14px] leading-relaxed text-humo">
              {filtro === "todo"
                ? "Escribe abajo lo primero que no se te puede pasar y elige la hora. Te aviso en la pantalla de bloqueo."
                : "Cambia el filtro a Todo para ver el resto de tus pendientes."}
            </p>
          </div>
        ) : (
          grupos.map((grupo) => (
            <section key={grupo.clave} className="mt-5 px-3">
              <div className="mb-2.5 flex items-baseline gap-2.5 px-1">
                <h2 className="font-display text-[22px] font-bold tracking-tight">
                  {grupo.etiqueta}
                </h2>
                <span className="vidrio-fino tnum rounded-full px-2.5 py-0.5 font-mono text-[11px] text-humo">
                  {grupo.items.length}
                </span>
              </div>

              <ul className="flex flex-col gap-2">
                {grupo.items.map((task, i) => (
                  <Fragment key={task.id}>
                    {grupo.clave === claveHoy && debeIrLineaAntes(grupo.items, i, now) && (
                      <LineaDeAhora now={now} />
                    )}
                    <NodoPendiente
                      task={task}
                      now={now}
                      onListo={alternarListo}
                      onPosponer={posponer}
                      onBorrar={borrar}
                      onAbrir={(t) => setHoja({ task: t, titulo: "" })}
                    />
                  </Fragment>
                ))}

                {grupo.clave === claveHoy &&
                  grupo.items.every((t) => new Date(t.due_at) < now) && (
                    <LineaDeAhora now={now} />
                  )}
              </ul>
            </section>
          ))
        )}

        {/* ── Cerrados ── */}
        {listos.length > 0 && (
          <details className="group mt-6 px-3">
            <summary className="vidrio-fino vidrio-toque flex cursor-pointer list-none items-center justify-center gap-2 rounded-full py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-humo [&::-webkit-details-marker]:hidden">
              {listos.length} {listos.length === 1 ? "cerrado" : "cerrados"}
              <ChevronDown className="size-3.5 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <ul className="mt-2 flex flex-col gap-2">
              {listos.map((task) => (
                <NodoPendiente
                  key={task.id}
                  task={task}
                  now={now}
                  onListo={alternarListo}
                  onPosponer={posponer}
                  onBorrar={borrar}
                  onAbrir={(t) => setHoja({ task: t, titulo: "" })}
                />
              ))}
            </ul>
          </details>
        )}
      </div>

      <Composer
        onCrearRapido={async (titulo, cuando) =>
          crear({
            title: titulo,
            // Si estás filtrando por un tipo, lo nuevo hereda ese tipo.
            kind: filtro === "todo" ? TIPO_POR_DEFECTO : filtro,
            due_at: cuando.toISOString(),
            lead_times: [10, 0],
          })
        }
        onDetalles={(titulo) => setHoja({ task: null, titulo })}
      />

      {hoja && (
        <HojaDetalle
          task={hoja.task}
          tituloInicial={hoja.titulo}
          tiposConocidos={tiposConocidos}
          onGuardar={async (datos, id) => (id ? actualizar(datos, id) : crear(datos))}
          onBorrar={borrar}
          onCerrar={() => setHoja(null)}
        />
      )}
    </>
  );
}

/** La línea va justo antes del primer pendiente que todavía no llega. */
function debeIrLineaAntes(items: Task[], i: number, now: Date): boolean {
  const esteEsFuturo = new Date(items[i].due_at) >= now;
  const anteriorEsFuturo = i > 0 && new Date(items[i - 1].due_at) >= now;
  return esteEsFuturo && !anteriorEsFuturo;
}

/** La firma de AvisaPe: dónde estás parado dentro del día. */
function LineaDeAhora({ now }: { now: Date }) {
  return (
    <li className="flex items-center gap-2.5 py-1" aria-hidden>
      <span className="relative size-2.5 shrink-0">
        <span className="pulso absolute left-1/2 top-1/2 size-2.5 rounded-full bg-senal" />
      </span>
      <span className="tnum font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-senal">
        ahora {hora(now)}
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-senal/45 to-transparent" />
    </li>
  );
}
