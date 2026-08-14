// Genera el par de llaves VAPID que firma cada push.
// Uso: npm run vapid
import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log(`
Pega esto en tu .env.local (y en las variables de entorno de Vercel):

NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}
VAPID_PRIVATE_KEY=${privateKey}

La privada no se comparte ni se sube al repo. Si la cambias, todos los
dispositivos tienen que volver a activar los avisos.
`);
