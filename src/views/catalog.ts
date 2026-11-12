import { html, raw } from 'hono/html';
import { SORTS, type Category, type CategoryTree, type Product } from '../lib/db';
import { formatCOP, jsonForScript, simpleMarkdown } from '../lib/util';
import { breadcrumb, cartPayload, pagination, priceBlock, productTile, stockNote } from './components';
import { faqList } from './home';
import { icon } from './icons';
import { layout, waChatUrl, type ViewCtx } from './layout';

type Listing = { items: Product[]; total: number; page: number; pages: number };

function sortSelect(current: string) {
  return html`<label class="orden"><span>Ordenar por</span>
    <select name="orden" data-autosubmit>
      ${Object.entries(SORTS).map(
        ([k, v]) => html`<option value="${k}" ${raw(k === current ? 'selected' : '')}>${v.label}</option>`,
      )}
    </select>
  </label>`;
}

function grid(list: Listing, threshold: number, emptyMsg: unknown) {
  if (!list.items.length) return html`<div class="vacio">${emptyMsg}</div>`;
  return html`<ul class="vitrinas">${list.items.map((p, i) => productTile(p, threshold, { eager: i < 4, heading: 'h2' }))}</ul>`;
}

export function categoryPage(
  ctx: ViewCtx,
  cat: Category,
  root: CategoryTree,
  list: Listing,
  q: { orden: string; q: string },
) {
  const s = ctx.settings;
  const base = `/categoria/${cat.slug}`;
  const params = new URLSearchParams();
  if (q.orden && q.orden !== 'destacados') params.set('orden', q.orden);
  if (q.q) params.set('q', q.q);
  const crumbs: { label: string; href?: string }[] = [{ label: 'Inicio', href: '/' }];
  if (root.id !== cat.id) crumbs.push({ label: root.name, href: `/categoria/${root.slug}` });
  crumbs.push({ label: cat.name });

  const body = html`
<div class="pagina">
  ${breadcrumb(crumbs)}
  <header class="pagina__cab">
    <h1 class="titulo titulo--xl">${cat.name}</h1>
    ${(cat.description || root.description) ? html`<p>${cat.description || (root.id === cat.id ? root.description : '')}</p>` : ''}
  </header>
  ${root.children.length
    ? html`<nav class="chips chips--nav" aria-label="Subcategorías">
        <a class="chip" href="/categoria/${root.slug}" ${raw(root.id === cat.id ? 'aria-current="page"' : '')}>Todo ${root.name.toLowerCase()}</a>
        ${root.children.map(
          (k) => html`<a class="chip" href="/categoria/${k.slug}" ${raw(k.id === cat.id ? 'aria-current="page"' : '')}>${k.name}</a>`,
        )}
      </nav>`
    : ''}
  <form class="barra" method="get" action="${base}">
    <p class="barra__conteo" role="status">${list.total === 1 ? '1 producto' : `${list.total} productos`}${q.q ? html` para “${q.q}”` : ''}</p>
    <div class="barra__ctrl">
      <label class="barra__buscar"><span class="sr">Buscar en ${cat.name}</span>
        <input type="search" name="q" value="${q.q}" placeholder="Buscar en ${cat.name.toLowerCase()}" enterkeyhint="search">
      </label>
      ${sortSelect(q.orden)}
      <noscript><button class="btn btn--sm" type="submit">Aplicar</button></noscript>
    </div>
  </form>
  ${grid(
    list,
    s.store.lowStockThreshold,
    q.q
      ? html`<p>No encontramos productos con “${q.q}” en ${cat.name}.</p><a class="btn btn--linea" href="${base}">Ver todo ${cat.name.toLowerCase()}</a>`
      : html`<p>Todavía no hay productos en esta categoría.</p><a class="btn btn--linea" href="/#categorias">Ver otras categorías</a>`,
  )}
  ${pagination(base, params, list.page, list.pages)}
</div>`;

  return layout(
    ctx,
    {
      title: list.page > 1 ? `${cat.name}, página ${list.page}` : cat.name,
      description: cat.description || root.description || undefined,
      canonical: list.page > 1 ? `${base}?pagina=${list.page}` : base,
      image: cat.image || root.image || undefined,
    },
    body,
  );
}

export function listingPage(
  ctx: ViewCtx,
  opts: { title: string; intro?: string; base: string; list: Listing; q: { orden: string; q: string }; showSearch: boolean },
) {
  const s = ctx.settings;
  const params = new URLSearchParams();
  if (opts.q.q) params.set('q', opts.q.q);
  if (opts.q.orden && opts.q.orden !== 'destacados') params.set('orden', opts.q.orden);
  const body = html`
<div class="pagina">
  ${breadcrumb([{ label: 'Inicio', href: '/' }, { label: opts.title }])}
  <header class="pagina__cab">
    <h1 class="titulo titulo--xl">${opts.title}</h1>
    ${opts.intro ? html`<p>${opts.intro}</p>` : ''}
  </header>
  <form class="barra" method="get" action="${opts.base}">
    <p class="barra__conteo" role="status">${opts.list.total === 1 ? '1 producto' : `${opts.list.total} productos`}</p>
    <div class="barra__ctrl">
      ${opts.showSearch
        ? html`<label class="barra__buscar"><span class="sr">Buscar</span><input type="search" name="q" value="${opts.q.q}" placeholder="Buscar productos" enterkeyhint="search"></label>`
        : ''}
      ${sortSelect(opts.q.orden)}
      <noscript><button class="btn btn--sm" type="submit">Aplicar</button></noscript>
    </div>
  </form>
  ${grid(
    opts.list,
    s.store.lowStockThreshold,
    opts.q.q
      ? html`<p>No encontramos productos con “${opts.q.q}”. Prueba con otra palabra o escríbenos y te ayudamos a encontrarlo.</p>
          <a class="btn btn--wa" href="${waChatUrl(s, `Hola, estoy buscando: ${opts.q.q}`)}" target="_blank" rel="noopener">${icon('whatsapp', 20)} Preguntar por WhatsApp</a>`
      : html`<p>Escribe lo que buscas en el campo de búsqueda.</p>`,
  )}
  ${pagination(opts.base, params, opts.list.page, opts.list.pages)}
</div>`;
  return layout(ctx, { title: opts.title, noindex: opts.base === '/buscar' }, body);
}

export function productPage(ctx: ViewCtx, p: Product, cat: Category | null, root: CategoryTree | null, related: Product[]) {
  const s = ctx.settings;
  const crumbs: { label: string; href?: string }[] = [{ label: 'Inicio', href: '/' }];
  if (root) crumbs.push({ label: root.name, href: `/categoria/${root.slug}` });
  if (cat && root && cat.id !== root.id) crumbs.push({ label: cat.name, href: `/categoria/${cat.slug}` });
  crumbs.push({ label: p.name });
  const images = p.images.length ? p.images : [];

  const body = html`
<div class="pagina pagina--producto">
  ${breadcrumb(crumbs)}
  <article class="producto" data-product='${raw(jsonForScript(cartPayload(p)).replace(/'/g, '&#39;'))}'>
    <div class="galeria" data-gallery>
      <div class="galeria__vitrina">
        <div class="galeria__luz" aria-hidden="true"></div>
        <ul class="galeria__pista" data-gallery-track tabindex="0" aria-label="Imágenes de ${p.name}">
          ${images.length
            ? images.map(
                (im, i) => html`<li id="foto-${i + 1}"><img src="${im.url}" alt="${im.alt || p.name}" width="900" height="900" ${raw(i === 0 ? 'fetchpriority="high"' : 'loading="lazy"')} decoding="async"></li>`,
              )
            : html`<li><span class="pieza__sin-foto">${icon('box', 64)}</span></li>`}
        </ul>
        ${images.length > 1
          ? html`<button class="galeria__flecha galeria__flecha--izq" type="button" data-gallery-prev aria-label="Imagen anterior">${icon('chevronLeft', 22)}</button>
              <button class="galeria__flecha galeria__flecha--der" type="button" data-gallery-next aria-label="Imagen siguiente">${icon('chevronRight', 22)}</button>`
          : ''}
      </div>
      ${images.length > 1
        ? html`<ol class="galeria__miniaturas" aria-label="Elegir imagen">${images.map(
            (im, i) => html`<li><button type="button" data-gallery-go="${i}" aria-label="Ver imagen ${i + 1} de ${images.length}" ${raw(i === 0 ? 'aria-current="true"' : '')}><img src="${im.url}" alt="" width="120" height="120" loading="lazy"></button></li>`,
          )}</ol>`
        : ''}
    </div>

    <div class="ficha">
      <h1 class="titulo titulo--lg ficha__nombre">${p.name}</h1>
      ${p.shortDescription ? html`<p class="ficha__corta">${p.shortDescription}</p>` : ''}
      <div data-price-box>${priceBlock(p, 'lg')}</div>
      ${stockNote(p, s.store.lowStockThreshold)}
      <form class="compra" data-buy-form>
        ${p.options.map(
          (o, oi) => html`<fieldset class="opcion">
            <legend>${o.name}: <span data-option-chosen="${oi}">Elige una opción</span></legend>
            <div class="opcion__valores">
              ${o.values.map(
                (v, vi) => html`<label class="opcion__valor ${v.soldOut ? 'is-agotado' : ''}">
                  <input type="radio" name="opt-${oi}" value="${v.label}" data-option="${o.name}" data-delta="${v.delta}" ${raw(v.soldOut ? 'disabled' : '')} ${raw(!v.soldOut && o.values.filter((x) => !x.soldOut).length === 1 && vi === o.values.findIndex((x) => !x.soldOut) ? 'checked' : '')}>
                  <span>${v.label}${v.delta ? html`<small>${v.delta > 0 ? '+' : '−'}${formatCOP(Math.abs(v.delta))}</small>` : ''}${v.soldOut ? html`<small>Agotado</small>` : ''}</span>
                </label>`,
              )}
            </div>
          </fieldset>`,
        )}
        ${p.soldOut
          ? html`<p class="compra__agotado">Este producto está agotado por ahora.</p>
              <a class="btn btn--wa" href="${waChatUrl(s, `Hola, ¿cuándo vuelve a estar disponible ${p.name}?`)}" target="_blank" rel="noopener">${icon('whatsapp', 20)} Avísame cuando llegue</a>`
          : html`<div class="compra__fila">
              <div class="cantidad" data-qty>
                <button type="button" data-qty-minus aria-label="Quitar una unidad">${icon('minus', 18)}</button>
                <label class="sr" for="cantidad">Cantidad</label>
                <input id="cantidad" name="qty" type="number" inputmode="numeric" min="1" max="${p.stock ?? 99}" value="1">
                <button type="button" data-qty-plus aria-label="Agregar una unidad">${icon('plus', 18)}</button>
              </div>
              <button class="btn btn--grande" type="submit" data-buy-add>${icon('bag', 20)} Añadir al carrito</button>
            </div>
            <button class="btn btn--linea btn--bloque" type="button" data-buy-now>${icon('whatsapp', 20)} Comprar ahora por WhatsApp</button>
            <p class="compra__error" data-buy-error role="alert" hidden></p>`}
      </form>
      <ul class="garantias">
        <li>${icon('shield', 18)} Pagas después de confirmar tu pedido con nosotros.</li>
        <li>${icon('truck', 18)} ${s.store.shippingNote}</li>
        ${s.payments.length ? html`<li>${icon('tag', 18)} ${s.payments.join(', ')}.</li>` : ''}
      </ul>
      ${p.sku ? html`<p class="ficha__ref">Referencia ${p.sku}</p>` : ''}
    </div>
  </article>

  <section class="detalle" aria-labelledby="titulo-detalle">
    <div class="detalle__texto">
      <h2 class="titulo" id="titulo-detalle">Descripción</h2>
      <div class="prosa">${raw(simpleMarkdown(p.description || p.shortDescription))}</div>
    </div>
    ${p.specs.length
      ? html`<div class="detalle__ficha">
          <h2 class="titulo">Ficha técnica</h2>
          <dl class="especificaciones">${p.specs.map((sp) => html`<div><dt>${sp.label}</dt><dd>${sp.value}</dd></div>`)}</dl>
        </div>`
      : ''}
  </section>

  ${related.length
    ? html`<section class="seccion seccion--estrecha" aria-labelledby="titulo-relacionados">
        <div class="seccion__cab"><h2 class="titulo" id="titulo-relacionados">También te puede gustar</h2></div>
        <ul class="vitrinas vitrinas--fila">${related.map((r) => productTile(r, s.store.lowStockThreshold))}</ul>
      </section>`
    : ''}
</div>`;

  const offers = {
    '@type': 'Offer',
    priceCurrency: 'COP',
    price: p.price,
    availability: p.soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    url: `${ctx.origin}/producto/${p.slug}`,
  };
  return layout(
    ctx,
    {
      title: p.name,
      description: p.shortDescription || undefined,
      image: images[0]?.url,
      canonical: `/producto/${p.slug}`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        description: p.shortDescription,
        sku: p.sku || undefined,
        image: images.map((im) => (im.url.startsWith('http') ? im.url : ctx.origin + im.url)),
        brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
        offers,
      },
    },
    body,
  );
}

export function textPage(ctx: ViewCtx, title: string, markdown: string, path: string) {
  const body = html`<div class="pagina pagina--texto">
    ${breadcrumb([{ label: 'Inicio', href: '/' }, { label: title }])}
    <h1 class="titulo titulo--xl">${title}</h1>
    <div class="prosa">${raw(simpleMarkdown(markdown))}</div>
  </div>`;
  return layout(ctx, { title, canonical: path }, body);
}

export function faqPage(ctx: ViewCtx) {
  const s = ctx.settings;
  const body = html`<div class="pagina pagina--texto">
    ${breadcrumb([{ label: 'Inicio', href: '/' }, { label: 'Preguntas frecuentes' }])}
    <h1 class="titulo titulo--xl">Preguntas frecuentes</h1>
    ${faqList(s.faq)}
    <p class="preguntas__mas">¿No encuentras tu respuesta? <a href="${waChatUrl(s, 'Hola, tengo una pregunta:')}" target="_blank" rel="noopener">Escríbenos por WhatsApp</a>.</p>
  </div>`;
  return layout(ctx, { title: 'Preguntas frecuentes', canonical: '/preguntas-frecuentes' }, body);
}

export function notFoundPage(ctx: ViewCtx) {
  const body = html`<div class="pagina pagina--texto pagina--404">
    <h1 class="titulo titulo--xl">Esta página no existe</h1>
    <p>Puede que el producto ya no esté publicado o que el enlace tenga un error.</p>
    <p><a class="btn" href="/">Volver al inicio</a> <a class="btn btn--linea" href="/#categorias">Ver categorías</a></p>
  </div>`;
  return layout(ctx, { title: 'Página no encontrada', noindex: true }, body);
}
