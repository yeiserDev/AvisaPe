"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, Share, SquarePlus } from "lucide-react";

/** VAPID llega en base64url; PushManager la pide como bytes. */
function base64UrlABytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const crudo = atob(normal);

  const bytes = new Uint8Array(new ArrayBuffer(crudo.length));
  for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i);
  return bytes;
}

type Estado =
  | "cargando"
  | "instalar" // iOS sin añadir a pantalla de inicio
  | "sin-soporte"
  | "pedir"
  | "bloqueado"
  | "activo";

export default function AvisosGate() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const revisar = useCallback(async () => {
    if (typeof window === "undefined") return;

    const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // Safari en iOS todavía usa esta propiedad propietaria.
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      // En iOS el PushManager solo existe dentro de la app instalada.
      setEstado(esIOS && !standalone ? "instalar" : "sin-soporte");
      return;
    }

    if (esIOS && !standalone) {
      setEstado("instalar");
      return;
    }

    if (Notification.permission === "denied") return setEstado("bloqueado");
    if (Notification.permission !== "granted") return setEstado("pedir");

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setEstado(sub ? "activo" : "pedir");
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
    revisar();
  }, [revisar]);

  async function activar() {
    setOcupado(true);
    setMensaje(null);

    try {
      // Las NEXT_PUBLIC_* se incrustan al compilar: si faltaban en ese momento,
      // aquí llegan vacías y conviene decirlo en vez de fallar sin explicación.
      const llave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!llave) {
        throw new Error(
          "Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY en el servidor. Agrégala en Vercel y vuelve a desplegar.",
        );
      }

      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "bloqueado" : "pedir");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const existente = await reg.pushManager.getSubscription();
      const sub =
        existente ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlABytes(llave),
        }));

      const r = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      if (!r.ok) throw new Error((await r.json()).error ?? "No se pudo registrar el dispositivo");

      setEstado("activo");
      setMensaje("Listo. Este dispositivo ya recibe avisos.");
    } catch (e) {
      setMensaje((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  async function probar() {
    setOcupado(true);
    setMensaje(null);
    try {
      const r = await fetch("/api/push/probar", { method: "POST" });
      const datos = await r.json();
      setMensaje(
        r.ok
          ? `Aviso enviado a ${datos.entregados} de ${datos.dispositivos} dispositivo(s).`
          : datos.error,
      );
    } catch (e) {
      setMensaje((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  if (estado === "cargando") return null;

  if (estado === "activo") {
    return (
      <p className="mt-3 px-1 text-[12px] text-humo">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-listo" />
          Avisos activos en este dispositivo
        </span>
        <button
          type="button"
          onClick={probar}
          disabled={ocupado}
          className="ml-2 font-medium text-senal underline underline-offset-2 disabled:opacity-50"
        >
          Enviar prueba
        </button>
        {mensaje && <span className="ml-2 text-listo">{mensaje}</span>}
      </p>
    );
  }

  return (
    <div className="vidrio mt-3 rounded-tarjeta p-4">
      {estado === "instalar" && (
        <>
          <p className="flex items-center gap-2 font-display font-bold text-tinta">
            <SquarePlus className="size-4 shrink-0 text-senal" />
            Instala AvisaPe en tu iPhone
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-humo">
            iOS solo entrega avisos a las apps añadidas a la pantalla de inicio. En
            Safari toca <Share className="inline size-3.5 align-[-2px]" /> Compartir →{" "}
            <strong className="font-semibold text-tinta">Añadir a pantalla de inicio</strong>,
            y abre AvisaPe desde el ícono.
          </p>
        </>
      )}

      {estado === "pedir" && (
        <>
          <p className="flex items-center gap-2 font-display font-bold text-tinta">
            <BellRing className="size-4 shrink-0 text-senal" />
            Activa los avisos
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-humo">
            Sin esto la app no puede sonar cuando estés en otra cosa. Los avisos
            aparecen en tu pantalla de bloqueo a la hora que elijas.
          </p>
          <button
            type="button"
            onClick={activar}
            disabled={ocupado}
            className="mt-3.5 rounded-full bg-senal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {ocupado ? "Activando…" : "Activar avisos"}
          </button>
        </>
      )}

      {estado === "bloqueado" && (
        <>
          <p className="font-display font-bold text-alerta">Los avisos están bloqueados</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-humo">
            Actívalos en Ajustes del iPhone → Notificaciones → AvisaPe, o en los
            permisos del sitio en tu navegador. Luego vuelve y recarga.
          </p>
        </>
      )}

      {estado === "sin-soporte" && (
        <>
          <p className="font-display font-bold text-tinta">
            Este navegador no entrega avisos
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-humo">
            Usa Safari en iPhone (con la app instalada), o Chrome, Edge o Firefox en
            computadora. Tus pendientes siguen guardados y sincronizados.
          </p>
        </>
      )}

      {mensaje && (
        <p role="alert" className="mt-2.5 text-[13px] font-medium text-alerta">
          {mensaje}
        </p>
      )}
    </div>
  );
}
