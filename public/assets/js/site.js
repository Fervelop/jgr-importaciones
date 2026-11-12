// Comportamiento de la tienda: tema, menús, carrito, página de producto y pedido por WhatsApp.
import {
  buildOrderMessage,
  cartTotals,
  clampQty,
  formatCOP,
  lineKey,
  maxQty,
  unitPrice,
  validateCustomer,
  whatsappUrl,
} from './order.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const CONFIG = (() => {
  try {
    return JSON.parse($('#jgr-config')?.textContent || '{}');
  } catch {
    return {};
  }
})();

/* ---------- Almacenamiento seguro ---------- */
const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* modo privado o almacenamiento lleno: el carrito vive solo en esta pestaña */
    }
  },
};

/* ---------- Tema claro / oscuro ---------- */
function applyTheme(theme) {
  const dark = theme === 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  for (const btn of $$('[data-theme-toggle]')) {
    btn.setAttribute('aria-pressed', String(dark));
    btn.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro');
  }
  const meta = $('#meta-theme');
  if (meta) meta.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
}
applyTheme(document.documentElement.getAttribute('data-theme'));
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-theme-toggle]');
  if (!btn) return;
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem('jgr-theme', next);
  } catch {}
  applyTheme(next);
});

/* ---------- Cabecera ---------- */
const header = $('#cabecera');
if (header) {
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ---------- Hojas laterales ---------- */
function openSheet(id) {
  const d = document.getElementById(id);
  if (!d || d.open) return;
  d.showModal();
  for (const b of $$(`[data-open="${id}"]`)) b.setAttribute('aria-expanded', 'true');
  if (id === 'carrito') refreshCart();
}
function closeSheet(d) {
  if (!d?.open) return;
  d.close();
}
document.addEventListener('click', (e) => {
  const opener = e.target.closest('[data-open]');
  if (opener) {
    e.preventDefault();
    openSheet(opener.dataset.open);
    return;
  }
  const closer = e.target.closest('[data-close]');
  if (closer) {
    const d = closer.closest('dialog');
    closeSheet(d);
    return;
  }
  // Clic en el fondo oscuro cierra la hoja.
  if (e.target instanceof HTMLDialogElement && e.target.classList.contains('hoja')) {
    const r = e.target.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) closeSheet(e.target);
  }
});
for (const d of $$('dialog.hoja')) {
  d.addEventListener('close', () => {
    for (const b of $$(`[data-open="${d.id}"]`)) b.setAttribute('aria-expanded', 'false');
  });
}

/* ---------- Aviso flotante ---------- */
let toastTimer;
function toast(message, action) {
  const el = $('[data-toast]');
  if (!el) return;
  // Un <dialog> abierto queda por encima de todo: el aviso debe vivir dentro de él para verse y poder tocarse.
  const host = $('dialog[open]') || document.body;
  if (el.parentElement !== host) host.append(el);
  el.textContent = '';
  const span = document.createElement('span');
  span.textContent = message;
  el.append(span);
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = action.label;
    b.addEventListener('click', () => {
      el.hidden = true;
      action.onClick();
    });
    el.append(b);
  }
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 4200);
}

/* ---------- Carrito ---------- */
const CART_KEY = 'jgr-carrito-v1';
let cart = store.get(CART_KEY, []);
if (!Array.isArray(cart)) cart = [];

function saveCart() {
  store.set(CART_KEY, cart);
  renderCart();
}

function addToCart(product, variant, qty) {
  const key = lineKey(product.id, variant);
  const max = maxQty(product);
  if (max === 0) return { ok: false, reason: 'Este producto está agotado.' };
  const existing = cart.find((l) => l.key === key);
  const price = unitPrice(product, variant);
  if (existing) {
    const wanted = existing.qty + qty;
    existing.qty = clampQty(wanted, max);
    existing.unitPrice = price;
    existing.max = max;
    saveCart();
    if (wanted > max) return { ok: true, capped: max };
  } else {
    cart.push({
      key,
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      variant: variant || {},
      unitPrice: price,
      qty: clampQty(qty, max),
      max,
    });
    saveCart();
    if (qty > max) return { ok: true, capped: max };
  }
  const n = $('[data-cart-count]');
  if (n) {
    n.classList.remove('is-bump');
    void n.offsetWidth;
    n.classList.add('is-bump');
  }
  return { ok: true };
}

function variantLabel(variant) {
  const e = Object.entries(variant || {});
  return e.map(([k, v]) => `${k}: ${v}`).join(', ');
}

const ICON = {
  minus: '<svg class="i" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
  plus: '<svg class="i" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  trash: '<svg class="i" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg>',
};

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) if (c) node.append(c);
  return node;
}

function renderCart() {
  const { count, total } = cartTotals(cart);
  for (const badge of $$('[data-cart-count]')) {
    badge.textContent = String(count);
    badge.hidden = count === 0;
  }
  for (const btn of $$('[data-open="carrito"]')) {
    btn.setAttribute('aria-label', `Abrir carrito, ${count} ${count === 1 ? 'producto' : 'productos'}`);
  }
  const list = $('[data-cart-list]');
  if (!list) return;
  $('[data-cart-empty]').hidden = cart.length > 0;
  $('[data-cart-form]').hidden = cart.length === 0;
  $('[data-cart-total]').textContent = formatCOP(total);
  list.textContent = '';
  for (const line of cart) {
    const li = el('li', { class: `linea${line.problem ? ' linea--problema' : ''}`, 'data-problem': line.problem || null });
    const foto = el('a', { class: 'linea__foto', href: `/producto/${line.slug}`, tabindex: '-1', 'aria-hidden': 'true' }, [
      line.image ? el('img', { src: line.image, alt: '', width: '72', height: '72', loading: 'lazy' }) : null,
    ]);
    const qty = el('div', { class: 'cantidad cantidad--sm' }, [
      el('button', { type: 'button', 'aria-label': `Quitar una unidad de ${line.name}`, 'data-line-minus': line.key, html: ICON.minus }),
      el('input', {
        type: 'number',
        inputmode: 'numeric',
        min: '1',
        max: String(line.max ?? 99),
        value: String(line.qty),
        'aria-label': `Cantidad de ${line.name}`,
        'data-line-qty': line.key,
      }),
      el('button', {
        type: 'button',
        'aria-label': `Agregar una unidad de ${line.name}`,
        'data-line-plus': line.key,
        disabled: line.qty >= (line.max ?? 99),
        html: ICON.plus,
      }),
    ]);
    const info = el('div', { class: 'linea__info' }, [
      el('a', { class: 'linea__nombre', href: `/producto/${line.slug}`, text: line.name }),
      line.variant && Object.keys(line.variant).length ? el('span', { class: 'linea__var', text: variantLabel(line.variant) }) : null,
      el('span', { class: 'linea__unit', text: `${formatCOP(line.unitPrice)} c/u` }),
      el('div', { class: 'linea__fila' }, [qty, el('span', { class: 'linea__precio', text: formatCOP(line.unitPrice * line.qty) })]),
      el('button', { type: 'button', class: 'linea__quitar', 'data-line-remove': line.key, html: `${ICON.trash} Quitar` }),
    ]);
    li.append(foto, info);
    list.append(li);
  }
  renderLastOrder();
  // Cantidad en el carrito sobre las tarjetas de destacados.
  const perProduct = new Map();
  for (const l of cart) perProduct.set(l.id, (perProduct.get(l.id) || 0) + l.qty);
  for (const b of $$('[data-in-cart]')) {
    const n = perProduct.get(Number(b.dataset.inCart)) || 0;
    b.hidden = n === 0;
    const span = b.querySelector('span');
    if (span) span.textContent = String(n);
    b.setAttribute('aria-label', `${n} en el carrito`);
  }
}

function renderLastOrder(extraMessages = []) {
  const box = $('[data-cart-notice]');
  if (box) {
    box.textContent = '';
    for (const m of extraMessages) box.append(el('p', { text: m }));
    box.hidden = box.childNodes.length === 0;
  }
  // Después de enviar, el carrito queda vacío. Si WhatsApp no se abrió, el cliente puede reenviar el pedido.
  const last = $('[data-last-order]');
  if (!last) return;
  const saved = store.get('jgr-ultimo-pedido', null);
  last.textContent = '';
  const recent = saved && saved.url && Date.now() - saved.at < 1000 * 60 * 60 * 24;
  if (recent && !cart.length) {
    last.append(
      el('p', { text: saved.code ? `Enviaste tu pedido ${saved.code} por WhatsApp.` : 'Enviaste tu pedido por WhatsApp.' }),
      el('p', { text: '¿No se abrió WhatsApp? Puedes enviarlo de nuevo.' }),
      el('a', { class: 'btn btn--linea btn--sm', href: saved.url, target: '_blank', rel: 'noopener', text: 'Abrir WhatsApp de nuevo' }),
    );
  }
  last.hidden = !last.childNodes.length;
}

function changeQty(key, next) {
  const line = cart.find((l) => l.key === key);
  if (!line) return;
  const q = clampQty(next, line.max ?? 99);
  if (q <= 0) cart = cart.filter((l) => l.key !== key);
  else line.qty = q;
  saveCart();
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-line-minus],[data-line-plus],[data-line-remove]');
  if (!t) return;
  if (t.dataset.lineRemove) {
    const line = cart.find((l) => l.key === t.dataset.lineRemove);
    cart = cart.filter((l) => l.key !== t.dataset.lineRemove);
    saveCart();
    if (line) toast(`Quitaste ${line.name}`, {
      label: 'Deshacer',
      onClick: () => {
        cart.push(line);
        saveCart();
      },
    });
    return;
  }
  const key = t.dataset.lineMinus || t.dataset.linePlus;
  const line = cart.find((l) => l.key === key);
  if (!line) return;
  changeQty(key, line.qty + (t.dataset.linePlus ? 1 : -1));
  // Mantener el foco en el mismo control tras volver a pintar.
  const sel = t.dataset.linePlus ? `[data-line-plus="${CSS.escape(key)}"]` : `[data-line-minus="${CSS.escape(key)}"]`;
  $(sel)?.focus();
});
document.addEventListener('change', (e) => {
  const input = e.target.closest('[data-line-qty]');
  if (input) changeQty(input.dataset.lineQty, input.value);
});

/** Actualiza precios y existencias del carrito con los datos actuales de la tienda. */
async function refreshCart() {
  if (!cart.length) return;
  try {
    const ids = [...new Set(cart.map((l) => l.id))].join(',');
    const res = await fetch(`/api/productos/estado?ids=${ids}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const { items } = await res.json();
    const byId = new Map(items.map((p) => [p.id, p]));
    const notes = [];
    cart = cart.filter((line) => {
      const p = byId.get(line.id);
      if (!p) {
        notes.push(`${line.name} ya no está disponible y lo quitamos del carrito.`);
        return false;
      }
      if (p.soldOut) {
        notes.push(`${p.name} se agotó y lo quitamos del carrito.`);
        return false;
      }
      const newPrice = unitPrice(p, line.variant);
      if (newPrice !== line.unitPrice) notes.push(`El precio de ${p.name} cambió a ${formatCOP(newPrice)}.`);
      line.unitPrice = newPrice;
      line.name = p.name;
      line.image = p.image;
      line.max = maxQty(p);
      if (line.qty > line.max) {
        line.qty = line.max;
        notes.push(`De ${p.name} solo quedan ${line.max} unidades.`);
      }
      return line.qty > 0;
    });
    store.set(CART_KEY, cart);
    renderCart();
    if (notes.length) renderLastOrder(notes);
  } catch {
    /* sin conexión: se usa lo guardado */
  }
}

/* Botones "Agregar" en vitrinas y cuadrículas */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-add]');
  if (!btn) return;
  let product;
  try {
    product = JSON.parse(btn.dataset.add);
  } catch {
    return;
  }
  const r = addToCart(product, {}, 1);
  if (!r.ok) return toast(r.reason);
  toast(r.capped ? `Solo hay ${r.capped} disponibles de ${product.name}` : 'Añadido al carrito', {
    label: 'Ver carrito',
    onClick: () => openSheet('carrito'),
  });
});

/* Enviar el pedido */
const form = $('[data-cart-form]');

function showFieldErrors(errors) {
  if (!form) return;
  for (const name of ['name', 'city', 'address', 'payment']) {
    const input = form.elements.namedItem(name);
    const msg = $(`#e-${name}`, form);
    if (!input || !msg) continue;
    const text = errors[name] || '';
    msg.textContent = text;
    msg.hidden = !text;
    input.setAttribute('aria-invalid', text ? 'true' : 'false');
  }
  const first = ['name', 'city', 'address', 'payment'].find((n) => errors[n]);
  if (first) form.elements.namedItem(first)?.focus();
}

form?.addEventListener('input', (e) => {
  const name = e.target?.name;
  const msg = name && $(`#e-${name}`, form);
  if (msg && !msg.hidden) {
    msg.hidden = true;
    e.target.setAttribute('aria-invalid', 'false');
  }
});

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!cart.length) return;
  const btn = $('[data-cart-send]');
  const fd = new FormData(form);
  const customer = {
    name: String(fd.get('name') || '').trim(),
    city: String(fd.get('city') || '').trim(),
    address: String(fd.get('address') || '').trim(),
    payment: String(fd.get('payment') || '').trim(),
    note: String(fd.get('note') || '').trim(),
  };
  if (CONFIG.askCustomerData) {
    const errors = validateCustomer(customer, { payments: CONFIG.payments, codCities: CONFIG.codCities });
    if (Object.keys(errors).length) {
      showFieldErrors(errors);
      toast('Completa tus datos para enviar el pedido.');
      return;
    }
  }
  btn.disabled = true;
  store.set('jgr-datos-envio', { ...customer, note: '' });
  let items = cart.map((l) => ({ name: l.name, variant: l.variant, qty: l.qty, unitPrice: l.unitPrice }));
  let code = '';
  let whatsapp = CONFIG.whatsapp;
  try {
    const res = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart.map((l) => ({ id: l.id, qty: l.qty, variant: l.variant })), customer }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      code = data.code;
      whatsapp = data.whatsapp || whatsapp;
      items = data.items;
      if (data.problems?.length) {
        // Los precios o cantidades cambiaron: mostramos el carrito actualizado antes de enviar.
        await refreshCart();
        renderLastOrder(data.problems);
        btn.disabled = false;
        toast('Actualizamos tu carrito. Revísalo y vuelve a enviarlo.');
        return;
      }
    } else if (res.status === 422 && data.fields) {
      showFieldErrors(data.fields);
      btn.disabled = false;
      return;
    } else if (res.status === 409) {
      await refreshCart();
      renderLastOrder(data.problems || [data.error]);
      btn.disabled = false;
      return;
    }
  } catch {
    /* sin conexión con la tienda: igual enviamos el pedido con los precios del carrito */
  }
  const message = buildOrderMessage(items, customer, {
    greeting: CONFIG.greeting,
    closing: CONFIG.closing,
    shippingNote: CONFIG.shippingNote,
    code,
  });
  const url = whatsappUrl(whatsapp, message);
  // El pedido ya salió: se guarda el enlace por si WhatsApp no se abre y se vacía el carrito.
  store.set('jgr-ultimo-pedido', { code, at: Date.now(), url });
  cart = [];
  saveCart();
  btn.disabled = false;
  window.location.href = url;
});

// Recordar los datos de envío del cliente en este dispositivo.
(() => {
  const saved = store.get('jgr-datos-envio', null);
  if (!saved || !form) return;
  for (const [k, v] of Object.entries(saved)) {
    const input = form.elements.namedItem(k);
    if (input && v && !input.value) input.value = v;
  }
})();

renderCart();

/* ---------- Página de producto ---------- */
const productEl = $('[data-product]');
if (productEl) {
  const product = JSON.parse(productEl.dataset.product);
  const buyForm = $('[data-buy-form]');
  const qtyInput = $('#cantidad');
  const errorEl = $('[data-buy-error]');
  const max = maxQty(product);

  const chosenVariant = () => {
    const v = {};
    for (const group of product.options) {
      const checked = $(`input[data-option="${CSS.escape(group.name)}"]:checked`, buyForm);
      if (checked) v[group.name] = checked.value;
    }
    return v;
  };
  const missing = () => product.options.filter((g) => !chosenVariant()[g.name]).map((g) => g.name);

  const updatePrice = () => {
    const v = chosenVariant();
    const price = unitPrice(product, v);
    const priceEl = $('[data-price-box] [data-price]');
    if (priceEl) priceEl.textContent = formatCOP(price);
    const delta = price - product.price;
    const compare = $('[data-price-box] [data-compare]');
    if (compare && compare.dataset.base === undefined) compare.dataset.base = compare.textContent;
    if (compare) {
      const base = Number(String(compare.dataset.base).replace(/\D/g, ''));
      compare.textContent = formatCOP(base + delta);
    }
    product.options.forEach((g, i) => {
      const label = $(`[data-option-chosen="${i}"]`);
      if (label) label.textContent = v[g.name] || 'Elige una opción';
    });
  };
  buyForm?.addEventListener('change', (e) => {
    if (e.target.matches('[data-option]')) {
      e.target.closest('.opcion')?.classList.remove('is-falta');
      if (errorEl) errorEl.hidden = true;
      updatePrice();
    }
  });
  updatePrice();

  const readQty = () => Math.max(1, clampQty(qtyInput?.value || 1, max));
  $('[data-qty-minus]')?.addEventListener('click', () => (qtyInput.value = String(Math.max(1, readQty() - 1))));
  $('[data-qty-plus]')?.addEventListener('click', () => {
    const next = Math.min(max, readQty() + 1);
    qtyInput.value = String(next);
    if (next === max && max < 99) toast(max === 1 ? 'Solo queda 1 unidad' : `Solo quedan ${max} unidades`);
  });
  qtyInput?.addEventListener('change', () => (qtyInput.value = String(readQty())));

  const tryAdd = () => {
    const miss = missing();
    if (miss.length) {
      if (errorEl) {
        errorEl.textContent = `Elige ${miss.join(' y ').toLowerCase()} antes de agregar al carrito.`;
        errorEl.hidden = false;
      }
      for (const fs of $$('.opcion', buyForm)) {
        const name = $('[data-option]', fs)?.dataset.option;
        if (miss.includes(name)) fs.classList.add('is-falta');
      }
      $('.opcion.is-falta input:not(:disabled)', buyForm)?.focus();
      return false;
    }
    const r = addToCart(product, chosenVariant(), readQty());
    if (!r.ok) {
      toast(r.reason);
      return false;
    }
    if (r.capped) toast(`Solo hay ${r.capped} disponibles; ajustamos la cantidad.`);
    return true;
  };

  buyForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (tryAdd()) toast('Añadido al carrito', { label: 'Ver carrito', onClick: () => openSheet('carrito') });
  });
  $('[data-buy-now]')?.addEventListener('click', () => {
    if (tryAdd()) openSheet('carrito');
  });

  /* Galería */
  const track = $('[data-gallery-track]');
  if (track) {
    const slides = $$('li', track);
    const thumbs = $$('[data-gallery-go]');
    const current = () => Math.round(track.scrollLeft / track.clientWidth);
    const go = (i) => {
      const n = (i + slides.length) % slides.length;
      track.scrollTo({ left: n * track.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };
    $('[data-gallery-prev]')?.addEventListener('click', () => go(current() - 1));
    $('[data-gallery-next]')?.addEventListener('click', () => go(current() + 1));
    for (const t of thumbs) t.addEventListener('click', () => go(Number(t.dataset.galleryGo)));
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(current() + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(current() - 1);
      }
    });
    let raf;
    track.addEventListener(
      'scroll',
      () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const i = current();
          thumbs.forEach((t, k) => (k === i ? t.setAttribute('aria-current', 'true') : t.removeAttribute('aria-current')));
        });
      },
      { passive: true },
    );
  }
}

/* ---------- Portada con promociones ---------- */
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const slider = $('[data-slider]');
if (slider) {
  const track = $('[data-slider-track]', slider);
  const slides = $$('.slide', track);
  const dots = $$('[data-slider-go]', slider);
  const pauseBtn = $('[data-slider-pausa]', slider);
  let index = 0;
  let timer = null;
  let paused = reduceMotion.matches;
  const go = (i, smooth = true) => {
    index = (i + slides.length) % slides.length;
    track.scrollTo({ left: index * track.clientWidth, behavior: smooth && !reduceMotion.matches ? 'smooth' : 'auto' });
  };
  const mark = () => {
    const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    index = i;
    dots.forEach((d, k) => (k === i ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
  };
  const setPaused = (v) => {
    paused = v;
    if (pauseBtn) {
      pauseBtn.setAttribute('aria-label', v ? 'Reproducir promociones' : 'Pausar promociones');
      pauseBtn.innerHTML = v
        ? '<svg class="i" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10-6.5z"/></svg>'
        : '<svg class="i" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>';
    }
    restart();
  };
  const restart = () => {
    clearInterval(timer);
    if (!paused && slides.length > 1) timer = setInterval(() => go(index + 1), 6000);
  };
  $('[data-slider-prev]', slider)?.addEventListener('click', () => { go(index - 1); restart(); });
  $('[data-slider-next]', slider)?.addEventListener('click', () => { go(index + 1); restart(); });
  dots.forEach((d) => d.addEventListener('click', () => { go(Number(d.dataset.sliderGo)); restart(); }));
  pauseBtn?.addEventListener('click', () => setPaused(!paused));
  let raf;
  track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(mark); }, { passive: true });
  // Se detiene mientras el cliente lo está mirando de cerca o usando.
  slider.addEventListener('pointerenter', () => clearInterval(timer));
  slider.addEventListener('pointerleave', restart);
  slider.addEventListener('focusin', () => clearInterval(timer));
  slider.addEventListener('focusout', restart);
  document.addEventListener('visibilitychange', () => (document.hidden ? clearInterval(timer) : restart()));
  setPaused(paused);
}

/* ---------- Filas con flechas ---------- */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-scroll]');
  if (!btn) return;
  const row = btn.closest('[data-row]');
  const track = row && $('[data-row-track]', row);
  if (!track) return;
  track.scrollBy({ left: Number(btn.dataset.scroll) * track.clientWidth * 0.85, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
});

/* ---------- Cuenta regresiva de ofertas ---------- */
for (const clock of $$('[data-countdown]')) {
  const target = () => {
    const v = clock.dataset.countdown;
    if (v) return new Date(v + ':00-05:00').getTime();
    // Sin fecha: hasta la medianoche de Colombia.
    const now = new Date();
    const bogota = new Date(now.getTime() - 5 * 3600e3);
    const end = Date.UTC(bogota.getUTCFullYear(), bogota.getUTCMonth(), bogota.getUTCDate() + 1) + 5 * 3600e3;
    return end;
  };
  const pad = (n) => String(n).padStart(2, '0');
  const tick = () => {
    let ms = Math.max(0, target() - Date.now());
    const hTotal = Math.floor(ms / 3600e3);
    ms -= hTotal * 3600e3;
    const m = Math.floor(ms / 60e3);
    const s = Math.floor((ms % 60e3) / 1000);
    $('[data-h]', clock).textContent = pad(Math.min(hTotal, 99));
    $('[data-m]', clock).textContent = pad(m);
    $('[data-s]', clock).textContent = pad(s);
  };
  tick();
  setInterval(tick, 1000);
}

/* ---------- Ordenar sin botón ---------- */
for (const sel of $$('select[data-autosubmit]')) {
  sel.addEventListener('change', () => sel.form?.requestSubmit());
}
