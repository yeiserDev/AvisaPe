import webpush from "web-push";

let configurado = false;

/** Configura VAPID una sola vez por proceso. */
export function getWebPush() {
  if (!configurado) {
    const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privada = process.env.VAPID_PRIVATE_KEY;
    const contacto = process.env.VAPID_SUBJECT || "mailto:avisos@avisape.app";

    if (!publica || !privada) {
      throw new Error(
        "Faltan las llaves VAPID. Corre `npm run vapid` y pégalas en .env.local",
      );
    }

    webpush.setVapidDetails(contacto, publica, privada);
    configurado = true;
  }

  return webpush;
}

export type PushPayload = {
  title: string;
  body: string;
  taskId?: string;
  dueAt?: string;
  url?: string;
};

export type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Envía a un dispositivo. Devuelve `caduco: true` si el endpoint ya no existe
 * (404/410), señal de que hay que borrar la suscripción de la base.
 */
export async function enviarA(
  sub: SubscriptionRow,
  payload: PushPayload,
): Promise<{ ok: boolean; caduco: boolean; error?: string }> {
  try {
    await getWebPush().sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      { TTL: 3600, urgency: "high" },
    );
    return { ok: true, caduco: false };
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    return {
      ok: false,
      caduco: status === 404 || status === 410,
      error: (e as Error).message,
    };
  }
}
