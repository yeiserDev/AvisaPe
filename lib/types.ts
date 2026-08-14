/** El tipo es texto libre: las sugerencias son atajos, no una lista cerrada. */
export type Kind = string;
export type Repeat = "diario" | "semanal" | "laborables" | "mensual";

export type Task = {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  kind: Kind;
  due_at: string;
  lead_times: number[];
  repeat: Repeat | null;
  done_at: string | null;
  created_at: string;
};

export type NewTask = {
  title: string;
  notes?: string | null;
  kind: Kind;
  due_at: string;
  lead_times: number[];
  repeat?: Repeat | null;
};

export const TIPO_POR_DEFECTO = "Tarea";

/** Se ofrecen siempre; los tuyos propios se suman a estos. */
export const TIPOS_SUGERIDOS = [
  "Tarea",
  "Reunión",
  "Sesión",
  "Pago",
  "Alarma",
  "Personal",
];

export const LARGO_MAX_TIPO = 24;

/** Deja el tipo listo para guardar: sin espacios de más y con inicial mayúscula. */
export function normalizarTipo(valor: string): string {
  const limpio = valor.trim().replace(/\s+/g, " ").slice(0, LARGO_MAX_TIPO);
  if (!limpio) return TIPO_POR_DEFECTO;
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

export const REPEATS: { value: Repeat | ""; label: string }[] = [
  { value: "", label: "Una vez" },
  { value: "diario", label: "Cada día" },
  { value: "laborables", label: "Lun a vie" },
  { value: "semanal", label: "Cada semana" },
  { value: "mensual", label: "Cada mes" },
];

/** Anticipaciones ofrecidas al crear un pendiente, en minutos. */
export const LEAD_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "A la hora" },
  { value: 5, label: "5 min antes" },
  { value: 10, label: "10 min antes" },
  { value: 30, label: "30 min antes" },
  { value: 60, label: "1 h antes" },
  { value: 1440, label: "1 día antes" },
];
