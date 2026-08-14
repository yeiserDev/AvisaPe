/* AvisaPe — service worker.
   Su único trabajo serio es recibir el push y mostrar la notificación.
   Sin caché offline agresivo: los datos son de tiempo real y una lista
   de pendientes vieja es peor que una pantalla que dice "sin conexión". */

const VERSION = "avisape-v1";

self.addEventListener("install", () => {
  // Toma el control apenas se instala, sin esperar a cerrar pestañas.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const claves = await caches.keys();
      await Promise.all(
        claves.filter((k) => k !== VERSION).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("push", (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    datos = { title: "AvisaPe", body: event.data ? event.data.text() : "" };
  }

  const titulo = datos.title || "AvisaPe";
  const opciones = {
    body: datos.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    // Un tag por pendiente: si llegan dos avisos del mismo, se reemplaza.
    tag: datos.taskId ? `task-${datos.taskId}` : undefined,
    renotify: Boolean(datos.taskId),
    timestamp: datos.dueAt ? new Date(datos.dueAt).getTime() : Date.now(),
    requireInteraction: false,
    vibrate: [180, 80, 180],
    data: {
      taskId: datos.taskId || null,
      url: datos.url || "/",
    },
    actions: [
      { action: "listo", title: "Listo" },
      { action: "posponer", title: "Posponer 10 min" },
    ],
  };

  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const { taskId, url } = event.notification.data || {};
  let destino = url || "/";

  // Las acciones no se ejecutan en el worker: abrimos la app con la orden
  // en la URL y la resuelve el cliente, que ya tiene la sesión del usuario.
  if (taskId && event.action === "listo") destino = `/?listo=${taskId}`;
  if (taskId && event.action === "posponer") destino = `/?posponer=${taskId}`;

  event.waitUntil(
    (async () => {
      const clientes = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const cliente of clientes) {
        if ("focus" in cliente) {
          await cliente.focus();
          if ("navigate" in cliente && destino !== "/") {
            await cliente.navigate(destino);
          }
          return;
        }
      }

      await self.clients.openWindow(destino);
    })(),
  );
});

/* iOS puede rotar la suscripción push por su cuenta. Cuando pasa, hay que
   volver a registrarla o los avisos dejan de llegar en silencio. */
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const anterior = event.oldSubscription || (await self.registration.pushManager.getSubscription());
      const nueva =
        event.newSubscription ||
        (await self.registration.pushManager.subscribe(
          anterior ? anterior.options : { userVisibleOnly: true },
        ));

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: nueva.toJSON(),
          oldEndpoint: anterior ? anterior.endpoint : null,
        }),
      });
    })(),
  );
});
