import { html, raw } from 'hono/html';
import type { Category, Product } from '../lib/db';
import type { Banner, Slide } from '../lib/defaults';
import { discountPercent, formatCOP, simpleMarkdown } from '../lib/util';
import { cartPayload, escapeAttrJson, productTile } from './components';
import { icon } from './icons';
import { layout, waChatUrl, type ViewCtx } from './layout';

export type HomeData = {
  featured: Product[];
  offers: Product[];
  seasonal: { products: Product[]; category: Category | null };
  discover: Product[];
  tiles: Category[];
};

function hrefOf(ctx: ViewCtx, link: string) {
  if (link === 'whatsapp') return waChatUrl(ctx.settings, 'Hola, quiero información:');
  return link || '#';
}
const isExternal = (link: string) => link === 'whatsapp' || link.startsWith('https://');

function slide(ctx: ViewCtx, s: Slide, i: number, total: number) {
  return html`<li class="slide slide--${s.style}" id="slide-${i + 1}" role="group" aria-roledescription="diapositiva" aria-label="${i + 1} de ${total}">
    <div class="slide__texto">
      ${i === 0 ? html`<h1 class="slide__titulo">${s.title}</h1>` : html`<h2 class="slide__titulo">${s.title}</h2>`}
      ${s.subtitle ? html`<p class="slide__sub">${s.subtitle}</p>` : ''}
      ${s.buttonText
        ? html`<a class="btn btn--slide" href="${hrefOf(ctx, s.link)}" ${raw(isExternal(s.link) ? 'target="_blank" rel="noopener"' : '')}>${s.buttonText}</a>`
        : ''}
    </div>
    ${s.image
      ? html`<div class="slide__img"><img src="${s.image}" alt="" width="640" height="480" ${raw(i === 0 ? 'fetchpriority="high"' : 'loading="lazy"')} decoding="async"></div>`
      : ''}
  </li>`;
}

/** Encabezado de una fila con título, enlace y flechas. */
function rowHead(id: string, title: string, sub: string, more?: { href: string; label: string }, arrows = true) {
  return html`<div class="fila__cab">
    <div>
      <h2 class="titulo" id="${id}">${title}</h2>
      ${sub ? html`<p class="fila__sub">${sub}</p>` : ''}
    </div>
    <div class="fila__acc">
      ${more ? html`<a class="fila__mas" href="${more.href}">${more.label}</a>` : ''}
      ${arrows
        ? html`<button class="flecha" type="button" data-scroll="-1" aria-label="Ver anteriores">${icon('chevronLeft', 20)}</button>
            <button class="flecha" type="button" data-scroll="1" aria-label="Ver siguientes">${icon('chevronRight', 20)}</button>`
        : ''}
    </div>
  </div>`;
}

/** Tarjeta inclinada de la sección de destacados. */
function showcaseCard(p: Product) {
  const img = p.images[0];
  const pct = discountPercent(p.price, p.compareAtPrice);
  return html`<li class="exhibidor">
    <div class="exhibidor__tarjeta">
      <span class="exhibidor__cuenta" data-in-cart="${p.id}" hidden>${icon('bag', 18)}<span>0</span></span>
      ${pct > 0 ? html`<span class="insignia insignia--oferta">-${pct}%</span>` : ''}
      <a class="exhibidor__foto" href="/producto/${p.slug}" tabindex="-1" aria-hidden="true">
        ${img ? html`<img src="${img.url}" alt="" width="600" height="600" loading="lazy" decoding="async">` : ''}
      </a>
    </div>
    <div class="exhibidor__info">
      <h3><a href="/producto/${p.slug}">${p.name}</a></h3>
      <p class="exhibidor__precio"><strong class="${pct ? 'es-oferta' : ''}">${formatCOP(p.price)}</strong>${pct ? html` <s>${formatCOP(p.compareAtPrice!)}</s>` : ''}</p>
      ${p.options.length
        ? html`<a class="btn btn--sm btn--linea" href="/producto/${p.slug}">Elegir opciones</a>`
        : html`<button class="btn btn--sm btn--oro" type="button" data-add='${raw(escapeAttrJson(cartPayload(p)))}'>${icon('plus', 16)} Añadir</button>`}
    </div>
  </li>`;
}

function banner(ctx: ViewCtx, b: Banner) {
  const href = hrefOf(ctx, b.link);
  return html`<li class="promo promo--${b.style}">
    ${b.image ? html`<img class="promo__img" src="${b.image}" alt="" loading="lazy" decoding="async">` : html`<span class="promo__icono">${icon(b.icon, 34)}</span>`}
    <div class="promo__texto">
      <h3>${b.title}</h3>
      ${b.text ? html`<p>${b.text}</p>` : ''}
      ${b.buttonText ? html`<a class="promo__btn" href="${href}" ${raw(isExternal(b.link) ? 'target="_blank" rel="noopener"' : '')}>${b.buttonText}</a>` : ''}
    </div>
  </li>`;
}

export function homePage(ctx: ViewCtx, data: HomeData) {
  const s = ctx.settings;
  const h = s.home;
  const t = s.store.lowStockThreshold;
  const slides = h.slides;

  const body = html`
${slides.length
  ? html`<section class="portada" aria-roledescription="carrusel" aria-label="Promociones" data-slider>
      <ul class="portada__pista" data-slider-track>${slides.map((sl, i) => slide(ctx, sl, i, slides.length))}</ul>
      ${slides.length > 1
        ? html`<div class="portada__ctrl">
            <button class="flecha flecha--portada" type="button" data-slider-prev aria-label="Promoción anterior">${icon('chevronLeft', 22)}</button>
            <div class="portada__puntos">${slides.map(
              (_, i) => html`<button type="button" data-slider-go="${i}" aria-label="Ver promoción ${i + 1}" ${raw(i === 0 ? 'aria-current="true"' : '')}></button>`,
            )}</div>
            <button class="flecha flecha--portada" type="button" data-slider-pausa aria-label="Pausar promociones">${raw('<svg class="i" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>')}</button>
            <button class="flecha flecha--portada" type="button" data-slider-next aria-label="Promoción siguiente">${icon('chevronRight', 22)}</button>
          </div>`
        : ''}
    </section>`
  : html`<h1 class="sr">${s.brand.name}</h1>`}

${h.trust.length
  ? html`<section class="confianza" aria-label="Por qué comprar en ${s.brand.name}">
      <ul>${h.trust.map((x) => html`<li>${icon(x.icon, 26)}<div><h2>${x.title}</h2><p>${x.text}</p></div></li>`)}</ul>
    </section>`
  : ''}

${h.showCategories && data.tiles.length
  ? html`<section class="bloque" id="categorias" aria-labelledby="t-categorias">
      ${rowHead('t-categorias', h.categoriesTitle, h.categoriesSubtitle, undefined, false)}
      <ul class="mosaico">${data.tiles.map(
        (c) => html`<li><a class="cuadro ${c.parentId ? '' : 'cuadro--principal'}" href="/categoria/${c.slug}">
          <span class="cuadro__img">${c.image ? html`<img src="${c.image}" alt="" width="240" height="180" loading="lazy" decoding="async">` : icon('box', 34)}</span>
          <span class="cuadro__nombre">${c.name}</span>
        </a></li>`,
      )}</ul>
    </section>`
  : ''}

${h.showOffers && data.offers.length
  ? html`<section class="bloque ofertas" id="ofertas" aria-labelledby="t-ofertas">
      <div class="ofertas__panel">
        ${icon('tag', 30)}
        <h2 id="t-ofertas">${h.offersTitle}</h2>
        ${h.offersSubtitle ? html`<p>${h.offersSubtitle}</p>` : ''}
        <div class="reloj" data-countdown="${h.offersEndsAt}" role="timer" aria-label="Tiempo restante de las ofertas">
          <span><strong data-h>00</strong><small>horas</small></span>
          <span><strong data-m>00</strong><small>min</small></span>
          <span><strong data-s>00</strong><small>seg</small></span>
        </div>
        <a class="btn btn--oro" href="/ofertas">Ver todas las ofertas</a>
      </div>
      <div class="fila fila--ofertas" data-row>
        <div class="fila__flechas">
          <button class="flecha" type="button" data-scroll="-1" aria-label="Ver ofertas anteriores">${icon('chevronLeft', 20)}</button>
          <button class="flecha" type="button" data-scroll="1" aria-label="Ver más ofertas">${icon('chevronRight', 20)}</button>
        </div>
        <ul class="carrusel" data-row-track>${data.offers.map((p) => productTile(p, t))}</ul>
      </div>
    </section>`
  : ''}

${h.showFeatured && data.featured.length
  ? html`<section class="exhibicion" aria-labelledby="t-destacados" data-row>
      <div class="exhibicion__in">
        ${rowHead('t-destacados', h.featuredTitle, h.featuredSubtitle, { href: '/destacados', label: 'Ver todos' })}
      </div>
      <ul class="exhibicion__pista" data-row-track>${data.featured.map((p) => showcaseCard(p))}</ul>
    </section>`
  : ''}

${h.banners.length
  ? html`<section class="bloque" aria-label="Información importante"><ul class="promos promos--${h.banners.length}">${h.banners.map((b) => banner(ctx, b))}</ul></section>`
  : ''}

${h.showSeasonal && data.seasonal.products.length
  ? html`<section class="bloque" aria-labelledby="t-temporada" data-row>
      ${rowHead('t-temporada', h.seasonalTitle, h.seasonalSubtitle, data.seasonal.category ? { href: `/categoria/${data.seasonal.category.slug}`, label: 'Ver colección' } : undefined)}
      <ul class="carrusel" data-row-track>${data.seasonal.products.map((p) => productTile(p, t))}</ul>
    </section>`
  : ''}

${h.showDiscover && data.discover.length
  ? html`<section class="bloque" aria-labelledby="t-descubre">
      ${rowHead('t-descubre', h.discoverTitle, '', undefined, false)}
      <ul class="rejilla">${data.discover.map((p) => productTile(p, t))}</ul>
      <p class="bloque__mas"><a class="btn btn--linea" href="/#categorias">Ver todas las categorías</a></p>
    </section>`
  : ''}

${h.showSteps && h.steps.length
  ? html`<section class="bloque pasos" id="como-comprar" aria-labelledby="t-pasos">
      ${rowHead('t-pasos', h.stepsTitle, '', undefined, false)}
      <ol class="pasos__lista">${h.steps.map(
        (st, i) => html`<li><span class="pasos__n" aria-hidden="true">${i + 1}</span><div><h3>${st.title}</h3><p>${st.text}</p></div></li>`,
      )}</ol>
      ${s.payments.length ? html`<p class="pasos__pagos"><strong>Medios de pago:</strong> ${s.payments.join(', ')}.</p>` : ''}
    </section>`
  : ''}

${h.showTestimonials && s.testimonials.length
  ? html`<section class="bloque testimonios" aria-labelledby="t-testimonios">
      ${rowHead('t-testimonios', h.testimonialsTitle, '', undefined, false)}
      <ul class="testimonios__lista">${s.testimonials.map(
        (x) => html`<li><div class="testimonios__estrellas" aria-hidden="true">${icon('star', 16)}${icon('star', 16)}${icon('star', 16)}${icon('star', 16)}${icon('star', 16)}</div><blockquote><p>${x.text}</p></blockquote><p class="testimonios__autor">${x.name}${x.city ? html`<span>, ${x.city}</span>` : ''}</p></li>`,
      )}</ul>
    </section>`
  : ''}

${h.showFaq && s.faq.length
  ? html`<section class="bloque preguntas" aria-labelledby="t-preguntas">
      ${rowHead('t-preguntas', h.faqTitle, '', s.faq.length > 6 ? { href: '/preguntas-frecuentes', label: 'Ver todas' } : undefined, false)}
      ${faqList(s.faq.slice(0, 6))}
    </section>`
  : ''}

${h.closingTitle
  ? html`<section class="cierre ${h.closingImage ? 'cierre--foto' : ''}" aria-labelledby="t-cierre">
      ${h.closingImage ? html`<img class="cierre__foto" src="${h.closingImage}" alt="" loading="lazy" decoding="async">` : ''}
      <div class="cierre__texto">
        <h2 class="titulo" id="t-cierre">${h.closingTitle}</h2>
        ${h.closingText ? html`<p>${h.closingText}</p>` : ''}
        <a class="btn btn--oro" href="${waChatUrl(s, 'Hola, estoy buscando un producto que no vi en la tienda:')}" target="_blank" rel="noopener">${icon('whatsapp', 22)} Escríbenos por WhatsApp</a>
      </div>
    </section>`
  : ''}
`;

  return layout(
    ctx,
    {
      canonical: '/',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Store',
        name: s.brand.name,
        slogan: s.brand.slogan,
        url: ctx.origin,
        logo: ctx.origin + s.brand.logo,
        telephone: '+' + s.store.whatsapp,
        paymentAccepted: s.payments.join(', '),
        currenciesAccepted: 'COP',
      },
    },
    body,
  );
}

export function faqList(items: { q: string; a: string }[]) {
  return html`<div class="acordeon">${items.map(
    (f) => html`<details><summary>${f.q}${icon('chevronDown', 20)}</summary><div class="acordeon__r">${raw(simpleMarkdown(f.a))}</div></details>`,
  )}</div>`;
}
