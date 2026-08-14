-- AvisaPe — esquema completo.
-- Pégalo en Supabase → SQL Editor → Run. Es idempotente: puedes correrlo de nuevo.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- Pendientes
-- ─────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null check (char_length(trim(title)) > 0),
  notes       text,
  -- Tipo libre: hay sugerencias en la app, pero puedes inventar el tuyo.
  kind        text not null default 'Tarea'
              check (char_length(trim(kind)) between 1 and 24),
  due_at      timestamptz not null,
  -- Minutos de anticipación de cada aviso. {0} = solo a la hora exacta.
  lead_times  int[] not null default '{10,0}',
  repeat      text check (repeat in ('diario', 'semanal', 'laborables', 'mensual')),
  done_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists tasks_user_due_idx
  on public.tasks (user_id, due_at)
  where done_at is null;

-- ─────────────────────────────────────────────────────────────
-- Avisos programados (una fila por disparo)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.reminders (
  id        uuid primary key default gen_random_uuid(),
  task_id   uuid not null references public.tasks (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  fire_at   timestamptz not null,
  sent_at   timestamptz,
  unique (task_id, fire_at)
);

-- El índice que usa el despachador cada minuto.
create index if not exists reminders_pending_idx
  on public.reminders (fire_at)
  where sent_at is null;

-- ─────────────────────────────────────────────────────────────
-- Suscripciones push (un dispositivo = una fila)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

-- ─────────────────────────────────────────────────────────────
-- Regenerar avisos cuando cambia un pendiente
-- ─────────────────────────────────────────────────────────────
create or replace function public.sync_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lead int;
  fire timestamptz;
begin
  delete from public.reminders
   where task_id = new.id
     and sent_at is null;

  -- Un pendiente ya marcado como listo no vuelve a avisar.
  if new.done_at is not null then
    return new;
  end if;

  foreach lead in array new.lead_times loop
    fire := new.due_at - make_interval(mins => lead);
    -- No reprogramamos avisos que ya quedaron en el pasado.
    if fire > now() then
      insert into public.reminders (task_id, user_id, fire_at)
      values (new.id, new.user_id, fire)
      on conflict (task_id, fire_at) do nothing;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists tasks_sync_reminders on public.tasks;
create trigger tasks_sync_reminders
  after insert or update of due_at, lead_times, done_at on public.tasks
  for each row execute function public.sync_reminders();

-- ─────────────────────────────────────────────────────────────
-- Seguridad a nivel de fila: cada quien ve solo lo suyo
-- ─────────────────────────────────────────────────────────────
alter table public.tasks              enable row level security;
alter table public.reminders          enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "tasks propias" on public.tasks;
create policy "tasks propias" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reminders propios" on public.reminders;
create policy "reminders propios" on public.reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "suscripciones propias" on public.push_subscriptions;
create policy "suscripciones propias" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
