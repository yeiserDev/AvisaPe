import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Registra (o actualiza) el dispositivo actual para recibir avisos. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 401 });
  }

  const { subscription, oldEndpoint } = await request.json();

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json(
      { error: "La suscripción llegó incompleta" },
      { status: 400 },
    );
  }

  // iOS rota endpoints: si venía uno viejo, se limpia.
  if (oldEndpoint && oldEndpoint !== subscription.endpoint) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", oldEndpoint);
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: request.headers.get("user-agent"),
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** Da de baja el dispositivo actual. */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 401 });
  }

  const { endpoint } = await request.json();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

  return NextResponse.json({ ok: true });
}
