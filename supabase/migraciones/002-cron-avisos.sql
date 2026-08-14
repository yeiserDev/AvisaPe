-- Migración 002 — el reloj que dispara los avisos.
--
-- Sin esto los avisos quedan programados en la tabla `reminders` pero nadie
-- los despacha nunca. Corre dentro de tu propio Supabase: no hace falta el
-- plan Pro de Vercel ni un servicio de cron externo.
--
-- ANTES DE CORRERLO, reemplaza los dos valores marcados:
--   · TU_DOMINIO      → avisa-pe.vercel.app
--   · TU_CRON_SECRET  → el valor de CRON_SECRET en tu .env.local
--
-- Pégalo en Supabase → SQL Editor → Run. Es idempotente.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Si ya existía una versión anterior del trabajo, se reemplaza.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'avisape-despachar') then
    perform cron.unschedule('avisape-despachar');
  end if;
end $$;

select cron.schedule(
  'avisape-despachar',
  '* * * * *',
  $$
    select net.http_post(
      url     := 'https://TU_DOMINIO/api/cron/dispatch',
      headers := jsonb_build_object(
        'Authorization', 'Bearer TU_CRON_SECRET',
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- ─────────────────────────────────────────────────────────────
-- Para comprobar que quedó activo:
--
--   select jobname, schedule, active from cron.job;
--
-- Para ver las últimas ejecuciones y si respondieron bien:
--
--   select status, return_message, start_time
--     from cron.job_run_details
--    where jobid = (select jobid from cron.job where jobname = 'avisape-despachar')
--    order by start_time desc
--    limit 10;
--
-- Para apagarlo:
--
--   select cron.unschedule('avisape-despachar');
-- ─────────────────────────────────────────────────────────────
