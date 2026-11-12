# JGR Importaciones: tienda en línea

Tienda con carrito que envía el pedido completo por WhatsApp, y panel de administración con inicio de sesión por GitHub.

| | |
|---|---|
| **Tienda** | https://tienda.jgrimportaciones.workers.dev |
| **Panel** | https://tienda.jgrimportaciones.workers.dev/admin |
| **Repositorio** | https://github.com/Fervelop/jgr-importaciones |
| **WhatsApp de pedidos** | +57 302 6983562 |
| **Cloudflare** | Worker `tienda`, base de datos D1 `jgr-db`, imágenes R2 `jgr-imagenes`, subdominio `jgrimportaciones.workers.dev` |

---

## Cómo funciona: código y contenido viven en lugares distintos

Esto es lo más importante para trabajar en la tienda sin perder nada.

| | Dónde vive | Cómo se cambia | Cuándo se ve |
|---|---|---|---|
| **Contenido**: productos, precios, unidades, fotos, categorías, textos del inicio, colores, logo, pedidos | En Cloudflare: base de datos **D1** (`jgr-db`) y fotos en **R2** (`jgr-imagenes`) | Desde el panel `/admin` | Al instante, apenas guardas |
| **Código**: cómo funciona y cómo está hecha la tienda | En **GitHub** (este repositorio) | Editando archivos y con `git push` | En 1 o 2 minutos, cuando Cloudflare termina de publicar |

En la práctica:

- **Lo que cambias en `/admin` no va a GitHub** y no necesita ningún comando. Entras, cambias, guardas y listo, desde cualquier computador o celular.
- **Publicar código nuevo nunca borra el contenido.** La tienda siempre lee la misma base de datos de Cloudflare.
- **Si clonas el repositorio, no trae tus productos.** No los necesita para publicar. Solo verás datos de muestra si pruebas la tienda en tu computador (ver [Probar en tu computador](#probar-en-tu-computador)).
- **El contenido se respalda aparte**, con el comando de [Copias de seguridad](#copias-de-seguridad).

> Esto es distinto de un sitio con panel basado en Git (como Decap o Sveltia CMS), donde cada cambio del panel es un commit. Esta tienda guarda el contenido en una base de datos para que precios, unidades y pedidos cambien al instante.

---

## Uso diario: el panel `/admin`

Entra a https://tienda.jgrimportaciones.workers.dev/admin y presiona **Entrar con GitHub**.

Pueden entrar el dueño del repositorio (`Fervelop`) y los colaboradores con permiso de escritura. La sesión dura 12 horas.

| Sección | Para qué sirve |
|---|---|
| **Resumen** | Cifras de la tienda y últimos pedidos. |
| **Productos** | Tabla con búsqueda y filtros. Cambia precio, unidades, publicado y destacado sin abrir el producto. El editor completo incluye fotos (arrastrar y soltar; se optimizan solas), precio anterior, variantes con ajuste de precio, ficha técnica y vista previa del precio. Puedes duplicar y eliminar. |
| **Categorías** | Categorías principales y subcategorías (dos niveles), con imagen, orden y visibilidad. |
| **Pedidos** | Cada carrito enviado por WhatsApp queda registrado con un código (por ejemplo `JGR-261112-0042`) que también aparece en el mensaje. Estados: nuevo, confirmado, enviado, entregado, cancelado. |
| **Página de inicio** | Bloques plegables por sección: promociones (slides), razones para comprar, categorías, ofertas del día y su fecha de cierre, destacados, banners, colección de temporada, productos recientes, pasos, testimonios, preguntas y franja final. Cada sección se puede ocultar. |
| **Colores y logo** | Nombre, eslogan, logo y los 11 colores del modo claro y del oscuro, con vista previa y aviso si algo no se lee bien. |
| **Textos y páginas** | Testimonios, preguntas frecuentes, términos, privacidad y cambios y devoluciones. |
| **Tienda y contacto** | Número y mensajes de WhatsApp, medios de pago, redes sociales, contacto, datos para Google y estadísticas de visitas. |

**Consejos**
- Para que un producto salga en el inicio, márcalo como **Destacado**.
- Para que salga en **Ofertas del día**, llena su **Precio anterior** con un valor mayor que el precio de venta.
- Para la **colección de temporada**, crea una categoría (por ejemplo "Navidad"), muévele los productos y elígela en Página de inicio → Colección de temporada.
- Si dejas **Unidades disponibles** vacío, el producto se vende sin límite. Con `0` aparece agotado.
- Las fotos con fondo transparente (PNG o WEBP) se ven mejor en las tarjetas.

### Colaboradores

- **Dar acceso:** en GitHub ve al repositorio → **Settings → Collaborators → Add people**, con permiso **Write** o mayor. Cuando la persona acepte la invitación, ya puede entrar al panel.
- **Quitar acceso:** sácala de los colaboradores. Su sesión abierta se cierra sola en máximo 12 horas.
- **Acceso sin ser colaborador:** agrega su usuario de GitHub en `wrangler.jsonc`, dentro de `"vars"`, como `"ADMIN_USERS": "usuario1,usuario2"`, y sube el cambio.

---

## Cambiar el código

Solo hace falta para cambiar cómo funciona o cómo está hecha la tienda.

### En el computador donde ya tienes el proyecto

```powershell
git pull
# ...haz tus cambios en los archivos...
git add .
git commit -m "Describe el cambio"
git push
```

### En otro computador

```powershell
git clone https://github.com/Fervelop/jgr-importaciones.git
cd jgr-importaciones
npm install
```

### Publicación automática

La publicación automática está activa: el repositorio está conectado en Cloudflare (Worker **tienda** → **Settings → Builds**) y **cada `git push` a `main` se publica solo**. Para revisarlo:

1. `git status` debe decir `nothing to commit, working tree clean` y `up to date with 'origin/main'`.
2. En GitHub, el último commit aparece arriba de la lista de archivos.
3. En Cloudflare (**Workers y Pages → tienda → Deployments**) aparece una publicación con el mismo mensaje del commit. **Success** significa que ya está en línea; si dice **Failed**, abre la publicación y revisa el registro.

Si la publicación automática falla, puedes publicar a mano:

```powershell
npx wrangler login
npm run deploy
```

> Lo que esté en `wrangler.jsonc` (repositorio, Client ID, permisos de GitHub) reemplaza lo que cambies a mano en el panel de Cloudflare en cada publicación. Esos valores se cambian en el archivo y se suben con `git push`.

---

## Copias de seguridad

El contenido de la tienda no está en GitHub. Respáldalo cada semana y antes de cambios grandes:

```powershell
npx wrangler d1 export jgr-db --remote --output=respaldo-AAAA-MM-DD.sql
```

- Guarda el archivo fuera del proyecto (en tu computador o en Drive). **No lo subas a GitHub**: incluye datos de clientes de los pedidos.
- Las fotos quedan en R2 (`jgr-imagenes`). Las que quitas de un producto no se borran, así que no se pierden si te equivocas.

**Restaurar** un respaldo en la tienda real es solo para emergencias. El archivo trae las tablas completas, así que primero hay que vaciar la base de datos, y eso borra el contenido actual. Hazlo con ayuda y después de sacar un respaldo nuevo.

---

## Probar en tu computador

```powershell
copy .dev.vars.example .dev.vars
npm run db:init:local
npm run dev
```

- Abre http://localhost:8787. En http://localhost:8787/admin aparece **Entrar en modo local**, que solo funciona en tu computador.
- Esta prueba usa una base de datos **local** con productos de muestra. Lo que hagas ahí no afecta la tienda real.

**Probar con los datos reales** (se copian hacia tu computador, sin tocar la tienda):

```powershell
npx wrangler d1 export jgr-db --remote --output=respaldo.sql
Remove-Item -Recurse -Force .wrangler
npx wrangler d1 execute jgr-db --local --file=respaldo.sql
npm run dev
```

Las fotos subidas no se copian, así que en local algunas imágenes se verán vacías.

### Pruebas automáticas

```powershell
npm test               # lógica del carrito, mensaje de WhatsApp, sesiones, permisos y validaciones
npm run typecheck      # revisión de tipos
```

Con `npm run dev` funcionando, en otra terminal:

```powershell
$env:TEST_BASE_URL="http://localhost:8787"; npm run test:integracion
```

---

## Antes de abrir la tienda al público

Todo esto se cambia desde el panel:

- [ ] Reemplazar los **37 productos de muestra** por los tuyos, o eliminarlos. Sus imágenes dicen "Imagen de muestra".
- [ ] Reemplazar las **imágenes de categorías y subcategorías** (Categorías → editar → Imagen de portada).
- [ ] Cambiar las **imágenes y textos de las promociones** (Página de inicio → Promociones principales).
- [ ] Reemplazar los **testimonios de ejemplo** por opiniones reales, o apagar la sección.
- [ ] Revisar con tu asesor los **términos, privacidad y devoluciones** (Textos y páginas). Los textos incluidos son de ejemplo.
- [ ] Confirmar que la **barra de aviso**, las **razones para comprar** y los **banners** dicen lo que de verdad ofreces (por ejemplo, envíos a toda Colombia o compras al por mayor).
- [ ] Ajustar la **colección de temporada** a una categoría real.
- [ ] Agregar las **redes sociales** y, si quieres, el correo (Tienda y contacto).
- [ ] Activar las **estadísticas de visitas**: en Cloudflare ve a **Analytics y registros → Web Analytics → Agregar sitio**, copia el token y pégalo en Tienda y contacto → Estadísticas de visitas.

---

## Configuración actual (referencia)

### `wrangler.jsonc`

| Campo | Valor | Nota |
|---|---|---|
| `name` | `tienda` | Define la dirección `tienda.jgrimportaciones.workers.dev`. |
| `d1_databases` | binding **`DB`**, `jgr-db`, id `48676e34-…` | El binding debe llamarse `DB`. |
| `r2_buckets` | binding **`IMAGES`**, `jgr-imagenes` | Si se borra este bloque, las fotos nuevas se guardan en D1. |
| `GITHUB_REPO` | `Fervelop/jgr-importaciones` | Sus colaboradores con permiso de escritura entran al panel. |
| `GITHUB_CLIENT_ID` | El de la OAuth App | No es secreto. |
| `GITHUB_SCOPE` | `read:user` si el repositorio es público; `repo` si es privado | GitHub exige `repo` para revisar permisos en repositorios privados. |
| `ADMIN_USERS` (opcional) | `usuario1,usuario2` | Acceso extra sin ser colaborador. |

### Secretos (guardados en Cloudflare, nunca en el código)

| Secreto | Para qué |
|---|---|
| `GITHUB_CLIENT_SECRET` | Secreto de la OAuth App de GitHub. |
| `SESSION_SECRET` | Firma las sesiones del panel (32 caracteres o más). |

Para cambiarlos:

```powershell
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
```

Para generar un `SESSION_SECRET` nuevo, ejecuta el comando de abajo. Cambiarlo cierra todas las sesiones abiertas del panel.

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### OAuth App de GitHub

En GitHub: **Settings → Developer settings → OAuth Apps → Panel JGR Importaciones**.

- **Homepage URL:** `https://tienda.jgrimportaciones.workers.dev`
- **Authorization callback URL:** `https://tienda.jgrimportaciones.workers.dev/auth/callback`

Si cambia la dirección de la tienda (por ejemplo, con un dominio propio), actualiza estas dos URL.

---

## Dominio propio (más adelante)

1. Compra el dominio y agrégalo a tu cuenta de Cloudflare.
2. En **Workers y Pages → tienda → Settings → Domains & Routes**, agrega el dominio.
3. Actualiza la **Homepage URL** y la **Authorization callback URL** de la OAuth App de GitHub con el dominio nuevo.

---

## Solución de problemas

| Problema | Qué hacer |
|---|---|
| `npx wrangler login` da **"No CSRF value available in the session cookie"** | Entra primero a dash.cloudflare.com en tu navegador habitual. Luego ejecuta `npx wrangler login`, pega el enlace en la **barra de direcciones** de ese navegador (no en la terminal) y autoriza de inmediato. Si sigue fallando, usa un token: `$env:CLOUDFLARE_API_TOKEN="..."` y `$env:CLOUDFLARE_ACCOUNT_ID="..."`. |
| Wrangler pregunta **"Would you like Wrangler to add it on your behalf?"** al crear D1 o R2 | Responde **no**. El archivo ya trae la configuración con los nombres correctos (`DB` e `IMAGES`). |
| La tienda muestra **"There is nothing here yet"** | El Worker no está publicado con ese nombre o la dirección aún se está activando. Revisa que `name` sea `tienda`, ejecuta `npm run deploy` y espera unos minutos. |
| La tienda dice que **la base de datos no está inicializada** | Ejecuta `npm run db:schema:remote` (crea las tablas sin borrar nada). |
| **"R2 bucket not found"** al publicar | Crea el bucket (`npx wrangler r2 bucket create jgr-imagenes`) o borra el bloque `r2_buckets` de `wrangler.jsonc`. |
| El panel dice que **falta configurar el inicio de sesión** | Revisa `GITHUB_CLIENT_ID` en `wrangler.jsonc` y los secretos `GITHUB_CLIENT_SECRET` y `SESSION_SECRET`. |
| El panel dice que **tu cuenta no tiene permiso** | La cuenta de GitHub debe ser la dueña del repositorio o colaboradora con permiso Write. Si el repositorio es privado, `GITHUB_SCOPE` debe ser `repo`. |
| **Error al conectar el repositorio** en Cloudflare Builds | La aplicación **Cloudflare Workers and Pages** ya está instalada en la cuenta **Fervelop** (la usa también **joha-jw.pages.dev**). **No la desinstales**: en GitHub ve a **Settings → Applications → Installed GitHub Apps → Cloudflare Workers and Pages → Configure** y agrega el repositorio en **Repository access**. Al conectar, elige la cuenta **Fervelop**, no una organización. |

> **Cuidado con `npm run db:init:remote`:** borra los productos y categorías y vuelve a cargar los de muestra. Solo se usó una vez, al empezar. Para crear tablas que falten sin borrar nada, usa `npm run db:schema:remote`.

---

## Costos

Todo funciona dentro de los planes gratuitos de Cloudflare para una tienda pequeña o mediana. Activar R2 puede pedir un medio de pago, pero no cobra mientras el uso se mantenga dentro de lo gratuito. Revisa tu consumo en el panel de Cloudflare. Si prefieres no usar R2, borra el bloque `r2_buckets` de `wrangler.jsonc` y las fotos nuevas se guardarán en D1.

---

## Estructura del proyecto

```
src/
  index.ts              rutas de la tienda, del panel, de imágenes y del inicio de sesión
  lib/                  base de datos, ajustes editables, sesión y permisos de GitHub
  routes/               API pública (carrito, pedidos) y API del panel
  views/                páginas de la tienda (HTML generado en el servidor)
public/
  assets/css/site.css   estilos de la tienda
  assets/js/site.js     carrito, modo oscuro, slides, cuenta regresiva y envío a WhatsApp
  assets/js/order.js    cálculo del carrito y del mensaje (lo usan la tienda y las pruebas)
  admin-app/            panel de administración
  marca/                logo, ícono y la imagen para compartir en redes
  muestras/             imágenes de muestra
db/
  schema.sql            tablas (se puede ejecutar sin borrar nada)
  seed.sql              datos de muestra (borra productos y categorías)
scripts/build-seed.mjs  genera los datos y las imágenes de muestra
tests/                  pruebas automáticas
DESIGN.md               sistema visual (colores, tipografía, formas)
wrangler.jsonc          configuración de Cloudflare
```

La fuente Nunito está incluida bajo la licencia SIL Open Font License (ver `public/assets/fonts`).