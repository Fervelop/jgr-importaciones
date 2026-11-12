import { Hono } from 'hono';
import { getProductsByIds, type Product } from '../lib/db';
import { getSettings, isMainStore, storeId, type Env } from '../lib/settings';
import { str } from '../lib/util';
import { unitPrice, validateCustomer } from '../../public/assets/js/order.js';

export const publicApi = new Hono<{ Bindings: Env }>();

function stateOf(p: Product) {
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

/** Estado actual de los productos del carrito (precio, unidades, agotado). */
publicApi.get('/productos/estado', async (c) => {
  const ids = (c.req.query('ids') || '')
    .split(',')
    .map((x) => parseInt(x, 10))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 100);
  const items = await getProductsByIds(c.env.DB, ids, storeId(c.env));
  return c.json({ items: items.map(stateOf) }, 200, { 'Cache-Control': 'no-store' });
});

type IncomingItem = { id: number; qty: number; variant?: Record<string, string> };

/**
 * Registra el pedido (para verlo en el panel) y devuelve los precios oficiales.
 * El precio siempre se calcula aquí con la base de datos, nunca con lo que envía el navegador.
 */
publicApi.post('/pedidos', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'El pedido llegó incompleto. Intenta de nuevo.' }, 400);
  }
  const incoming: IncomingItem[] = Array.isArray(body?.items) ? body.items.slice(0, 50) : [];
  if (!incoming.length) return c.json({ error: 'Tu carrito está vacío.' }, 400);

  const store = storeId(c.env);
  const settings = await getSettings(c.env.DB, store);
  const customer = {
    name: str(body?.customer?.name, 80).trim(),
    city: str(body?.customer?.city, 80).trim(),
    address: str(body?.customer?.address, 160).trim(),
    payment: str(body?.customer?.payment, 60).trim(),
    note: str(body?.customer?.note, 300).trim(),
  };
  if (settings.store.askCustomerData) {
    const fields = validateCustomer(customer, { payments: settings.payments, codCities: settings.store.codCities });
    if (Object.keys(fields).length) return c.json({ error: 'Completa tus datos para enviar el pedido.', fields }, 422);
  }

  const products = await getProductsByIds(
    c.env.DB,
    incoming.map((i) => Number(i.id)),
    store,
  );
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: { id: number; name: string; sku: string; variant: Record<string, string>; qty: number; unitPrice: number }[] = [];
  const problems: string[] = [];

  for (const it of incoming) {
    const p = byId.get(Number(it.id));
    if (!p) {
      problems.push('Un producto de tu carrito ya no está disponible y lo quitamos.');
      continue;
    }
    if (p.soldOut) {
      problems.push(`${p.name} se agotó y lo quitamos del pedido.`);
      continue;
    }
    // Solo se aceptan opciones que existen en el producto.
    const variant: Record<string, string> = {};
    let badOption = false;
    for (const group of p.options) {
      const chosen = it.variant ? String(it.variant[group.name] ?? '') : '';
      const value = group.values.find((v) => v.label === chosen);
      if (!value || value.soldOut) {
        badOption = true;
        break;
      }
      variant[group.name] = value.label;
    }
    if (badOption) {
      problems.push(`Revisa la opción elegida de ${p.name}.`);
      continue;
    }
    let qty = Math.max(1, Math.min(99, Math.floor(Number(it.qty) || 1)));
    if (p.stock !== null && qty > p.stock) {
      qty = p.stock;
      problems.push(`De ${p.name} solo quedan ${p.stock} unidades; ajustamos la cantidad.`);
    }
    lines.push({ id: p.id, name: p.name, sku: p.sku, variant, qty, unitPrice: unitPrice(p, variant) });
  }

  if (!lines.length) return c.json({ error: problems[0] || 'No hay productos disponibles en tu carrito.', problems }, 409);

  const total = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);

  const now = new Date(Date.now() - 5 * 3600 * 1000); // hora de Colombia
  const stamp = now.toISOString().slice(2, 10).replace(/-/g, '');
  let code = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    const rand = crypto.getRandomValues(new Uint16Array(1))[0] % 10000;
    // Los pedidos de la tienda 2 llevan otro prefijo para distinguirlos en WhatsApp.
    code = `${isMainStore(store) ? 'JGR' : 'JGR2'}-${stamp}-${String(rand).padStart(4, '0')}`;
    try {
      await c.env.DB.prepare('INSERT INTO orders (code, customer, items, total, store) VALUES (?1, ?2, ?3, ?4, ?5)')
        .bind(code, JSON.stringify(customer), JSON.stringify(lines), total, store)
        .run();
      break;
    } catch (e) {
      if (attempt === 4) throw e;
    }
  }

  return c.json({ code, items: lines, total, problems, whatsapp: settings.store.whatsapp });
});
