# JGR Importaciones: tienda en línea

Tienda con carrito que envía el pedido completo por WhatsApp, y panel de administración en `/admin` con inicio de sesión por GitHub. Funciona en Cloudflare: **Workers** (sitio), **D1** (base de datos) y **R2** (imágenes). Todo lo que cambias en el panel se ve en la tienda apenas guardas.

## Qué incluye

**Tienda**
- Inicio tipo marketplace: promociones principales que rotan (slides), franja de confianza, cuadrícula de categorías con foto, ofertas del día con cuenta regresiva, destacados en tarjetas inclinadas, banners promocionales, colección de temporada, productos recientes, pasos de compra, testimonios, preguntas frecuentes y franja final. Todo se edita y se puede ocultar desde el panel.
- Página de ofertas con todos los productos en descuento.
- Páginas de categoría con subcategorías, búsqueda, orden por precio o nombre y paginación.
- Página de producto con galería de varias fotos, precio, precio anterior tachado, precio de oferta destacado, unidades disponibles, marca de agotado, variantes (color, tamaño…) con ajuste de precio y ficha técnica.
- Carrito que se guarda en el dispositivo del cliente. Al enviarlo, abre WhatsApp al **+57 302 6983562** con cada producto, variante, cantidad, precio unitario, subtotal, total, la nota de que el envío se confirma por WhatsApp y, si el cliente quiere, su nombre, ciudad, dirección y medio de pago.
- Antes de enviar, la tienda revisa precios y unidades en la base de datos, para que nadie altere el precio desde su navegador.
- Modo claro (siempre por defecto) y modo oscuro con un botón.
- Páginas de términos, privacidad, cambios y devoluciones y preguntas frecuentes. Mapa del sitio para Google.

**Panel `/admin`**
- **Resumen**: cifras de la tienda y últimos pedidos.
- **Productos**: tabla con búsqueda y filtros; cambia precio, unidades, publicado y destacado sin abrir el producto. Editor completo con fotos (arrastrar y soltar, se optimizan solas), variantes, ficha técnica y vista previa del precio. Duplicar y eliminar.
- **Categorías**: categorías principales y subcategorías, con imagen de portada, orden y visibilidad.
- **Pedidos**: cada carrito enviado queda registrado con su código (por ejemplo `JGR-261112-0042`), que también aparece en el mensaje de WhatsApp. Cambia su estado: nuevo, confirmado, enviado, entregado o cancelado.
- **Página de inicio**: promociones (slides) con imagen y botón, razones para comprar, ofertas del día y su fecha de cierre, destacados, banners, colección de temporada (eliges la categoría), pasos, títulos y qué secciones mostrar. Cada sección es un bloque que se abre y se cierra.
- **Colores y logo**: nombre, eslogan, logo y los 11 colores de cada modo, con vista previa y aviso si algo no se lee bien.
- **Textos y páginas**: testimonios, preguntas frecuentes y páginas legales.
- **Tienda y contacto**: número y mensajes de WhatsApp, medios de pago, redes sociales, contacto, datos para Google y estadísticas de visitas.

## Lo que necesitas

- Una cuenta de [Cloudflare](https://dash.cloudflare.com/sign-up) (el plan gratuito alcanza para empezar).
- Una cuenta de [GitHub](https://github.com).
- [Node.js](https://nodejs.org) versión 20 o más reciente instalado en tu computador.

## Publicar la tienda paso a paso

Abre una terminal en la carpeta del proyecto (la que tiene este archivo).

### 1. Instalar

```bash
npm install
```

### 2. Subir el código a GitHub

Crea un repositorio nuevo en GitHub, por ejemplo `jgr-importaciones` (puede ser privado), y sube esta carpeta:

```bash
git init
git add .
git commit -m "Tienda JGR Importaciones"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/jgr-importaciones.git
git push -u origin main
```

Este repositorio también decide **quién entra al panel**: tú (el dueño) y los colaboradores que invites con permiso de escritura.

### 3. Conectar tu cuenta de Cloudflare

```bash
npx wrangler login
```

Se abre el navegador para que autorices el acceso.

### 4. Crear la base de datos y el espacio para imágenes

```bash
npx wrangler d1 create jgr-db
```

Copia el `database_id` que aparece y pégalo en `wrangler.jsonc`, en lugar de `REEMPLAZAR_CON_EL_ID_DE_TU_BASE_D1`.

```bash
npx wrangler r2 bucket create jgr-imagenes
```

Si Cloudflare te pide activar R2, hazlo desde el panel de Cloudflare (sección R2) y vuelve a ejecutar el comando.

### 5. Cargar las tablas y los productos de muestra

```bash
npm run db:init:remote
```

> **Importante:** este comando borra los productos y categorías y vuelve a cargar los de muestra. Úsalo **solo la primera vez**. Si más adelante solo necesitas actualizar las tablas, usa `npm run db:schema:remote`, que no borra nada.

### 6. Primera publicación

```bash
npm run deploy
```

Al final verás la dirección de tu tienda, algo como `https://jgr-importaciones.TU-SUBDOMINIO.workers.dev`. Ábrela: la tienda ya funciona. Falta el panel.

### 7. Crear la aplicación de GitHub para entrar al panel

1. En GitHub ve a **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Llena:
   - **Application name**: `Panel JGR Importaciones`
   - **Homepage URL**: la dirección de tu tienda, por ejemplo `https://jgr-importaciones.TU-SUBDOMINIO.workers.dev`
   - **Authorization callback URL**: la misma dirección terminada en `/auth/callback`
3. Presiona **Register application**. Copia el **Client ID** y luego presiona **Generate a new client secret** y copia el secreto (solo se muestra una vez).

### 8. Configurar el panel

En `wrangler.jsonc`, dentro de `"vars"`:

- `GITHUB_REPO`: tu usuario y repositorio, por ejemplo `"TU_USUARIO/jgr-importaciones"`.
- `GITHUB_CLIENT_ID`: el Client ID del paso 7.
- `GITHUB_SCOPE`: déjalo en `"read:user"` si el repositorio es **público**. Si es **privado**, cámbialo a `"repo"`: GitHub lo exige para poder revisar que tienes permiso sobre un repositorio privado. El panel solo usa ese permiso para la revisión al entrar y no lo guarda.

Guarda los dos secretos (te los pedirá la terminal, uno por uno):

```bash
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
```

Para `SESSION_SECRET` pega una cadena larga y aleatoria. Puedes generar una con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Publica de nuevo:

```bash
npm run deploy
```

Entra a `https://TU-TIENDA.workers.dev/admin` y presiona **Entrar con GitHub**.

### 9. Invitar colaboradores

En el repositorio de GitHub: **Settings → Collaborators → Add people**. Quien acepte la invitación con permiso **Write** (o mayor) puede entrar al panel. Para quitarle el acceso, sácalo de los colaboradores (su sesión abierta dura como máximo 12 horas).

Si quieres dar acceso a alguien sin hacerlo colaborador, agrega su usuario de GitHub en `wrangler.jsonc` como `"ADMIN_USERS": "usuario1,usuario2"` y publica de nuevo.

## Antes de abrir la tienda al público

Todo esto se cambia desde el panel:

- [ ] Reemplazar los **productos de muestra** por los tuyos (o eliminarlos). Las imágenes dicen "Imagen de muestra".
- [ ] Reemplazar las **imágenes de muestra de las categorías y subcategorías** (Categorías → editar → Imagen de portada). Para la cuadrícula del inicio funcionan mejor fotos de producto con fondo transparente.
- [ ] Cambiar las **imágenes de las promociones** del inicio (Página de inicio → Promociones principales).
- [ ] Ajustar la **colección de temporada**: por ejemplo, crea la categoría "Navidad" y elígela en Página de inicio → Colección de temporada.
- [ ] Reemplazar los **testimonios de ejemplo** por opiniones reales, o apagar la sección (Página de inicio → Mostrar testimonios).
- [ ] Revisar con tu asesor los **términos, privacidad y devoluciones** (Textos y páginas). Los textos incluidos son de ejemplo.
- [ ] Revisar la **barra de aviso** ("Envíos a toda Colombia…") y las **razones para comprar**, que confirmen lo que de verdad ofreces.
- [ ] Agregar tus **redes sociales** y, si quieres, tu correo (Tienda y contacto).
- [ ] Activar las **estadísticas de visitas**: en Cloudflare ve a **Analytics y registros → Web Analytics → Agregar sitio**, copia el token y pégalo en Tienda y contacto → Estadísticas de visitas.

## Trabajar en tu computador

```bash
cp .dev.vars.example .dev.vars
npm run db:init:local
npm run dev
```

Abre `http://localhost:8787`. En `http://localhost:8787/admin` aparece **Entrar en modo local**, que solo funciona en tu computador (en Cloudflare no existe).

## Pruebas

```bash
npm test                 # lógica del carrito, mensaje de WhatsApp, sesiones, permisos y validaciones
npm run typecheck        # revisión de tipos
```

Con `npm run dev` funcionando, en otra terminal:

```bash
TEST_BASE_URL=http://localhost:8787 npm run test:integracion
```

Prueba las páginas, los pedidos (precios recalculados, variantes inválidas, agotados, unidades), la seguridad del panel, la edición de productos, categorías, colores y textos, y la subida de imágenes.

## Publicación automática (opcional)

En Cloudflare puedes conectar el repositorio para que cada cambio que subas a GitHub se publique solo: **Workers y Pages → jgr-importaciones → Configuración → Compilaciones → Conectar**. El contenido de la tienda (productos, textos, colores) vive en la base de datos, así que no se pierde al publicar código nuevo.

## Dominio propio (más adelante)

Cuando compres tu dominio, agrégalo en Cloudflare y en **Workers y Pages → jgr-importaciones → Configuración → Dominios y rutas** añade el dominio. Luego actualiza en tu OAuth App de GitHub la Homepage URL y la Authorization callback URL con el dominio nuevo.

## Copias de seguridad

```bash
npx wrangler d1 export jgr-db --remote --output=respaldo.sql
```

Guarda ese archivo en un lugar seguro. Las imágenes quedan en R2 (`jgr-imagenes`); las que quitas de un producto no se borran de R2, así que no se pierden si te equivocas.

## Estructura del proyecto

```
src/
  index.ts              rutas de la tienda, del panel y del inicio de sesión
  lib/                  base de datos, ajustes editables, sesión y permisos de GitHub
  routes/               API pública (carrito, pedidos) y API del panel
  views/                páginas de la tienda (HTML generado en el servidor)
public/
  assets/css/site.css   estilos de la tienda
  assets/js/site.js     carrito, modo oscuro, galería y envío a WhatsApp
  assets/js/order.js    cálculo del carrito y del mensaje (lo usan la tienda y las pruebas)
  admin-app/            panel de administración
  marca/                logo, ícono y la imagen para compartir en redes
  muestras/             imágenes de muestra
db/                     tablas y datos de muestra
scripts/build-seed.mjs  genera los datos y las imágenes de muestra
tests/                  pruebas automáticas
DESIGN.md               sistema visual (colores, tipografía, formas)
```

La fuente Nunito está incluida en el proyecto bajo la licencia SIL Open Font License (ver `public/assets/fonts`).
