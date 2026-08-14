# AvisaPe

Tus pendientes en un riel de tiempo, con aviso en la pantalla de bloqueo del iPhone.

Web y móvil con el mismo código: es una PWA instalable. En iOS 16.4+ las
notificaciones push llegan a la pantalla de bloqueo **siempre que la app esté
añadida a la pantalla de inicio** — es un requisito de Apple, no una decisión
nuestra.

---

## Cómo está armado

| Pieza | Qué hace |
| --- | --- |
| Next.js 15 (App Router) | Web app y endpoints del servidor |
| Supabase | Base de datos Postgres, login y sincronización en tiempo real |
| Web Push + VAPID | El aviso que suena aunque la app esté cerrada |
| Service worker (`public/sw.js`) | Recibe el push y dibuja la notificación |
| `/api/cron/dispatch` | Corre cada minuto y despacha los avisos que tocan |

Los avisos **no** dependen de que tengas la app abierta: el servidor consulta la
tabla `reminders` cada minuto y empuja la notificación al dispositivo.

---

## Puesta en marcha

### 1. Supabase

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. Abre **SQL Editor** y corre el contenido de [`supabase/schema.sql`](supabase/schema.sql).
   Crea las tablas, los disparadores que programan los avisos y las políticas
   de seguridad por usuario.
3. En **Project Settings → API** copia tres valores a tu `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (la secreta, solo servidor)
4. **Crea tu usuario a mano** en **Authentication → Users → Add user**, con
   *Auto Confirm User* marcado. Luego, en **Authentication → Sign In /
   Providers → Email**, apaga **Allow new users to sign up**: así nadie más
   puede registrarse cuando la app esté en internet. La pantalla de entrada no
   ofrece registro, solo login.
5. En **Database → Replication**, activa Realtime para la tabla `tasks` si
   quieres que un cambio en la laptop aparezca solo en el iPhone.

### 2. Variables de entorno

`.env.local` ya está creado con tus llaves VAPID y un `CRON_SECRET` generados.
Solo faltan los tres valores de Supabase. La referencia completa de cada
variable está en [`.env.example`](.env.example).

Si alguna vez necesitas regenerar las llaves de push:

```bash
npm run vapid
```

> Ojo: al cambiarlas, cada dispositivo tiene que volver a activar los avisos.

### 3. Correr en local

```bash
npm run dev
```

En `localhost` los avisos funcionan en Chrome, Edge y Firefox de escritorio.
Para probarlos en el iPhone necesitas HTTPS, es decir, desplegar primero.

### 4. Desplegar

```bash
npm i -g vercel
vercel
```

En Vercel, **Settings → Environment Variables**, carga las mismas variables de
`.env.local`. Vercel manda solo el `Authorization: Bearer $CRON_SECRET` a los
cron jobs, así que el despachador queda protegido sin configurar nada más.

### 5. El despachador cada minuto

[`vercel.json`](vercel.json) ya declara el cron `* * * * *`. **El plan gratuito
de Vercel solo permite un cron diario**, que no sirve para recordatorios. Dos
salidas:

- **Vercel Pro** — el `vercel.json` ya funciona tal cual.
- **Gratis, con [cron-job.org](https://cron-job.org)** — crea un job cada
  minuto contra `https://TU-APP.vercel.app/api/cron/dispatch`, con la cabecera
  `Authorization: Bearer <tu CRON_SECRET>`.

Puedes probar el despachador a mano:

```bash
curl -H "Authorization: Bearer TU_CRON_SECRET" https://TU-APP.vercel.app/api/cron/dispatch
```

### 6. Instalarla en el iPhone

1. Abre la URL en **Safari** (no en Chrome: iOS solo permite instalar desde Safari).
2. Compartir → **Añadir a pantalla de inicio**.
3. Abre AvisaPe **desde el ícono**, no desde Safari.
4. Toca **Activar avisos** y acepta el permiso.
5. Toca **Enviar prueba** y bloquea el teléfono: la notificación debe aparecer.

Mientras la app no esté instalada, AvisaPe te muestra las instrucciones en
pantalla en vez de fallar en silencio.

---

## Cómo se usa

- **Captura rápida:** escribe abajo y toca un atajo (*En 30 min*, *Hoy 6 p.m.*,
  *Mañana 9 a.m.*). Queda creado con aviso 10 minutos antes y a la hora.
- **Detalles:** el botón de la derecha abre día y hora exactos, tipo
  (tarea, reunión, sesión, pago), cuántos avisos quieres y si se repite.
- **La línea magenta** es dónde estás parado en el día. Lo de arriba ya pasó.
- **Posponer 10 min** desde el ícono del reloj, o desde la propia notificación.
- **Lo que se repite** genera su siguiente vuelta apenas lo marcas como listo.

---

## Estructura

```
app/
  page.tsx                    Pantalla principal (servidor)
  entrar/page.tsx             Login y registro
  api/push/subscribe/         Registra el dispositivo
  api/push/probar/            Aviso de prueba
  api/cron/dispatch/          Despachador, corre cada minuto
components/
  Riel.tsx                    Estado, agrupado por día, línea de ahora
  NodoPendiente.tsx           Cada pendiente sobre el riel
  Composer.tsx                Barra de captura rápida
  HojaDetalle.tsx             Crear y editar con todos los campos
  AvisosGate.tsx              Permisos de push y guía de instalación en iOS
lib/
  time.ts                     Cuentas regresivas, agrupado, recurrencia
  push.ts                     Envío VAPID
  supabase/                   Clientes de navegador, servidor y admin
supabase/schema.sql           Tablas, disparadores y políticas RLS
public/sw.js                  Service worker
scripts/                      Generadores de íconos y llaves VAPID
```

---

## Si más adelante quieres app nativa

El proyecto se puede envolver con [Capacitor](https://capacitorjs.com) sin
reescribir la interfaz. Para compilar y publicar en la App Store hacen falta
una Mac con Xcode (o un build en la nube) y la cuenta de Apple Developer de
99 USD al año. La PWA cubre lo mismo en notificaciones sin ninguno de los dos.
