import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { enviarA } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Texto del aviso según cuánto falta para la hora. */
function cuerpo(dueAt: string, kind: string): string {
  const faltanMin = Math.round((new Date(dueAt).getTime() - Date.now()) / 60_000);
  const hora = new Date(dueAt).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: process.env.APP_TIMEZONE || "America/Lima",
  });

  const etiqueta = kind?.trim() || "Pendiente";

  if (faltanMin <= 1) return `${etiqueta} · es ahora (${hora})`;
  if (faltanMin < 60) return `${etiqueta} · en ${faltanMin} min (${hora})`;
  if (faltanMin < 1440) return `${etiqueta} · hoy a las ${hora}`;
  return `${etiqueta} · mañana a las ${hora}`;
}

/**
 * Despachador de avisos. Debe correr cada minuto.
 * Protegido con CRON_SECRET vía `Authorization: Bearer <secreto>`.
 */
async function despachar(request: Request) {
  const secreto = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!secreto) {
    return NextResponse.json({ error: "Falta CRON_SECRET" }, { status: 500 });
  }
  if (auth !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Ventana hacia atrás de 15 min: si el cron se cayó un rato, los avisos
  // atrasados salen igual en lugar de perderse para siempre.
  const desde = new Date(Date.now() - 15 * 60_000).toISOString();
  const hasta = new Date().toISOString();

  const { data: pendientes, error } = await supabase
    .from("reminders")
    .select("id, user_id, fire_at, task:tasks!inner(id, title, kind, due_at, done_at)")
    .is("sent_at", null)
    .gte("fire_at", desde)
    .lte("fire_at", hasta)
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let enviados = 0;
  let omitidos = 0;

  for (const rem of pendientes ?? []) {
    const task = rem.task as unknown as {
      id: string;
      title: string;
      kind: string;
      due_at: string;
      done_at: string | null;
    };

    // Se marcó como listo entre que se programó y ahora: no molestamos.
    if (task.done_at) {
      await supabase
        .from("reminders")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", rem.id);
      omitidos++;
      continue;
    }

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", rem.user_id);

    for (const sub of subs ?? []) {
      const r = await enviarA(sub, {
        title: task.title,
        body: cuerpo(task.due_at, task.kind),
        taskId: task.id,
        dueAt: task.due_at,
        url: "/",
      });

      if (r.ok) enviados++;
      if (r.caduco) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }

    // Se marca aunque no haya dispositivos: sin esto el aviso se reintentaría
    // cada minuto durante toda la ventana de 15 min.
    await supabase
      .from("reminders")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", rem.id);
  }

  return NextResponse.json({
    ok: true,
    avisos: pendientes?.length ?? 0,
    enviados,
    omitidos,
  });
}

export const GET = despachar;
export const POST = despachar;
