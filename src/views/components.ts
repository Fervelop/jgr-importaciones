import { html, raw } from 'hono/html';
import type { Product } from '../lib/db';
import { discountPercent, formatCOP, jsonForScript } from '../lib/util';
import { icon } from './icons';

/** Datos mínimos que necesita el carrito en el navegador. */
export function cartPayload(p: Product) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    stock: p.stock,
    soldOut: p.soldOut,
    image: p.images[0]?.url || '',
    options: p.options,
  };
}

export function priceBlock(p: Product, size: 'sm' | 'lg' = 'sm') {
  const pct = discountPercent(p.price, p.compareAtPrice);
  if (pct > 0) {
    return html`<div class="precio precio--${size} precio--oferta">
      <span class="sr">Precio de oferta:</span><span class="precio__actual" data-price>${formatCOP(p.price)}</span>
      <span class="precio__antes"><span class="sr">Antes:</span><s data-compare>${formatCOP(p.compareAtPrice!)}</s></span>
      <span class="precio__dcto">-${pct}%</span>
    </div>`;
  }
  return html`<div class="precio precio--${size}"><span class="precio__actual" data-price>${formatCOP(p.price)}</span></div>`;
}

export function stockNote(p: Product, threshold: number) {
  if (p.soldOut) return html`<p class="existencias existencias--agotado">Agotado</p>`;
  if (p.stock === null) return html`<p class="existencias">Disponible</p>`;
  if (p.stock <= threshold)
    return html`<p class="existencias existencias--pocas">${p.stock === 1 ? 'Queda 1 unidad' : `Quedan ${p.stock} unidades`}</p>`;
  return html`<p class="existencias">${p.stock} unidades disponibles</p>`;
}

/** Tarjeta de producto (cuadrículas, carruseles y relacionados). */
export function productTile(p: Product, threshold: number, opts: { eager?: boolean; heading?: 'h2' | 'h3' } = {}) {
  const img = p.images[0];
  const pct = discountPercent(p.price, p.compareAtPrice);
  const hasOptions = p.options.length > 0;
  const low = !p.soldOut && p.stock !== null && p.stock <= threshold;
  const name = html`<a href="/producto/${p.slug}">${p.name}</a>`;
  return html`<li class="tarjeta ${p.soldOut ? 'tarjeta--agotada' : ''}">
    <a class="tarjeta__foto" href="/producto/${p.slug}" tabindex="-1" aria-hidden="true">
      ${img
        ? html`<img src="${img.url}" alt="" width="600" height="600" ${raw(opts.eager ? 'fetchpriority="high"' : 'loading="lazy"')} decoding="async">`
        : html`<span class="tarjeta__sin-foto">${icon('box', 40)}</span>`}
      <span class="insignias">
        ${pct > 0 && !p.soldOut ? html`<span class="insignia insignia--oferta">-${pct}%</span>` : ''}
        ${p.soldOut ? html`<span class="insignia insignia--agotado">Agotado</span>` : ''}
        ${low ? html`<span class="insignia insignia--pocas">Últimas ${p.stock}</span>` : ''}
      </span>
    </a>
    <div class="tarjeta__cuerpo">
      ${opts.heading === 'h2' ? html`<h2 class="tarjeta__nombre">${name}</h2>` : html`<h3 class="tarjeta__nombre">${name}</h3>`}
      ${priceBlock(p)}
      ${p.soldOut
        ? html`<span class="btn btn--sm btn--bloque btn--apagado" aria-disabled="true">Agotado</span>`
        : hasOptions
          ? html`<a class="btn btn--sm btn--bloque btn--linea" href="/producto/${p.slug}">Elegir opciones</a>`
          : html`<button class="btn btn--sm btn--bloque btn--oro" type="button" data-add='${raw(escapeAttrJson(cartPayload(p)))}'>${icon('bag', 16)} Añadir al carrito</button>`}
    </div>
  </li>`;
}

/** JSON para un atributo entre comillas simples. */
export function escapeAttrJson(v: unknown) {
  return jsonForScript(v).replace(/'/g, '&#39;');
}

export function breadcrumb(items: { label: string; href?: string }[]) {
  return html`<nav class="migas" aria-label="Ruta de navegación"><ol>
    ${items.map((it, i) =>
      it.href && i < items.length - 1
        ? html`<li><a href="${it.href}">${it.label}</a></li>`
        : html`<li><span aria-current="page">${it.label}</span></li>`,
    )}
  </ol></nav>`;
}

export function pagination(base: string, params: URLSearchParams, page: number, pages: number) {
  if (pages <= 1) return '';
  const href = (n: number) => {
    const p = new URLSearchParams(params);
    if (n <= 1) p.delete('pagina');
    else p.set('pagina', String(n));
    const qs = p.toString();
    return `${base}${qs ? `?${qs}` : ''}`;
  };
  const nums: (number | '…')[] = [];
  for (let n = 1; n <= pages; n++) {
    if (n === 1 || n === pages || Math.abs(n - page) <= 1) nums.push(n);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return html`<nav class="paginas" aria-label="Páginas">
    ${page > 1
      ? html`<a class="paginas__flecha" href="${href(page - 1)}" rel="prev">${icon('chevronLeft', 18)}<span>Anterior</span></a>`
      : html`<span class="paginas__flecha" aria-disabled="true">${icon('chevronLeft', 18)}<span>Anterior</span></span>`}
    <ol>
      ${nums.map((n) =>
        n === '…'
          ? html`<li><span class="paginas__salto">…</span></li>`
          : n === page
            ? html`<li><span aria-current="page">${n}</span></li>`
            : html`<li><a href="${href(n)}" aria-label="Página ${n}">${n}</a></li>`,
      )}
    </ol>
    ${page < pages
      ? html`<a class="paginas__flecha" href="${href(page + 1)}" rel="next"><span>Siguiente</span>${icon('chevronRight', 18)}</a>`
      : html`<span class="paginas__flecha" aria-disabled="true"><span>Siguiente</span>${icon('chevronRight', 18)}</span>`}
  </nav>`;
}
