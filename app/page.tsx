import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Riel from "@/components/Riel";
import type { Task } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  // Traemos desde ayer: lo que se pasó anoche todavía importa hoy.
  const desde = new Date();
  desde.setHours(0, 0, 0, 0);
  desde.setDate(desde.getDate() - 1);

  const { data } = await supabase
    .from("tasks")
    .select("*")
    .gte("due_at", desde.toISOString())
    .order("due_at", { ascending: true });

  return <Riel inicial={(data ?? []) as Task[]} email={user.email ?? ""} />;
}
