"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Entrar() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOcupado(true);

    const supabase = createClient();

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: clave,
      });
      if (error) throw error;

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(traducir((err as Error).message));
      setOcupado(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 p-3">
      <div className="vidrio-tinte rounded-bloque px-7 pb-9 pt-8 text-white">
        <span className="rounded-full bg-white/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] backdrop-blur-sm">
          AvisaPe
        </span>

        <h1 className="mt-7 font-display text-[2.5rem] font-bold leading-[1.02] tracking-tight">
          Tus pendientes,
          <br />
          avisados a tiempo.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-white/80">
          Todo lo que viene en una sola pantalla, y un aviso en tu bloqueo antes de
          cada hora que importa.
        </p>
      </div>

      <form onSubmit={enviar} className="vidrio rounded-bloque p-6">
        <label
          className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-humo"
          htmlFor="email"
        >
          Correo
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-campo border border-white/70 bg-white/45 px-4 py-3 text-base focus:border-senal focus:bg-white/85 focus:outline-none"
        />

        <label
          className="mt-5 block text-[12px] font-semibold uppercase tracking-[0.1em] text-humo"
          htmlFor="clave"
        >
          Contraseña
        </label>
        <input
          id="clave"
          type="password"
          required
          minLength={6}
          autoComplete="current-password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          className="mt-1.5 w-full rounded-campo border border-white/70 bg-white/45 px-4 py-3 text-base focus:border-senal focus:bg-white/85 focus:outline-none"
        />

        {error && (
          <p role="alert" className="mt-4 text-sm font-medium text-alerta">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={ocupado}
          className="vidrio-toque mt-6 w-full rounded-full bg-senal py-4 font-semibold text-white shadow-[0_10px_26px_-10px_rgba(107,75,214,0.95)] disabled:opacity-50"
        >
          {ocupado ? "Un momento…" : "Entrar"}
        </button>

        {/* El registro público está cerrado: las cuentas se crean desde el
            panel de Supabase, en Authentication → Users. */}
        <p className="mt-5 text-center text-[13px] leading-relaxed text-humo">
          AvisaPe es de uso privado. Las cuentas se crean desde Supabase.
        </p>
      </form>
    </main>
  );
}

/** Los mensajes de Supabase vienen en inglés y son poco claros. */
function traducir(mensaje: string): string {
  if (/Invalid login credentials/i.test(mensaje))
    return "El correo o la contraseña no coinciden.";
  if (/Email not confirmed/i.test(mensaje))
    return "La cuenta existe pero no está confirmada. Márcala como confirmada en Supabase → Authentication → Users.";
  if (/Email logins are disabled/i.test(mensaje))
    return "El proveedor de correo está apagado en Supabase → Authentication → Sign In / Providers.";
  return mensaje;
}
