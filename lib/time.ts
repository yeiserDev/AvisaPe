import type { Repeat } from "./types";

const DIA = 86_400_000;

/** "en 2 h 15" / "hace 5 min" / "ahora". Corto, para que quepa en el riel. */
export function faltan(due: Date, now: Date = new Date()): string {
  const ms = due.getTime() - now.getTime();
  const abs = Math.abs(ms);
  const min = Math.round(abs / 60_000);

  if (min < 1) return "ahora";

  const prefijo = ms > 0 ? "en " : "hace ";

  if (min < 60) return `${prefijo}${min} min`;

  const h = Math.floor(min / 60);
  const restoMin = min % 60;
  if (h < 24) return `${prefijo}${h} h${restoMin ? ` ${restoMin}` : ""}`;

  const d = Math.floor(h / 24);
  const restoH = h % 24;
  if (d < 7) return `${prefijo}${d} d${restoH ? ` ${restoH} h` : ""}`;

  return `${prefijo}${Math.floor(d / 7)} sem`;
}

/** Hora local en 24 h: "14:30". */
export function hora(d: Date): string {
  return d.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Encabezado de grupo: "Hoy", "Mañana", "Vie 22 ago". */
export function etiquetaDia(d: Date, now: Date = new Date()): string {
  const dias = diasDeDiferencia(d, now);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  if (dias === -1) return "Ayer";

  const texto = d.toLocaleDateString("es-PE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1).replace(/\./g, "");
}

/** Diferencia en días de calendario, no en horas transcurridas. */
export function diasDeDiferencia(a: Date, b: Date): number {
  const inicioA = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const inicioB = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((inicioA.getTime() - inicioB.getTime()) / DIA);
}

/**
 * Urgencia de un pendiente, para elegir su color en el riel.
 * `vencido` incluye lo que ya pasó de hora y sigue sin marcarse.
 */
export type Urgencia = "vencido" | "inminente" | "proximo" | "lejano";

export function urgencia(due: Date, now: Date = new Date()): Urgencia {
  const min = (due.getTime() - now.getTime()) / 60_000;
  if (min < 0) return "vencido";
  if (min <= 60) return "inminente";
  if (min <= 60 * 12) return "proximo";
  return "lejano";
}

/** Fecha del siguiente disparo de un pendiente que se repite. */
export function siguienteOcurrencia(due: Date, repeat: Repeat): Date {
  const d = new Date(due);
  switch (repeat) {
    case "diario":
      d.setDate(d.getDate() + 1);
      return d;
    case "semanal":
      d.setDate(d.getDate() + 7);
      return d;
    case "mensual":
      d.setMonth(d.getMonth() + 1);
      return d;
    case "laborables":
      do {
        d.setDate(d.getDate() + 1);
      } while (d.getDay() === 0 || d.getDay() === 6);
      return d;
  }
}

/** Redondea al siguiente múltiplo de 5 minutos: buen valor por defecto. */
export function proximoBloque(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + (5 - (d.getMinutes() % 5)) + 10);
  return d;
}
