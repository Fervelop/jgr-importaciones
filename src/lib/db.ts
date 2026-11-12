import { parseJSON, safeImage, slugify, str, toInt } from './util';

export type OptionValue = { label: string; delta: number; soldOut: boolean };
export type ProductOption = { name: string; values: OptionValue[] };
export type ProductImage = { url: string; alt: string };
export type Spec = { label: string; value: string };

export type Product = {
  id: number;
  categoryId: number | null;
  slug: string;
  name: string;
  brand: string;
  sku: string;
  shortDescription: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  stock: number | null;
  /** Agotado efectivo: marcado a mano o sin unidades. */
  soldOut: boolean;
  /** Marca manual de agotado. */
  soldOutFlag: boolean;
  featured: boolean;
  visible: boolean;
  sortOrder: number;
  images: ProductImage[];
  options: ProductOption[];
  specs: Spec[];
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: number;
  parentId: number | null;
  slug: string;
  name: string;
  description: string;
  image: string;
  sortOrder: number;
  visible: boolean;
  productCount: number;
};

export type CategoryTree = Category & { children: Category[]; totalCount: number };

function rowToProduct(r: any): Product {
  const stock = r.stock === null || r.stock === undefined ? null : Number(r.stock);
  const soldOutFlag = !!r.sold_out;
  return {
    id: r.id,
    categoryId: r.category_id ?? null,
    slug: r.slug,
    name: r.name,
    brand: r.brand || '',
    sku: r.sku || '',
    shortDescription: r.short_description || '',
    description: r.description || '',
    price: Number(r.price) || 0,
    compareAtPrice: r.compare_at_price ? Number(r.compare_at_price) : null,
    stock,
    soldOut: soldOutFlag || stock === 0,
    soldOutFlag,
    featured: !!r.featured,
    visible: !!r.visible,
    sortOrder: Number(r.sort_order) || 0,
    images: parseJSON<ProductImage[]>(r.images, []),
    options: parseJSON<ProductOption[]>(r.options, []),
    specs: parseJSON<Spec[]>(r.specs, []),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToCategory(r: any): Category {
  return {
    id: r.id,
    parentId: r.parent_id ?? null,
    slug: r.slug,
    name: r.name,
    description: r.description || '',
    image: r.image || '',
    sortOrder: Number(r.sort_order) || 0,
    visible: !!r.visible,
    productCount: Number(r.product_count) || 0,
  };
}

/* ---------- Tienda: de dónde salen los productos ---------- */

const MAIN = 'jgr';
const PRODUCT_COLS = [
  'id', 'category_id', 'slug', 'name', 'brand', 'sku', 'short_description', 'description', 'stock', 'sold_out',
  'featured', 'visible', 'sort_order', 'images', 'options', 'specs', 'created_at', 'updated_at',
];

/**
 * Tabla de productos que ve cada tienda.
 * - JGR: la tabla `products` tal cual.
 * - Otra tienda: los mismos productos, pero solo los que tienen precio en `store_prices`
 *   para esa tienda, y con ese precio (y su precio anterior) en lugar del de JGR.
 */
export function productSource(store: string = MAIN): string {
  if (store === MAIN) return 'products';
  if (!/^[a-z0-9]{1,20}$/.test(store)) throw new Error('Tienda no válida');
  const cols = PRODUCT_COLS.map((c) => `p0.${c}`).join(', ');
  return `(SELECT ${cols}, sp.price AS price, sp.compare_at_price AS compare_at_price
    FROM products p0 JOIN store_prices sp ON sp.product_id = p0.id AND sp.store = '${store}')`;
}

/* ---------- Categorías ---------- */

export async function listCategories(db: D1Database, includeHidden = false, store: string = MAIN): Promise<Category[]> {
  const res = await db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM ${productSource(store)} p WHERE p.category_id = c.id ${
        includeHidden ? '' : 'AND p.visible = 1'
      }) AS product_count
       FROM categories c ${includeHidden ? '' : 'WHERE c.visible = 1'}
       ORDER BY c.sort_order ASC, c.name ASC`,
    )
    .all();
  return (res.results || []).map(rowToCategory);
}

/** Árbol de dos niveles: categorías principales con sus subcategorías. */
export function buildTree(categories: Category[]): CategoryTree[] {
  const ids = new Set(categories.map((c) => c.id));
  const roots = categories.filter((c) => c.parentId === null || !ids.has(c.parentId));
  return roots.map((root) => {
    const children = categories.filter((c) => c.parentId === root.id);
    const totalCount = root.productCount + children.reduce((s, c) => s + c.productCount, 0);
    return { ...root, children, totalCount };
  });
}

export async function getCategoryBySlug(db: D1Database, slug: string) {
  const r = await db.prepare('SELECT * FROM categories WHERE slug = ?1 AND visible = 1').bind(slug).first();
  return r ? rowToCategory(r) : null;
}

export async function getCategoryById(db: D1Database, id: number) {
  const r = await db.prepare('SELECT * FROM categories WHERE id = ?1').bind(id).first();
  return r ? rowToCategory(r) : null;
}

/* ---------- Productos ---------- */

export type ProductQuery = {
  categoryIds?: number[];
  q?: string;
  sort?: string;
  page?: number;
  perPage?: number;
  includeHidden?: boolean;
  featuredOnly?: boolean;
  onSaleOnly?: boolean;
  excludeId?: number;
  /** Tienda que pide los productos (por defecto JGR). */
  store?: string;
};

export const SORTS: Record<string, { label: string; sql: string }> = {
  destacados: { label: 'Destacados', sql: 'p.featured DESC, p.sort_order ASC, p.id DESC' },
  descuento: { label: 'Mayor descuento', sql: 'CAST(p.compare_at_price - p.price AS REAL) / COALESCE(p.compare_at_price, p.price) DESC' },
  recientes: { label: 'Más recientes', sql: 'p.created_at DESC, p.id DESC' },
  'precio-asc': { label: 'Precio: menor a mayor', sql: 'p.price ASC' },
  'precio-desc': { label: 'Precio: mayor a menor', sql: 'p.price DESC' },
  nombre: { label: 'Nombre (A–Z)', sql: 'p.name COLLATE NOCASE ASC' },
};

function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (m) => '\\' + m);
}

export async function listProducts(db: D1Database, q: ProductQuery) {
  const where: string[] = [];
  const binds: unknown[] = [];
  const add = (sql: string, ...vals: unknown[]) => {
    let i = 0;
    where.push(
      sql.replace(/\?/g, () => {
        binds.push(vals[i++]);
        return `?${binds.length}`;
      }),
    );
  };
  if (!q.includeHidden) add('p.visible = 1');
  if (q.featuredOnly) add('p.featured = 1');
  if (q.onSaleOnly) add('p.compare_at_price IS NOT NULL AND p.compare_at_price > p.price');
  if (q.excludeId) add('p.id != ?', q.excludeId);
  if (q.categoryIds && q.categoryIds.length) {
    const marks = q.categoryIds.map((id) => {
      binds.push(id);
      return `?${binds.length}`;
    });
    where.push(`p.category_id IN (${marks.join(',')})`);
  }
  const term = (q.q || '').trim().slice(0, 80);
  if (term) {
    const like = `%${escapeLike(term)}%`;
    add(
      "(p.name LIKE ? ESCAPE '\\' OR p.brand LIKE ? ESCAPE '\\' OR p.short_description LIKE ? ESCAPE '\\' OR p.sku LIKE ? ESCAPE '\\')",
      like,
      like,
      like,
      like,
    );
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sort = SORTS[q.sort || ''] || SORTS.destacados;
  const perPage = toInt(q.perPage, 12, 1, 100);
  const page = toInt(q.page, 1, 1, 10000);
  const offset = (page - 1) * perPage;
  // Los agotados siempre al final para que el cliente vea primero lo que puede comprar.
  const order = `(p.sold_out = 1 OR COALESCE(p.stock, 1) = 0) ASC, ${sort.sql}`;

  const countRow = await db
    .prepare(`SELECT COUNT(*) AS n FROM ${productSource(q.store)} p ${whereSql}`)
    .bind(...binds)
    .first<{ n: number }>();
  const total = Number(countRow?.n) || 0;
  const res = await db
    .prepare(`SELECT p.* FROM ${productSource(q.store)} p ${whereSql} ORDER BY ${order} LIMIT ${perPage} OFFSET ${offset}`)
    .bind(...binds)
    .all();
  const items = (res.results || []).map(rowToProduct);
  return { items, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getProductBySlug(db: D1Database, slug: string, includeHidden = false, store: string = MAIN) {
  const r = await db
    .prepare(`SELECT * FROM ${productSource(store)} WHERE slug = ?1 ${includeHidden ? '' : 'AND visible = 1'}`)
    .bind(slug)
    .first();
  return r ? rowToProduct(r) : null;
}

export async function getProductById(db: D1Database, id: number) {
  const r = await db.prepare('SELECT * FROM products WHERE id = ?1').bind(id).first();
  return r ? rowToProduct(r) : null;
}

export async function getProductsByIds(db: D1Database, ids: number[], store: string = MAIN) {
  const clean = [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))].slice(0, 100);
  if (!clean.length) return [];
  const marks = clean.map((_, i) => `?${i + 1}`).join(',');
  const res = await db
    .prepare(`SELECT * FROM ${productSource(store)} WHERE visible = 1 AND id IN (${marks})`)
    .bind(...clean)
    .all();
  return (res.results || []).map(rowToProduct);
}

/* ---------- Escritura (panel) ---------- */

export type ProductInput = Partial<{
  categoryId: number | null;
  slug: string;
  name: string;
  brand: string;
  sku: string;
  shortDescription: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  stock: number | null;
  soldOutFlag: boolean;
  featured: boolean;
  visible: boolean;
  sortOrder: number;
  images: ProductImage[];
  options: ProductOption[];
  specs: Spec[];
}>;

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
  }
}

export function cleanProductInput(input: any) {
  const name = str(input?.name, 160).trim();
  if (!name) throw new ValidationError('name', 'Escribe el nombre del producto.');
  const price = toInt(input?.price, NaN, 0, 1_000_000_000);
  if (!Number.isFinite(price)) throw new ValidationError('price', 'Escribe el precio en pesos, solo números.');
  let compare: number | null = null;
  if (input?.compareAtPrice !== null && input?.compareAtPrice !== undefined && input?.compareAtPrice !== '') {
    compare = toInt(input.compareAtPrice, NaN, 0, 1_000_000_000);
    if (!Number.isFinite(compare)) throw new ValidationError('compareAtPrice', 'El precio anterior debe ser un número.');
    if (compare <= price) throw new ValidationError('compareAtPrice', 'El precio anterior debe ser mayor que el precio actual.');
  }
  let stock: number | null = null;
  if (input?.stock !== null && input?.stock !== undefined && input?.stock !== '') {
    stock = toInt(input.stock, NaN, 0, 1_000_000);
    if (!Number.isFinite(stock)) throw new ValidationError('stock', 'Las unidades deben ser un número entero.');
  }
  const images: ProductImage[] = (Array.isArray(input?.images) ? input.images : [])
    .slice(0, 12)
    .map((im: any) => ({ url: safeImage(im?.url), alt: str(im?.alt, 160) }))
    .filter((im: ProductImage) => im.url);
  const options: ProductOption[] = (Array.isArray(input?.options) ? input.options : [])
    .slice(0, 4)
    .map((o: any) => ({
      name: str(o?.name, 40).trim(),
      values: (Array.isArray(o?.values) ? o.values : [])
        .slice(0, 30)
        .map((v: any) => ({
          label: str(v?.label, 60).trim(),
          delta: toInt(v?.delta, 0, -1_000_000_000, 1_000_000_000),
          soldOut: !!v?.soldOut,
        }))
        .filter((v: OptionValue) => v.label),
    }))
    .filter((o: ProductOption) => o.name && o.values.length);
  const specs: Spec[] = (Array.isArray(input?.specs) ? input.specs : [])
    .slice(0, 40)
    .map((s: any) => ({ label: str(s?.label, 60).trim(), value: str(s?.value, 200).trim() }))
    .filter((s: Spec) => s.label && s.value);
  const categoryId =
    input?.categoryId === null || input?.categoryId === '' || input?.categoryId === undefined
      ? null
      : toInt(input.categoryId, 0, 1);
  return {
    category_id: categoryId || null,
    slug: slugify(str(input?.slug, 120) || name) || `producto-${Date.now()}`,
    name,
    brand: str(input?.brand, 80),
    sku: str(input?.sku, 60),
    short_description: str(input?.shortDescription, 300),
    description: str(input?.description, 10000),
    price,
    compare_at_price: compare,
    stock,
    sold_out: input?.soldOutFlag ? 1 : 0,
    featured: input?.featured ? 1 : 0,
    visible: input?.visible === false ? 0 : 1,
    sort_order: toInt(input?.sortOrder, 0, -100000, 100000),
    images: JSON.stringify(images),
    options: JSON.stringify(options),
    specs: JSON.stringify(specs),
  };
}

async function uniqueSlug(db: D1Database, table: 'products' | 'categories', base: string, selfId?: number) {
  let slug = base;
  for (let i = 2; i < 200; i++) {
    const row = await db
      .prepare(`SELECT id FROM ${table} WHERE slug = ?1 ${selfId ? 'AND id != ?2' : ''}`)
      .bind(...(selfId ? [slug, selfId] : [slug]))
      .first();
    if (!row) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

export async function saveProduct(db: D1Database, input: any, id?: number) {
  const data = cleanProductInput(input);
  data.slug = await uniqueSlug(db, 'products', data.slug, id);
  const cols = Object.keys(data);
  const vals = Object.values(data);
  if (id) {
    const set = cols.map((c, i) => `${c} = ?${i + 1}`).join(', ');
    await db
      .prepare(`UPDATE products SET ${set}, updated_at = CURRENT_TIMESTAMP WHERE id = ?${cols.length + 1}`)
      .bind(...vals, id)
      .run();
    return getProductById(db, id);
  }
  const marks = cols.map((_, i) => `?${i + 1}`).join(', ');
  const res = await db
    .prepare(`INSERT INTO products (${cols.join(', ')}) VALUES (${marks})`)
    .bind(...vals)
    .run();
  return getProductById(db, Number(res.meta.last_row_id));
}

export async function deleteProduct(db: D1Database, id: number) {
  // También se borran sus precios en las otras tiendas.
  await db.batch([
    db.prepare('DELETE FROM store_prices WHERE product_id = ?1').bind(id),
    db.prepare('DELETE FROM products WHERE id = ?1').bind(id),
  ]);
}

export async function saveCategory(db: D1Database, input: any, id?: number) {
  const name = str(input?.name, 80).trim();
  if (!name) throw new ValidationError('name', 'Escribe el nombre de la categoría.');
  let parentId: number | null =
    input?.parentId === null || input?.parentId === '' || input?.parentId === undefined
      ? null
      : toInt(input.parentId, 0, 1) || null;
  if (parentId && id && parentId === id) throw new ValidationError('parentId', 'Una categoría no puede estar dentro de sí misma.');
  if (parentId) {
    const parent = await getCategoryById(db, parentId);
    if (!parent) throw new ValidationError('parentId', 'La categoría principal no existe.');
    if (parent.parentId) throw new ValidationError('parentId', 'Solo se permiten dos niveles: elige una categoría principal.');
    if (id) {
      const kids = await db.prepare('SELECT COUNT(*) AS n FROM categories WHERE parent_id = ?1').bind(id).first<{ n: number }>();
      if (Number(kids?.n) > 0) throw new ValidationError('parentId', 'Esta categoría tiene subcategorías, así que debe quedarse como principal.');
    }
  }
  const data = {
    parent_id: parentId,
    slug: await uniqueSlug(db, 'categories', slugify(str(input?.slug, 120) || name) || `categoria-${Date.now()}`, id),
    name,
    description: str(input?.description, 600),
    image: safeImage(input?.image),
    sort_order: toInt(input?.sortOrder, 0, -100000, 100000),
    visible: input?.visible === false ? 0 : 1,
  };
  const cols = Object.keys(data);
  const vals = Object.values(data);
  if (id) {
    const set = cols.map((c, i) => `${c} = ?${i + 1}`).join(', ');
    await db
      .prepare(`UPDATE categories SET ${set}, updated_at = CURRENT_TIMESTAMP WHERE id = ?${cols.length + 1}`)
      .bind(...vals, id)
      .run();
    return getCategoryById(db, id);
  }
  const marks = cols.map((_, i) => `?${i + 1}`).join(', ');
  const res = await db.prepare(`INSERT INTO categories (${cols.join(', ')}) VALUES (${marks})`).bind(...vals).run();
  return getCategoryById(db, Number(res.meta.last_row_id));
}

export async function deleteCategory(db: D1Database, id: number) {
  // Los productos y subcategorías quedan sin categoría (no se borran).
  await db.batch([
    db.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?1').bind(id),
    db.prepare('UPDATE categories SET parent_id = NULL WHERE parent_id = ?1').bind(id),
    db.prepare('DELETE FROM categories WHERE id = ?1').bind(id),
  ]);
}

export async function reorder(db: D1Database, table: 'products' | 'categories', ids: number[]) {
  const clean = ids.filter((n) => Number.isInteger(n) && n > 0).slice(0, 500);
  if (!clean.length) return;
  await db.batch(clean.map((id, i) => db.prepare(`UPDATE ${table} SET sort_order = ?1 WHERE id = ?2`).bind(i, id)));
}

/* ---------- Precios de una tienda secundaria ---------- */

export type StorePrice = { price: number; compareAtPrice: number | null };

/** Limpia el precio de otra tienda. `price` vacío significa "no se vende en esa tienda". */
export function cleanStorePrice(input: any): StorePrice | null {
  const empty = (v: unknown) => v === null || v === undefined || v === '';
  if (empty(input?.price)) return null;
  const price = toInt(input.price, NaN, 0, 1_000_000_000);
  if (!Number.isFinite(price)) throw new ValidationError('price', 'Escribe el precio en pesos, solo números.');
  let compare: number | null = null;
  if (!empty(input?.compareAtPrice)) {
    compare = toInt(input.compareAtPrice, NaN, 0, 1_000_000_000);
    if (!Number.isFinite(compare)) throw new ValidationError('compareAtPrice', 'El precio anterior debe ser un número.');
    if (compare <= price) throw new ValidationError('compareAtPrice', 'El precio anterior debe ser mayor que el precio actual.');
  }
  return { price, compareAtPrice: compare };
}

export async function getStorePrice(db: D1Database, store: string, productId: number): Promise<StorePrice | null> {
  const r = await db
    .prepare('SELECT price, compare_at_price FROM store_prices WHERE store = ?1 AND product_id = ?2')
    .bind(store, productId)
    .first<{ price: number; compare_at_price: number | null }>();
  return r ? { price: Number(r.price), compareAtPrice: r.compare_at_price ? Number(r.compare_at_price) : null } : null;
}

export async function setStorePrice(db: D1Database, store: string, productId: number, input: any) {
  if (store === MAIN) throw new Error('JGR usa el precio del producto.');
  const clean = cleanStorePrice(input);
  if (!clean) {
    await db.prepare('DELETE FROM store_prices WHERE store = ?1 AND product_id = ?2').bind(store, productId).run();
    return null;
  }
  await db
    .prepare(
      `INSERT INTO store_prices (store, product_id, price, compare_at_price, updated_at)
       VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)
       ON CONFLICT(store, product_id) DO UPDATE SET price = excluded.price,
         compare_at_price = excluded.compare_at_price, updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(store, productId, clean.price, clean.compareAtPrice)
    .run();
  return clean;
}
