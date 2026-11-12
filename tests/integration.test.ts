// Pruebas contra el sitio corriendo con `npm run dev` (base de datos local con datos de muestra).
// Ejecuta: TEST_BASE_URL=http://127.0.0.1:8787 npm run test:integracion
// Necesita DEV_LOGIN=1 en .dev.vars para entrar al panel sin GitHub.
import { beforeAll, describe, expect, it } from 'vitest';

const BASE = process.env.TEST_BASE_URL;
const d = BASE ? describe : describe.skip;

let cookie = '';
const admin = (path: string, init: RequestInit = {}) =>
  fetch(`${BASE}/api/admin${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-JGR-Admin': '1', Origin: BASE!, Cookie: cookie, ...(init.headers || {}) },
  });

d('tienda pública', () => {
  it('muestra las páginas principales', async () => {
    for (const path of ['/', '/categoria/tecnologia', '/categoria/camaras', '/producto/freidora-de-aire-digital-5-5-l', '/buscar?q=camara', '/destacados', '/terminos', '/privacidad', '/cambios-y-devoluciones', '/preguntas-frecuentes', '/sitemap.xml', '/robots.txt']) {
      const r = await fetch(BASE + path);
      expect(r.status, path).toBe(200);
    }
  });

  it('responde 404 a lo que no existe', async () => {
    expect((await fetch(`${BASE}/producto/no-existe`)).status).toBe(404);
    expect((await fetch(`${BASE}/categoria/no-existe`)).status).toBe(404);
  });

  it('pagina las categorías y la segunda página es distinta', async () => {
    const p1 = await (await fetch(`${BASE}/categoria/tecnologia`)).text();
    const p2 = await (await fetch(`${BASE}/categoria/tecnologia?pagina=2`)).text();
    expect(p1).toContain('aria-label="Páginas"');
    expect(p1).not.toBe(p2);
  });

  it('ordena por precio sin que los productos sin control de unidades se adelanten', async () => {
    const html = await (await fetch(`${BASE}/categoria/tecnologia?orden=precio-asc`)).text();
    const prices = [...html.matchAll(/class="precio__actual" data-price>\$([\d.]+)</g)].map((m) => Number(m[1].replace(/\./g, '')));
    const available = prices.slice(0, -1);
    expect(available.length).toBeGreaterThan(3);
    expect(available).toEqual([...available].sort((a, b) => a - b));
  });

  it('el inicio muestra slides, categorías, ofertas, destacados, banners y temporada', async () => {
    const html = await (await fetch(`${BASE}/`)).text();
    for (const needle of ['data-slider', 'class="mosaico"', 'id="ofertas"', 'data-countdown', 'class="exhibicion"', 'class="promos', 't-temporada', 't-descubre']) {
      expect(html, needle).toContain(needle);
    }
    const ofertas = await (await fetch(`${BASE}/ofertas`)).text();
    expect(ofertas).toContain('precio--oferta');
  });

  it('el inicio usa el logo, el modo claro por defecto y el número de WhatsApp', async () => {
    const html = await (await fetch(`${BASE}/`)).text();
    expect(html).toContain('data-theme="light"');
    expect(html).toContain('/marca/logo.webp');
    expect(html).toContain('573026983562');
    expect(html).toContain('data-theme-toggle');
  });

  it('el producto muestra precio anterior tachado, oferta y unidades', async () => {
    const html = await (await fetch(`${BASE}/producto/audifonos-inalambricos-con-cancelacion-de-ruido`)).text();
    expect(html).toContain('precio--oferta');
    expect(html).toContain('<s data-compare>$319.900</s>');
    expect(html).toContain('9 unidades disponibles');
  });
});

const CLIENTE = { name: 'Cliente Prueba', city: 'Bogotá', address: 'Calle 1 # 2-3, Centro', payment: 'Nequi' };

d('pedidos', () => {
  it('exige los datos de envío y respeta las ciudades con contraentrega', async () => {
    const send = (customer: unknown) =>
      fetch(`${BASE}/api/pedidos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ id: 1, qty: 1 }], customer }) });
    const empty = await send({});
    expect(empty.status).toBe(422);
    expect(Object.keys(((await empty.json()) as any).fields).sort()).toEqual(['address', 'city', 'name', 'payment']);
    const cod = await send({ ...CLIENTE, city: 'Medellín', payment: 'Efectivo contraentrega (solo Ibagué y Bogotá)' });
    expect(cod.status).toBe(422);
    expect((await send({ ...CLIENTE, city: 'Ibagué', payment: 'Efectivo contraentrega (solo Ibagué y Bogotá)' })).status).toBe(200);
  });

  it('recalcula el precio en el servidor e ignora el que manda el navegador', async () => {
    const r = await fetch(`${BASE}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: 7, qty: 2, variant: { Color: 'Champaña' }, unitPrice: 1 }], customer: CLIENTE }),
    });
    expect(r.status).toBe(200);
    const data = await r.json() as any;
    expect(data.code).toMatch(/^JGR-\d{6}-\d{4}$/);
    expect(data.items[0].unitPrice).toBe(249900);
    expect(data.total).toBe(499800);
  });

  it('rechaza variantes que no existen y productos agotados', async () => {
    const bad = await fetch(`${BASE}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: 7, qty: 1, variant: { Color: 'Morado' } }], customer: CLIENTE }),
    });
    expect(bad.status).toBe(409);
    const soldOut = await fetch(`${BASE}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: 9, qty: 1 }], customer: CLIENTE }),
    });
    expect(soldOut.status).toBe(409);
  });

  it('ajusta la cantidad a las unidades disponibles', async () => {
    const r = await fetch(`${BASE}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: 11, qty: 50, variant: { Color: 'Negro' } }], customer: CLIENTE }),
    });
    const data = await r.json() as any;
    expect(data.items[0].qty).toBe(2);
    expect(data.problems.length).toBe(1);
  });
});

d('panel de administración', () => {
  beforeAll(async () => {
    const r = await fetch(`${BASE}/auth/dev`, { redirect: 'manual' });
    cookie = (r.headers.get('set-cookie') || '').split(';')[0];
    expect(cookie).toContain('jgr_admin=');
  });

  it('bloquea la API sin sesión y sin el encabezado de seguridad', async () => {
    expect((await fetch(`${BASE}/api/admin/resumen`)).status).toBe(401);
    const noHeader = await fetch(`${BASE}/api/admin/productos`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: '{}' });
    expect(noHeader.status).toBe(403);
    const otherSite = await fetch(`${BASE}/api/admin/productos`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-JGR-Admin': '1', Origin: 'https://otro-sitio.com' },
      body: '{}',
    });
    expect(otherSite.status).toBe(403);
  });

  it('rechaza una cookie inventada', async () => {
    const r = await fetch(`${BASE}/api/admin/resumen`, { headers: { Cookie: 'jgr_admin=eyJsb2dpbiI6ImhhY2sifQ.firma' } });
    expect(r.status).toBe(401);
  });

  it('crea, edita, oculta y elimina un producto', async () => {
    const created = await ((await admin('/productos', { method: 'POST', body: JSON.stringify({ name: 'Producto de prueba', price: 50000, compareAtPrice: 70000, stock: 4, categoryId: 2 }) })).json() as Promise<any>);
    const id = created.item.id;
    expect(created.item.slug).toBe('producto-de-prueba');
    let html = await (await fetch(`${BASE}/producto/producto-de-prueba`)).text();
    expect(html).toContain('$50.000');
    expect(html).toContain('Quedan 4 unidades');

    const patched = await ((await admin(`/productos/${id}`, { method: 'PATCH', body: JSON.stringify({ price: 45000, visible: false }) })).json() as Promise<any>);
    expect(patched.item.price).toBe(45000);
    expect((await fetch(`${BASE}/producto/producto-de-prueba`)).status).toBe(404);

    const invalid = await admin(`/productos/${id}`, { method: 'PUT', body: JSON.stringify({ name: 'X', price: 100, compareAtPrice: 50 }) });
    expect(invalid.status).toBe(422);
    expect(((await invalid.json()) as any).field).toBe('compareAtPrice');

    expect((await admin(`/productos/${id}`, { method: 'DELETE' })).status).toBe(200);
    expect((await admin(`/productos/${id}`)).status).toBe(404);
  });

  it('crea subcategorías e impide un tercer nivel', async () => {
    const sub = await ((await admin('/categorias', { method: 'POST', body: JSON.stringify({ name: 'Prueba sub', parentId: 1 }) })).json() as Promise<any>);
    expect(sub.item.parentId).toBe(1);
    const third = await admin('/categorias', { method: 'POST', body: JSON.stringify({ name: 'Nieta', parentId: sub.item.id }) });
    expect(third.status).toBe(422);
    expect((await admin(`/categorias/${sub.item.id}`, { method: 'DELETE' })).status).toBe(200);
  });

  it('los cambios de colores y textos del inicio se ven en la tienda al instante', async () => {
    const { settings } = await ((await admin('/ajustes')).json() as Promise<any>);
    const original = structuredClone(settings);
    await admin('/ajustes/theme', { method: 'PUT', body: JSON.stringify({ ...settings.theme, light: { ...settings.theme.light, bg: '#FFEEDD' } }) });
    await admin('/ajustes/home', { method: 'PUT', body: JSON.stringify({ ...settings.home, slides: [{ ...settings.home.slides[0], title: 'Título editado desde el panel' }], showOffers: false }) });
    const html = await (await fetch(`${BASE}/`)).text();
    expect(html).toContain('--bg:#FFEEDD');
    expect(html).toContain('Título editado desde el panel');
    expect(html).not.toContain('id="ofertas"');
    await admin('/ajustes/theme', { method: 'PUT', body: JSON.stringify(original.theme) });
    await admin('/ajustes/home', { method: 'PUT', body: JSON.stringify(original.home) });
  });

  it('sube una imagen a R2 y la sirve', async () => {
    const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
    const fd = new FormData();
    fd.append('archivo', new Blob([png], { type: 'image/png' }), 'punto.png');
    const r = await fetch(`${BASE}/api/admin/subir`, { method: 'POST', headers: { 'X-JGR-Admin': '1', Origin: BASE!, Cookie: cookie }, body: fd });
    expect(r.status).toBe(201);
    const { url } = await r.json() as any;
    const img = await fetch(BASE + url);
    expect(img.status).toBe(200);
    expect(img.headers.get('content-type')).toBe('image/png');
    const svg = new FormData();
    svg.append('archivo', new Blob(['<svg/>'], { type: 'image/svg+xml' }), 'x.svg');
    expect((await fetch(`${BASE}/api/admin/subir`, { method: 'POST', headers: { 'X-JGR-Admin': '1', Origin: BASE!, Cookie: cookie }, body: svg })).status).toBe(415);
  });

  it('lista pedidos y cambia su estado', async () => {
    const { items } = await ((await admin('/pedidos')).json() as Promise<any>);
    expect(items.length).toBeGreaterThan(0);
    expect((await admin(`/pedidos/${items[0].id}`, { method: 'PATCH', body: JSON.stringify({ status: 'confirmado' }) })).status).toBe(200);
    expect((await admin(`/pedidos/${items[0].id}`, { method: 'PATCH', body: JSON.stringify({ status: 'inventado' }) })).status).toBe(422);
  });
});
