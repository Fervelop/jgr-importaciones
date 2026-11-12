import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { SESSION_COOKIE, sessionFitsStore, sessionSecret, verifySession, type Session } from '../lib/auth';
import {
  deleteCategory,
  deleteProduct,
  getProductById,
  listCategories,
  reorder,
  saveCategory,
  saveProduct,
  setStorePrice,
  ValidationError,
} from '../lib/db';
import { SETTINGS_SECTIONS, TRUST_ICONS, DEFAULT_SETTINGS, type SettingsSection } from '../lib/defaults';
import { getSettings, getStoreOverrides, isMainStore, saveSection, saveStoreOverrides, storeId, type Env } from '../lib/settings';
import { parseJSON, toInt } from '../lib/util';

type Vars = { session: Session; store: string };

/**
 * Lo único que puede hacer el panel de una tienda secundaria: ver el resumen, poner sus precios,
 * manejar sus pedidos y cambiar su WhatsApp. Todo lo demás (productos, fotos, categorías,
 * textos, colores) es de JGR y se responde 403.
 */
const SECONDARY_ROUTES: [string, RegExp][] = [
  ['GET', /^\/me$/],
  ['GET', /^\/resumen$/],
  ['GET', /^\/categorias$/],
  ['GET', /^\/precios$/],
  ['PUT', /^\/precios\/\d+$/],
  ['GET', /^\/pedidos$/],
  ['PATCH', /^\/pedidos\/\d+$/],
  ['DELETE', /^\/pedidos\/\d+$/],
  ['GET', /^\/tienda-propia$/],
  ['PUT', /^\/tienda-propia$/],
];
/** Rutas que solo existen en el panel de la tienda secundaria. */
const SECONDARY_ONLY = /^\/(precios|tienda-propia)(\/|$)/;

export function allowedFor(store: string, method: string, path: string): boolean {
  const m = method === 'HEAD' ? 'GET' : method;
  if (isMainStore(store)) return !SECONDARY_ONLY.test(path);
  return SECONDARY_ROUTES.some(([mm, re]) => mm === m && re.test(path));
}
export const adminApi = new Hono<{ Bindings: Env; Variables: Vars }>();

// Toda la API del panel exige sesión. Las escrituras además exigen el encabezado propio
// y que el origen sea el mismo sitio (protección contra CSRF).
adminApi.use('*', async (c, next) => {
  let session: Session | null = null;
  try {
    session = await verifySession(getCookie(c, SESSION_COOKIE), sessionSecret(c.env));
  } catch {
    return c.json({ error: 'Falta configurar SESSION_SECRET en Cloudflare.' }, 500);
  }
  if (!session || !sessionFitsStore(session, c.env)) return c.json({ error: 'Tu sesión terminó. Vuelve a entrar con GitHub.' }, 401);
  const store = storeId(c.env);
  const path = c.req.path.replace(/^\/api\/admin/, '') || '/';
  if (!allowedFor(store, c.req.method, path)) {
    if (isMainStore(store)) return c.json({ error: 'No encontrado.' }, 404);
    return c.json({ error: 'Esto se cambia desde el panel de JGR. Aquí solo manejas los precios, los pedidos y el WhatsApp de esta tienda.' }, 403);
  }
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    const origin = c.req.header('Origin');
    const self = new URL(c.req.url).origin;
    if (c.req.header('X-JGR-Admin') !== '1' || (origin && origin !== self)) {
      return c.json({ error: 'Solicitud no permitida.' }, 403);
    }
  }
  c.set('session', session);
  c.set('store', store);
  await next();
});

adminApi.onError((err, c) => {
  if (err instanceof ValidationError) return c.json({ error: err.message, field: err.field }, 422);
  console.error(err);
  return c.json({ error: 'Algo falló al guardar. Revisa los datos e intenta de nuevo.' }, 500);
});

adminApi.get('/me', (c) => c.json({ user: c.get('session') }));

adminApi.get('/resumen', async (c) => {
  const db = c.env.DB;
  const store = c.get('store');
  if (!isMainStore(store)) return c.json(await secondarySummary(db, store));
  const settings = await getSettings(db);
  const t = settings.store.lowStockThreshold;
  const [p, cats, orders, recent] = await Promise.all([
    db
      .prepare(
        `SELECT COUNT(*) AS total,
          SUM(CASE WHEN visible = 1 THEN 1 ELSE 0 END) AS visibles,
          SUM(CASE WHEN sold_out = 1 OR stock = 0 THEN 1 ELSE 0 END) AS agotados,
          SUM(CASE WHEN stock IS NOT NULL AND stock > 0 AND stock <= ?1 AND sold_out = 0 THEN 1 ELSE 0 END) AS pocas
         FROM products`,
      )
      .bind(t)
      .first(),
    db.prepare('SELECT COUNT(*) AS n FROM categories').first<{ n: number }>(),
    db
      .prepare("SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS suma FROM orders WHERE store = ?1 AND created_at >= datetime('now','-7 days')")
      .bind(store)
      .first(),
    db.prepare('SELECT * FROM orders WHERE store = ?1 ORDER BY id DESC LIMIT 5').bind(store).all(),
  ]);
  return c.json({
    productos: p,
    categorias: cats?.n || 0,
    pedidos7: orders,
    recientes: (recent.results || []).map(orderRow),
  });
});

async function secondarySummary(db: D1Database, store: string) {
  const [p, orders, recent, own, main] = await Promise.all([
    db
      .prepare(
        `SELECT COUNT(*) AS total,
          SUM(CASE WHEN sp.product_id IS NOT NULL THEN 1 ELSE 0 END) AS conPrecio,
          SUM(CASE WHEN sp.product_id IS NOT NULL AND p.visible = 1 THEN 1 ELSE 0 END) AS visibles,
          SUM(CASE WHEN sp.product_id IS NOT NULL AND sp.compare_at_price > sp.price THEN 1 ELSE 0 END) AS ofertas
         FROM products p LEFT JOIN store_prices sp ON sp.product_id = p.id AND sp.store = ?1`,
      )
      .bind(store)
      .first(),
    db
      .prepare("SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS suma FROM orders WHERE store = ?1 AND created_at >= datetime('now','-7 days')")
      .bind(store)
      .first(),
    db.prepare('SELECT * FROM orders WHERE store = ?1 ORDER BY id DESC LIMIT 5').bind(store).all(),
    getStoreOverrides(db, store),
    getSettings(db),
  ]);
  return {
    productos: p,
    pedidos7: orders,
    recientes: (recent.results || []).map(orderRow),
    whatsapp: own.whatsapp,
    whatsappJGR: main.store.whatsapp,
  };
}

/* ---------- Tienda secundaria: WhatsApp y precios ---------- */

adminApi.get('/tienda-propia', async (c) => {
  const store = c.get('store');
  const [own, main] = await Promise.all([getStoreOverrides(c.env.DB, store), getSettings(c.env.DB)]);
  return c.json({ value: own, whatsappJGR: main.store.whatsapp });
});

adminApi.put('/tienda-propia', async (c) => {
  const body = await c.req.json();
  const value = await saveStoreOverrides(c.env.DB, c.get('store'), body);
  return c.json({ value });
});

/** Todos los productos de JGR con el precio de JGR (referencia) y el de esta tienda. */
adminApi.get('/precios', async (c) => {
  const db = c.env.DB;
  const store = c.get('store');
  const q = (c.req.query('q') || '').trim().slice(0, 80);
  const categoria = toInt(c.req.query('categoria'), 0, 0);
  const estado = c.req.query('estado') || 'todos';
  const page = toInt(c.req.query('pagina'), 1, 1);
  const perPage = 25;
  const binds: unknown[] = [store];
  const bind = (v: unknown) => {
    binds.push(v);
    return `?${binds.length}`;
  };
  const where: string[] = [];
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (m) => '\\' + m)}%`;
    where.push(`(p.name LIKE ${bind(like)} ESCAPE '\\' OR p.sku LIKE ${bind(like)} ESCAPE '\\')`);
  }
  if (categoria) {
    where.push(`(p.category_id = ${bind(categoria)} OR p.category_id IN (SELECT id FROM categories WHERE parent_id = ${bind(categoria)}))`);
  }
  if (estado === 'con-precio') where.push('sp.product_id IS NOT NULL');
  if (estado === 'sin-precio') where.push('sp.product_id IS NULL');
  if (estado === 'ofertas') where.push('sp.compare_at_price > sp.price');
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const from = 'FROM products p LEFT JOIN store_prices sp ON sp.product_id = p.id AND sp.store = ?1';
  const total = Number((await db.prepare(`SELECT COUNT(*) AS n ${from} ${w}`).bind(...binds).first<{ n: number }>())?.n) || 0;
  const res = await db
    .prepare(
      `SELECT p.id, p.slug, p.name, p.sku, p.category_id, p.price AS main_price, p.compare_at_price AS main_compare,
        p.visible, p.sold_out, p.stock, p.images, p.options, sp.price AS price, sp.compare_at_price AS compare_at_price
       ${from} ${w} ORDER BY p.sort_order ASC, p.id DESC LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`,
    )
    .bind(...binds)
    .all();
  const items = (res.results || []).map((r: any) => {
    const images = parseJSON<{ url: string }[]>(r.images, []);
    const options = parseJSON<unknown[]>(r.options, []);
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      sku: r.sku || '',
      categoryId: r.category_id ?? null,
      image: images[0]?.url || '',
      variants: options.length,
      visible: !!r.visible,
      soldOut: !!r.sold_out || r.stock === 0,
      mainPrice: Number(r.main_price) || 0,
      mainCompareAtPrice: r.main_compare ? Number(r.main_compare) : null,
      price: r.price === null || r.price === undefined ? null : Number(r.price),
      compareAtPrice: r.compare_at_price ? Number(r.compare_at_price) : null,
    };
  });
  return c.json({ items, total, page, pages: Math.max(1, Math.ceil(total / perPage)) });
});

/** Pone o quita el precio de un producto en esta tienda. Precio vacío = no se vende aquí. */
adminApi.put('/precios/:id', async (c) => {
  const id = toInt(c.req.param('id'), 0, 1);
  if (!(await getProductById(c.env.DB, id))) return c.json({ error: 'Ese producto no existe.' }, 404);
  const value = await setStorePrice(c.env.DB, c.get('store'), id, await c.req.json());
  return c.json({ value });
});

/* ---------- Ajustes ---------- */

adminApi.get('/ajustes', async (c) => {
  return c.json({ settings: await getSettings(c.env.DB), defaults: DEFAULT_SETTINGS, icons: TRUST_ICONS });
});

adminApi.put('/ajustes/:section', async (c) => {
  const section = c.req.param('section') as SettingsSection;
  if (!(SETTINGS_SECTIONS as readonly string[]).includes(section)) return c.json({ error: 'Sección desconocida.' }, 404);
  const body = await c.req.json();
  const saved = await saveSection(c.env.DB, section, body);
  return c.json({ section, value: saved });
});

/* ---------- Categorías ---------- */

adminApi.get('/categorias', async (c) => c.json({ items: await listCategories(c.env.DB, true) }));

adminApi.post('/categorias', async (c) => c.json({ item: await saveCategory(c.env.DB, await c.req.json()) }, 201));

adminApi.put('/categorias/:id', async (c) => {
  const id = toInt(c.req.param('id'), 0, 1);
  return c.json({ item: await saveCategory(c.env.DB, await c.req.json(), id) });
});

adminApi.delete('/categorias/:id', async (c) => {
  await deleteCategory(c.env.DB, toInt(c.req.param('id'), 0, 1));
  return c.json({ ok: true });
});

adminApi.post('/categorias/orden', async (c) => {
  const body = await c.req.json();
  await reorder(c.env.DB, 'categories', (body?.ids || []).map(Number));
  return c.json({ ok: true });
});

/* ---------- Productos ---------- */

adminApi.get('/productos', async (c) => {
  const db = c.env.DB;
  const settings = await getSettings(db);
  const q = (c.req.query('q') || '').trim().slice(0, 80);
  const categoria = toInt(c.req.query('categoria'), 0, 0);
  const estado = c.req.query('estado') || 'todos';
  const page = toInt(c.req.query('pagina'), 1, 1);
  const perPage = 25;
  const where: string[] = [];
  const binds: unknown[] = [];
  const bind = (v: unknown) => {
    binds.push(v);
    return `?${binds.length}`;
  };
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (m) => '\\' + m)}%`;
    where.push(`(name LIKE ${bind(like)} ESCAPE '\\' OR sku LIKE ${bind(like)} ESCAPE '\\')`);
  }
  if (categoria) {
    where.push(`(category_id = ${bind(categoria)} OR category_id IN (SELECT id FROM categories WHERE parent_id = ${bind(categoria)}))`);
  }
  if (estado === 'visibles') where.push('visible = 1');
  if (estado === 'ocultos') where.push('visible = 0');
  if (estado === 'agotados') where.push('(sold_out = 1 OR stock = 0)');
  if (estado === 'pocas') where.push(`(stock IS NOT NULL AND stock > 0 AND stock <= ${bind(settings.store.lowStockThreshold)} AND sold_out = 0)`);
  if (estado === 'destacados') where.push('featured = 1');
  if (estado === 'sin-categoria') where.push('category_id IS NULL');
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = Number((await db.prepare(`SELECT COUNT(*) AS n FROM products ${w}`).bind(...binds).first<{ n: number }>())?.n) || 0;
  const res = await db
    .prepare(`SELECT * FROM products ${w} ORDER BY sort_order ASC, id DESC LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`)
    .bind(...binds)
    .all();
  const items = await Promise.all((res.results || []).map((r: any) => getProductById(db, r.id)));
  return c.json({ items, total, page, pages: Math.max(1, Math.ceil(total / perPage)) });
});

adminApi.get('/productos/:id', async (c) => {
  const p = await getProductById(c.env.DB, toInt(c.req.param('id'), 0, 1));
  return p ? c.json({ item: p }) : c.json({ error: 'Ese producto no existe.' }, 404);
});

adminApi.post('/productos', async (c) => c.json({ item: await saveProduct(c.env.DB, await c.req.json()) }, 201));

adminApi.put('/productos/:id', async (c) => {
  const id = toInt(c.req.param('id'), 0, 1);
  if (!(await getProductById(c.env.DB, id))) return c.json({ error: 'Ese producto no existe.' }, 404);
  return c.json({ item: await saveProduct(c.env.DB, await c.req.json(), id) });
});

/** Cambio rápido de uno o varios campos desde la lista (visible, destacado, unidades, precio). */
adminApi.patch('/productos/:id', async (c) => {
  const id = toInt(c.req.param('id'), 0, 1);
  const current = await getProductById(c.env.DB, id);
  if (!current) return c.json({ error: 'Ese producto no existe.' }, 404);
  const changes = await c.req.json();
  const allowed = ['visible', 'featured', 'soldOutFlag', 'stock', 'price', 'compareAtPrice', 'categoryId', 'sortOrder'];
  const merged: any = { ...current };
  for (const k of allowed) if (k in changes) merged[k] = changes[k];
  return c.json({ item: await saveProduct(c.env.DB, merged, id) });
});

adminApi.post('/productos/:id/duplicar', async (c) => {
  const current = await getProductById(c.env.DB, toInt(c.req.param('id'), 0, 1));
  if (!current) return c.json({ error: 'Ese producto no existe.' }, 404);
  const copy = { ...current, name: `${current.name} (copia)`, slug: `${current.slug}-copia`, visible: false, featured: false };
  return c.json({ item: await saveProduct(c.env.DB, copy) }, 201);
});

adminApi.delete('/productos/:id', async (c) => {
  await deleteProduct(c.env.DB, toInt(c.req.param('id'), 0, 1));
  return c.json({ ok: true });
});

adminApi.post('/productos/orden', async (c) => {
  const body = await c.req.json();
  await reorder(c.env.DB, 'products', (body?.ids || []).map(Number));
  return c.json({ ok: true });
});

/* ---------- Imágenes ---------- */

const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};
const MAX_BYTES = 10 * 1024 * 1024;

adminApi.post('/subir', async (c) => {
  const form = await c.req.formData();
  const file = form.get('archivo');
  if (!file || typeof file === 'string') return c.json({ error: 'No llegó ninguna imagen.' }, 400);
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return c.json({ error: 'Formato no permitido. Usa JPG, PNG, WEBP, AVIF o GIF.' }, 415);
  if (ext === 'svg') return c.json({ error: 'Por seguridad no se aceptan SVG. Usa PNG o WEBP.' }, 415);
  if (file.size > MAX_BYTES) return c.json({ error: 'La imagen pesa más de 10 MB. Redúcela e intenta de nuevo.' }, 413);
  const now = new Date();
  const key = `subidas/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${ext}`;
  await c.env.IMAGES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
    customMetadata: { subidoPor: c.get('session').login, nombre: file.name.slice(0, 120) },
  });
  return c.json({ url: `/img/${key}` }, 201);
});

/* ---------- Pedidos ---------- */

function orderRow(r: any) {
  return {
    id: r.id,
    code: r.code,
    customer: parseJSON(r.customer, {}),
    items: parseJSON(r.items, []),
    total: Number(r.total) || 0,
    status: r.status,
    createdAt: r.created_at,
  };
}

export const ORDER_STATUSES = ['nuevo', 'confirmado', 'enviado', 'entregado', 'cancelado'];

adminApi.get('/pedidos', async (c) => {
  const page = toInt(c.req.query('pagina'), 1, 1);
  const estado = c.req.query('estado') || '';
  const perPage = 25;
  const store = c.get('store');
  const where = ORDER_STATUSES.includes(estado) ? 'WHERE store = ?1 AND status = ?2' : 'WHERE store = ?1';
  const binds = ORDER_STATUSES.includes(estado) ? [store, estado] : [store];
  const total = Number((await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM orders ${where}`).bind(...binds).first<{ n: number }>())?.n) || 0;
  const res = await c.env.DB.prepare(`SELECT * FROM orders ${where} ORDER BY id DESC LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`)
    .bind(...binds)
    .all();
  return c.json({ items: (res.results || []).map(orderRow), total, page, pages: Math.max(1, Math.ceil(total / perPage)), statuses: ORDER_STATUSES });
});

adminApi.patch('/pedidos/:id', async (c) => {
  const body = await c.req.json();
  if (!ORDER_STATUSES.includes(body?.status)) return c.json({ error: 'Estado no válido.' }, 422);
  await c.env.DB.prepare('UPDATE orders SET status = ?1 WHERE id = ?2 AND store = ?3')
    .bind(body.status, toInt(c.req.param('id'), 0, 1), c.get('store'))
    .run();
  return c.json({ ok: true });
});

adminApi.delete('/pedidos/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM orders WHERE id = ?1 AND store = ?2').bind(toInt(c.req.param('id'), 0, 1), c.get('store')).run();
  return c.json({ ok: true });
});
