"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LogOut, Utensils, Briefcase, HeartPulse, Wallet, Bell, User, Clock, CheckSquare, ListTodo, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import LoaderGlobal from "./LoaderGlobal";

type Grupo = { clave: string; etiqueta: string; fecha: Date; items: Task[] };
/** "todo" o el nombre de un tipo. */
type Filtro = string;

export default function Riel({ inicial, email }: { inicial: Task[]; email: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [tasks, setTasks] = useState<Task[]>(inicial);
  const [now, setNow] = useState(() => new Date());
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const [hoja, setHoja] = useState<{ task: Task | null; titulo: string } | null>(null);
  const [cargando, setCargando] = useState(false);
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
      setCargando(true);
      try {
        const { data: sesion } = await supabase.auth.getUser();
        if (!sesion.user) throw new Error("Se cerró la sesión. Vuelve a entrar.");

        const { error } = await supabase.from("tasks").insert({
          ...datos,
          user_id: sesion.user.id,
        });
        if (error) throw new Error(error.message);
        await recargar();
      } finally {
        setCargando(false);
      }
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
          <div className="hero-card rounded-[2rem] px-6 pb-7 pt-6 text-white">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-white/10 px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
                AvisaPe
              </span>
              <form action="/auth/salir" method="post" className="relative z-20">
                <button
                  type="submit"
                  title={`Salir de ${email}`}
                  aria-label={`Salir de ${email}`}
                  className="grid size-10 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                >
                  <LogOut className="size-[18px] text-white/80" />
                </button>
              </form>
            </div>

            {/* Calendario 3D Ultra-Premium */}
            <motion.div 
              animate={{ y: [0, -6, 0], rotateZ: [0, 1.5, -0.5, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-2 top-14 w-44 h-44 select-none pointer-events-none drop-shadow-[0_22px_35px_rgba(28,18,62,0.45)]"
            >
              {/* Estrellas flotantes */}
              <motion.div animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 3, repeat: Infinity }} className="absolute top-0 left-5 text-white text-xl">✨</motion.div>
              <motion.div animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.7, 1.1, 0.7] }} transition={{ duration: 4, repeat: Infinity, delay: 1 }} className="absolute top-7 right-4 text-white text-sm">✨</motion.div>
              
              {/* Cuerpo principal del calendario con extrusión 3D simulada */}
              <div className="absolute inset-4 rounded-[1.8rem] bg-gradient-to-br from-[#d4c3ff] via-[#a387f0] to-[#7656d4] p-[1.5px] shadow-[inset_0_4px_12px_rgba(255,255,255,0.8),inset_0_-8px_16px_rgba(0,0,0,0.15),0_15px_25px_rgba(0,0,0,0.1)]">
                {/* Textura frontal y cristal */}
                <div className="w-full h-full rounded-[1.8rem] bg-gradient-to-b from-white/30 to-transparent flex flex-col overflow-hidden relative">
                  
                  {/* Brillo diagonal Liquid Glass */}
                  <div className="absolute -inset-12 bg-gradient-to-tr from-transparent via-white/20 to-transparent rotate-45 transform translate-x-2 -translate-y-6"></div>
                  
                  {/* Cabecera / Pliegue superior */}
                  <div className="h-[2.8rem] bg-white/20 border-b border-white/30 shadow-[0_3px_12px_rgba(0,0,0,0.06)] relative backdrop-blur-md">
                    {/* Anillos metálicos 3D */}
                    <div className="absolute -top-3.5 left-5 w-3.5 h-10 rounded-full bg-gradient-to-r from-[#f4f4f4] via-[#ffffff] to-[#b8b8b8] shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_5px_8px_rgba(0,0,0,0.35)] border border-white/60">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-transparent to-black/20 mix-blend-multiply"></div>
                    </div>
                    <div className="absolute -top-3.5 right-5 w-3.5 h-10 rounded-full bg-gradient-to-r from-[#f4f4f4] via-[#ffffff] to-[#b8b8b8] shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_5px_8px_rgba(0,0,0,0.35)] border border-white/60">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-transparent to-black/20 mix-blend-multiply"></div>
                    </div>
                  </div>

                  {/* Detalle interno */}
                  <div className="flex-1 flex items-center justify-center pb-2">
                    <div className="w-[4.5rem] h-2.5 bg-white/25 rounded-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)] mt-3"></div>
                  </div>
                </div>
              </div>
              
              {/* Checkmark 3D Flotante con Parallax inverso */}
              <motion.div 
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute bottom-1 right-0 size-16 rounded-full bg-gradient-to-br from-[#e9e2ff] via-[#b6a0f5] to-[#886aeb] p-[1.5px] shadow-[inset_0_5px_10px_rgba(255,255,255,0.9),inset_0_-5px_10px_rgba(0,0,0,0.15),0_12px_28px_rgba(28,18,62,0.5)]"
              >
                <div className="w-full h-full rounded-full bg-gradient-to-b from-white/30 to-transparent flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/50 to-transparent rotate-45 transform translate-x-1 -translate-y-4"></div>
                  <Check className="size-8 text-white drop-shadow-[0_3px_5px_rgba(0,0,0,0.25)]" strokeWidth={5} />
                </div>
              </motion.div>
            </motion.div>

            <div className="relative z-10 mt-11 w-[70%]">
              <p className="font-display text-xl font-bold tracking-tight text-white/95">
                {proximo ? "Lo próximo, en" : vencidos.length ? "Tienes tareas atrasadas" : "Todo listo para hoy"}
              </p>
              <h1 className="mt-1 font-display text-[3.2rem] font-bold leading-none tracking-tight">
                {proximo ? faltan(new Date(proximo.due_at), now).replace("en ", "") : vencidos.length ? `${vencidos.length}` : "—"}
              </h1>
              
              <div className="mt-4 flex items-center gap-2.5 text-[16px] font-medium text-white/80">
                {proximo ? (
                  <>
                    <IconoParaTipo tipo={proximo.kind} />
                    <span className="truncate">{proximo.title}</span>
                  </>
                ) : vencidos.length ? (
                  <>
                    <Bell className="size-5" />
                    <span className="truncate">{vencidos[0].title}</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="size-5" />
                    <span>Buen trabajo</span>
                  </>
                )}
              </div>
            </div>

            <div className="relative z-10 mt-10 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4a3b72] px-4 py-2 text-[13px] font-semibold text-white/90 shadow-sm border border-white/5">
                <Clock className="size-4 opacity-70" />
                {hoyTotal} {hoyTotal === 1 ? "pendiente hoy" : "pendientes hoy"}
              </span>
              {vencidos.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-bold text-[#eb4559] shadow-sm">
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

              <motion.ul layout className="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {grupo.items.map((task, i) => {
                    const nodos = [];
                    if (grupo.clave === claveHoy && debeIrLineaAntes(grupo.items, i, now)) {
                      nodos.push(<LineaDeAhora now={now} key={`linea-${task.id}`} />);
                    }
                    nodos.push(
                      <NodoPendiente
                        key={task.id}
                        task={task}
                        now={now}
                        onListo={alternarListo}
                        onPosponer={posponer}
                        onBorrar={borrar}
                        onAbrir={(t) => setHoja({ task: t, titulo: "" })}
                      />
                    );
                    return nodos;
                  })}

                  {grupo.clave === claveHoy &&
                    grupo.items.every((t) => new Date(t.due_at) < now) && (
                      <LineaDeAhora now={now} key="linea-final" />
                    )}
                </AnimatePresence>
              </motion.ul>
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
            <motion.ul layout className="mt-2 flex flex-col gap-2">
              <AnimatePresence initial={false}>
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
              </AnimatePresence>
            </motion.ul>
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

      <AnimatePresence>
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
      </AnimatePresence>

      <AnimatePresence>
        {cargando && <LoaderGlobal />}
      </AnimatePresence>
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
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5 py-1" aria-hidden>
      <span className="relative size-2.5 shrink-0">
        <span className="pulso absolute left-1/2 top-1/2 size-2.5 rounded-full bg-senal" />
      </span>
      <span className="tnum font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-senal">
        ahora {hora(now)}
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-senal/45 to-transparent" />
    </motion.li>
  );
}

/** Resuelve qué icono lucide usar según la palabra clave del tipo de tarea */
function IconoParaTipo({ tipo }: { tipo: string }) {
  const k = tipo.toLowerCase();
  if (k.includes("comid") || k.includes("cenar") || k.includes("desayuno") || k.includes("almuerzo")) return <Utensils className="size-[18px]" />;
  if (k.includes("trabajo") || k.includes("reunión") || k.includes("meet")) return <Briefcase className="size-[18px]" />;
  if (k.includes("médic") || k.includes("terapia") || k.includes("sesión") || k.includes("salud")) return <HeartPulse className="size-[18px]" />;
  if (k.includes("pago") || k.includes("banco") || k.includes("dinero")) return <Wallet className="size-[18px]" />;
  if (k.includes("alarma") || k.includes("despertar")) return <Bell className="size-[18px]" />;
  if (k.includes("personal")) return <User className="size-[18px]" />;
  return <ListTodo className="size-[18px]" />;
}
