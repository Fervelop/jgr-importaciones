import { html, raw } from 'hono/html';
import type { Settings, ThemeTokens } from '../lib/defaults';
import type { CategoryTree } from '../lib/db';
import { jsonForScript, safeLink } from '../lib/util';
import { icon } from './icons';

export type ViewCtx = {
  settings: Settings;
  tree: CategoryTree[];
  path: string;
  origin: string;
};

export type PageMeta = {
  title?: string;
  description?: string;
  image?: string;
  canonical?: string;
  noindex?: boolean;
  jsonLd?: unknown;
};

function tokenCss(t: ThemeTokens) {
  return [
    `--bg:${t.bg}`,
    `--surface:${t.surface}`,
    `--ink:${t.ink}`,
    `--muted:${t.muted}`,
    `--line:${t.line}`,
    `--gold:${t.gold}`,
    `--gold-text:${t.goldText}`,
    `--sale:${t.sale}`,
    `--btn:${t.button}`,
    `--btn-text:${t.buttonText}`,
    `--on-gold:${t.onGold}`,
  ].join(';');
}

export function themeStyle(s: Settings) {
  // Los colores ya vienen validados como hexadecimales (settings.ts), así que es seguro incrustarlos.
  return raw(
    `<style id="jgr-theme">:root{${tokenCss(s.theme.light)};color-scheme:light}` +
      `:root[data-theme="dark"]{${tokenCss(s.theme.dark)};color-scheme:dark}</style>`,
  );
}

const SOCIALS: { key: keyof Settings['social']; label: string }[] = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
];

export function waChatUrl(s: Settings, text = '') {
  const n = s.store.whatsapp.replace(/\D/g, '');
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function layout(ctx: ViewCtx, meta: PageMeta, body: unknown) {
  const s = ctx.settings;
  const title = meta.title ? `${meta.title} | ${s.brand.name}` : s.seo.title;
  const description = meta.description || s.seo.description;
  const canonical = `${ctx.origin}${meta.canonical || ctx.path}`;
  const image = meta.image
    ? meta.image.startsWith('http')
      ? meta.image
      : `${ctx.origin}${meta.image}`
    : `${ctx.origin}/marca/compartir.jpg`;
  const config = {
    whatsapp: s.store.whatsapp,
    greeting: s.store.orderGreeting,
    closing: s.store.orderClosing,
    shippingNote: s.store.shippingNote,
    payments: s.payments,
    askCustomerData: s.store.askCustomerData,
    lowStock: s.store.lowStockThreshold,
  };
  const socials = SOCIALS.filter((x) => safeLink(s.social[x.key]));

  return html`<!doctype html>
<html lang="es-CO" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${canonical}">
${meta.noindex ? raw('<meta name="robots" content="noindex">') : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${s.brand.name}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="${s.theme.light.bg}" id="meta-theme">
<link rel="icon" href="/marca/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/marca/apple-touch-icon.png">
<script>try{var t=localStorage.getItem('jgr-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}</script>
<link rel="preload" href="/assets/fonts/nunito-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/fonts.css">
<link rel="stylesheet" href="/assets/css/site.css?v=2">
${themeStyle(s)}
${meta.jsonLd ? raw(`<script type="application/ld+json">${jsonForScript(meta.jsonLd)}</script>`) : ''}
</head>
<body>
<a class="skip" href="#contenido">Saltar al contenido</a>
${s.store.announcement ? html`<div class="aviso">${s.store.announcement}</div>` : ''}
<header class="cabecera" id="cabecera">
  <div class="cabecera__in">
    <button class="icon-btn solo-movil" type="button" data-open="menu" aria-label="Abrir menú" aria-controls="menu" aria-expanded="false">${icon('menu', 24)}</button>
    <a class="marca" href="/" aria-label="${s.brand.name}, ir al inicio">
      <img src="${s.brand.logo}" alt="" width="52" height="47" decoding="async">
      <span class="marca__texto"><span class="marca__nombre">${s.brand.name}</span><span class="marca__lema">${s.brand.slogan}</span></span>
    </a>
    <form class="buscador" action="/buscar" method="get" role="search">
      <label class="sr" for="q-cabecera">Buscar productos</label>
      <input id="q-cabecera" name="q" type="search" placeholder="¿Qué estás buscando?" autocomplete="off" enterkeyhint="search">
      <button type="submit" aria-label="Buscar">${icon('search', 20)}</button>
    </form>
    <div class="cabecera__acciones">
      <button class="icon-btn" type="button" data-theme-toggle aria-pressed="false" aria-label="Activar modo oscuro">
        <span class="t-sol">${icon('sun', 22)}</span><span class="t-luna">${icon('moon', 22)}</span>
      </button>
      <button class="carrito-btn" type="button" data-open="carrito" aria-controls="carrito" aria-label="Abrir carrito, 0 productos">
        ${icon('bag', 22)}<span class="carrito-btn__txt">Carrito</span><span class="carrito-btn__n" data-cart-count hidden>0</span>
      </button>
    </div>
  </div>
  <nav class="nav" aria-label="Categorías">
    <ul>
      <li><a class="nav__ofertas" href="/ofertas" ${ctx.path === '/ofertas' ? raw('aria-current="page"') : ''}>${icon('tag', 18)} Ofertas</a></li>
      ${ctx.tree.map(
        (c) =>
          html`<li><a href="/categoria/${c.slug}" ${ctx.path.startsWith(`/categoria/${c.slug}`) ? raw('aria-current="page"') : ''}>${c.name}</a></li>`,
      )}
      <li><a href="/destacados" ${ctx.path === '/destacados' ? raw('aria-current="page"') : ''}>Destacados</a></li>
    </ul>
  </nav>
</header>

<main id="contenido">
${body}
</main>

<footer class="pie">
  <div class="pie__in">
    <div class="pie__marca">
      <img src="${s.brand.logo}" alt="${s.brand.name}" width="96" height="86" loading="lazy" decoding="async">
      <p class="pie__lema">${s.brand.slogan}</p>
      ${socials.length
        ? html`<ul class="redes" aria-label="Redes sociales">${socials.map(
            (x) => html`<li><a href="${s.social[x.key]}" target="_blank" rel="noopener" aria-label="${x.label}">${icon(x.key, 20)}</a></li>`,
          )}</ul>`
        : ''}
    </div>
    <nav class="pie__col" aria-label="Categorías">
      <h2>Tienda</h2>
      <ul>${ctx.tree.map((c) => html`<li><a href="/categoria/${c.slug}">${c.name}</a></li>`)}</ul>
    </nav>
    <nav class="pie__col" aria-label="Información">
      <h2>Ayuda</h2>
      <ul>
        <li><a href="/preguntas-frecuentes">Preguntas frecuentes</a></li>
        <li><a href="/cambios-y-devoluciones">Cambios y devoluciones</a></li>
        <li><a href="/terminos">Términos y condiciones</a></li>
        <li><a href="/privacidad">Política de privacidad</a></li>
      </ul>
    </nav>
    <div class="pie__col">
      <h2>Contacto</h2>
      <ul>
        <li><a href="${waChatUrl(s)}" target="_blank" rel="noopener">${icon('whatsapp', 18)} WhatsApp</a></li>
        ${s.contact.email ? html`<li><a href="mailto:${s.contact.email}">${icon('mail', 18)} ${s.contact.email}</a></li>` : ''}
        ${s.contact.location ? html`<li>${icon('pin', 18)} ${s.contact.location}</li>` : ''}
        ${s.contact.hours ? html`<li>${icon('clock', 18)} ${s.contact.hours}</li>` : ''}
      </ul>
      ${s.payments.length
        ? html`<h2 class="pie__pagos-t">Medios de pago</h2><p class="pie__pagos">${s.payments.join(', ')}.</p>`
        : ''}
    </div>
  </div>
  <p class="pie__legal">© ${new Date().getFullYear()} ${s.brand.name}. Precios en pesos colombianos con impuestos incluidos.</p>
</footer>

<dialog class="hoja hoja--izq" id="menu" aria-label="Menú">
  <div class="hoja__cab">
    <span class="hoja__titulo">Menú</span>
    <button class="icon-btn" type="button" data-close aria-label="Cerrar menú">${icon('close', 22)}</button>
  </div>
  <form class="buscador buscador--hoja" action="/buscar" method="get" role="search">
    <label class="sr" for="q-menu">Buscar productos</label>
    <input id="q-menu" name="q" type="search" placeholder="Buscar productos" enterkeyhint="search">
    <button class="icon-btn" type="submit" aria-label="Buscar">${icon('search', 20)}</button>
  </form>
  <nav aria-label="Categorías del menú">
    <ul class="menu-lista">
      <li><a class="menu-lista__principal" href="/ofertas">Ofertas</a></li>
      ${ctx.tree.map(
        (c) => html`<li>
          <a class="menu-lista__principal" href="/categoria/${c.slug}">${c.name}</a>
          ${c.children.length
            ? html`<ul>${c.children.map((k) => html`<li><a href="/categoria/${k.slug}">${k.name}</a></li>`)}</ul>`
            : ''}
        </li>`,
      )}
    </ul>
  </nav>
</dialog>

<dialog class="hoja hoja--der" id="carrito" aria-labelledby="carrito-titulo">
  <div class="hoja__cab">
    <h2 class="hoja__titulo" id="carrito-titulo">Tu carrito</h2>
    <button class="icon-btn" type="button" data-close aria-label="Cerrar carrito">${icon('close', 22)}</button>
  </div>
  <div class="carrito" data-cart-root>
    <div class="carrito__vacio" data-cart-empty>
      <p class="carrito__vacio-t">Tu carrito está vacío.</p>
      <p>Explora las vitrinas y agrega lo que te guste.</p>
      <a class="btn btn--linea" href="/#categorias" data-close>Ver categorías</a>
    </div>
    <div class="carrito__aviso" data-cart-notice hidden role="status"></div>
    <ul class="carrito__lista" data-cart-list></ul>
    <form class="carrito__pie" data-cart-form hidden novalidate>
      <div class="carrito__total">
        <span>Total productos</span>
        <strong data-cart-total>$ 0</strong>
      </div>
      <p class="carrito__nota">${s.store.shippingNote}</p>
      ${s.store.askCustomerData
        ? html`<details class="datos" open>
            <summary>Tus datos para el envío <span>(opcional)</span></summary>
            <div class="datos__campos">
              <label>Nombre<input name="name" autocomplete="name" maxlength="80"></label>
              <label>Ciudad<input name="city" autocomplete="address-level2" maxlength="80"></label>
              <label class="ancho">Dirección<input name="address" autocomplete="street-address" maxlength="160"></label>
              <label class="ancho">Medio de pago preferido
                <select name="payment">
                  <option value="">Lo decido en WhatsApp</option>
                  ${s.payments.map((p) => html`<option>${p}</option>`)}
                </select>
              </label>
              <label class="ancho">Nota<textarea name="note" rows="2" maxlength="300" placeholder="Ej.: horario de entrega, punto de referencia"></textarea></label>
            </div>
          </details>`
        : ''}
      <button class="btn btn--wa" type="submit" data-cart-send>${icon('whatsapp', 22)} Enviar pedido por WhatsApp</button>
      <p class="carrito__seguro">${icon('shield', 16)} No pagas nada todavía: primero confirmamos tu pedido contigo.</p>
    </form>
  </div>
</dialog>

<div class="aviso-flotante" data-toast role="status" aria-live="polite" hidden></div>
<script type="application/json" id="jgr-config">${raw(jsonForScript(config))}</script>
<script type="module" src="/assets/js/site.js?v=2"></script>
${s.analytics.cloudflareToken
  ? raw(
      `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${s.analytics.cloudflareToken}"}'></script>`,
    )
  : ''}
</body>
</html>`;
}
