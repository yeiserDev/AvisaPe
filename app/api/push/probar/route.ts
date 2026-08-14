import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarA } from "@/lib/push";

export const runtime = "nodejs";

/** Manda un aviso de prueba a todos los dispositivos del usuario. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 401 });
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user.id);

  if (!subs?.length) {
    return NextResponse.json(
      { error: "Este dispositivo todavía no está registrado para avisos" },
      { status: 400 },
    );
  }

  let entregados = 0;
  for (const sub of subs) {
    const r = await enviarA(sub, {
      title: "Prueba de AvisaPe",
      body: "Si ves esto en la pantalla de bloqueo, los avisos ya funcionan.",
      url: "/",
    });

    if (r.ok) entregados++;
    if (r.caduco) {
      await supabase.from("push_subscriptions").delete().eq("id", sub.id);
    }
  }

  return NextResponse.json({ ok: entregados > 0, entregados, dispositivos: subs.length });
}
