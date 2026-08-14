-- Migración 001 — el tipo de pendiente deja de ser una lista cerrada.
-- Corre esto en Supabase → SQL Editor si ya creaste las tablas antes.
-- Si estás partiendo de cero, `schema.sql` ya lo trae incluido.

-- 1. Quitar la lista cerrada de tipos.
alter table public.tasks drop constraint if exists tasks_kind_check;

-- 2. Aceptar cualquier tipo corto y no vacío.
alter table public.tasks drop constraint if exists tasks_kind_largo;
alter table public.tasks
  add constraint tasks_kind_largo
  check (char_length(trim(kind)) between 1 and 24);

-- 3. Los tipos viejos estaban en minúscula y sin tildes.
update public.tasks set kind = 'Tarea'   where kind = 'tarea';
update public.tasks set kind = 'Reunión' where kind = 'reunion';
update public.tasks set kind = 'Sesión'  where kind = 'sesion';
update public.tasks set kind = 'Pago'    where kind = 'pago';

-- 4. Nuevo valor por defecto.
alter table public.tasks alter column kind set default 'Tarea';
