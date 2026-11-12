import { Hono, type Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import {
  checkAccess,
  exchangeCode,
  fetchGithubUser,
  isLocalHost,
  randomToken,
  safeEqual,
  SESSION_COOKIE,
  SESSION_HOURS,
  sessionSecret,
  signSession,
  STATE_COOKIE,
  verifySession,
} from './lib/auth';
import { buildTree, getProductBySlug, listCategories, listProducts, SORTS, type Category, type CategoryTree, type Product } from './lib/db';
import { getSettings, type Env } from './lib/settings';
import { toInt } from './lib/util';
import { adminApi } from './routes/admin-api';
import { publicApi } from './routes/public-api';
import { adminShell, loginPage } from './views/admin';
import { categoryPage, faqPage, listingPage, notFoundPage, productPage, textPage } from './views/catalog';
import { homePage, type HomeData } from './views/home';
import type { ViewCtx } from './views/layout';

const app = new Hono<{ Bindings: Env }>();

/* ---------- Encabezados de seguridad ---------- */
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('X-Frame-Options', 'SAMEORIGIN');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (new URL(c.req.url).protocol === 'https:') c.header('Strict-Transport-Security', 'max-age=31536000');
});

async function viewCtx(c: Context<{ Bindings: Env }>) {
  const [settings, categories] = await Promise.all([getSettings(c.env.DB), listCategories(c.env.DB)]);
  const url = new URL(c.req.url);
  const ctx: ViewCtx = { settings, tree: buildTree(categories), path: url.pathname, origin: url.origin };
  return { ctx, categories };
}

const page = (c: Context, body: unknown, status = 200) =>
  c.html(body as any, status as any, { 'Cache-Control': 'no-cache' });

function queryState(c: Context) {
  const orden = c.req.query('orden') || 'destacados';
  return {
    orden: SORTS[orden] ? orden : 'destacados',
    q: (c.req.query('q') || '').trim().slice(0, 80),
    page: toInt(c.req.query('pagina'), 1, 1, 10000),
  };
}

/* ---------- Tienda ---------- */

app.get('/', async (c) => {
  const { ctx, categories } = await viewCtx(c);
  const h = ctx.settings.home;
  const db = c.env.DB;
  const available = (list: { items: Product[] }) => list.items.filter((p) => !p.soldOut);

  const [featured, offers, discover] = await Promise.all([
    h.showFeatured ? listProducts(db, { featuredOnly: true, perPage: 12, sort: 'destacados' }) : null,
    h.showOffers ? listProducts(db, { onSaleOnly: true, perPage: 12, sort: 'descuento' }) : null,
    h.showDiscover ? listProducts(db, { perPage: h.discoverCount, sort: 'recientes' }) : null,
  ]);

  let seasonal: HomeData['seasonal'] = { products: [], category: null };
  if (h.showSeasonal && h.seasonalCategoryId) {
    const cat = categories.find((x) => x.id === h.seasonalCategoryId) || null;
    if (cat) {
      const ids = [cat.id, ...categories.filter((x) => x.parentId === cat.id).map((x) => x.id)];
      seasonal = { category: cat, products: available(await listProducts(db, { categoryIds: ids, perPage: 12 })) };
    }
  }

  // Cuadrícula de categorías: cada principal seguida de sus subcategorías (si así se eligió en el panel).
  const tiles: Category[] = [];
  for (const root of ctx.tree) {
    tiles.push(root);
    if (h.categoriesIncludeSubs) tiles.push(...root.children);
  }

  const data: HomeData = {
    featured: featured ? available(featured) : [],
    offers: offers ? available(offers) : [],
    discover: discover ? discover.items : [],
    seasonal,
    tiles,
  };
  return page(c, homePage(ctx, data));
});

app.get('/ofertas', async (c) => {
  const { ctx } = await viewCtx(c);
  const q = queryState(c);
  const list = await listProducts(c.env.DB, {
    onSaleOnly: true,
    sort: c.req.query('orden') ? q.orden : 'descuento',
    page: q.page,
    perPage: ctx.settings.store.perPage,
  });
  return page(
    c,
    listingPage(ctx, {
      title: ctx.settings.home.offersTitle || 'Ofertas',
      intro: ctx.settings.home.offersSubtitle,
      base: '/ofertas',
      list,
      q: { ...q, orden: c.req.query('orden') ? q.orden : 'descuento' },
      showSearch: false,
    }),
  );
});

app.get('/categoria/:slug', async (c) => {
  const { ctx, categories } = await viewCtx(c);
  const cat = categories.find((x) => x.slug === c.req.param('slug'));
  if (!cat) return page(c, notFoundPage(ctx), 404);
  let root: CategoryTree | undefined = ctx.tree.find((t) => t.id === cat.id || t.children.some((k) => k.id === cat.id));
  if (!root) root = { ...cat, children: [], totalCount: cat.productCount };
  const ids = root.id === cat.id ? [root.id, ...root.children.map((k) => k.id)] : [cat.id];
  const q = queryState(c);
  const list = await listProducts(c.env.DB, {
    categoryIds: ids,
    q: q.q,
    sort: q.orden,
    page: q.page,
    perPage: ctx.settings.store.perPage,
  });
  if (q.page > list.pages && list.total > 0) return c.redirect(`/categoria/${cat.slug}`, 302);
  return page(c, categoryPage(ctx, cat, root, list, q));
});

app.get('/producto/:slug', async (c) => {
  const { ctx, categories } = await viewCtx(c);
  const p = await getProductBySlug(c.env.DB, c.req.param('slug'));
  if (!p) return page(c, notFoundPage(ctx), 404);
  const cat = categories.find((x) => x.id === p.categoryId) || null;
  const root = cat ? ctx.tree.find((t) => t.id === cat.id || t.children.some((k) => k.id === cat.id)) || null : null;
  let related: typeof p[] = [];
  if (cat) {
    const ids = root ? [root.id, ...root.children.map((k) => k.id)] : [cat.id];
    const sameSub = await listProducts(c.env.DB, { categoryIds: [cat.id], excludeId: p.id, perPage: 4 });
    related = sameSub.items.filter((x) => !x.soldOut);
    if (related.length < 4) {
      const more = await listProducts(c.env.DB, { categoryIds: ids, excludeId: p.id, perPage: 8 });
      for (const x of more.items) if (related.length < 4 && !x.soldOut && !related.some((r) => r.id === x.id)) related.push(x);
    }
  }
  return page(c, productPage(ctx, p, cat, root, related));
});

app.get('/buscar', async (c) => {
  const { ctx } = await viewCtx(c);
  const q = queryState(c);
  const list = q.q
    ? await listProducts(c.env.DB, { q: q.q, sort: q.orden, page: q.page, perPage: ctx.settings.store.perPage })
    : { items: [], total: 0, page: 1, pages: 1, perPage: 12 };
  return page(
    c,
    listingPage(ctx, { title: q.q ? `Resultados para “${q.q}”` : 'Buscar', base: '/buscar', list, q, showSearch: true }),
  );
});

app.get('/destacados', async (c) => {
  const { ctx } = await viewCtx(c);
  const q = queryState(c);
  const list = await listProducts(c.env.DB, { featuredOnly: true, sort: q.orden, page: q.page, perPage: ctx.settings.store.perPage });
  return page(
    c,
    listingPage(ctx, {
      title: 'Destacados',
      intro: 'Los productos que más recomendamos esta temporada.',
      base: '/destacados',
      list,
      q,
      showSearch: false,
    }),
  );
});

app.get('/terminos', async (c) => {
  const { ctx } = await viewCtx(c);
  return page(c, textPage(ctx, 'Términos y condiciones', ctx.settings.legal.terms, '/terminos'));
});
app.get('/privacidad', async (c) => {
  const { ctx } = await viewCtx(c);
  return page(c, textPage(ctx, 'Política de privacidad', ctx.settings.legal.privacy, '/privacidad'));
});
app.get('/cambios-y-devoluciones', async (c) => {
  const { ctx } = await viewCtx(c);
  return page(c, textPage(ctx, 'Cambios y devoluciones', ctx.settings.legal.returns, '/cambios-y-devoluciones'));
});
app.get('/preguntas-frecuentes', async (c) => {
  const { ctx } = await viewCtx(c);
  return page(c, faqPage(ctx));
});

app.get('/robots.txt', (c) => {
  const origin = new URL(c.req.url).origin;
  return c.text(`User-agent: *\nDisallow: /admin\nDisallow: /api/\nDisallow: /auth/\nSitemap: ${origin}/sitemap.xml\n`);
});

app.get('/sitemap.xml', async (c) => {
  const origin = new URL(c.req.url).origin;
  const cats = await listCategories(c.env.DB);
  const prods = await c.env.DB.prepare('SELECT slug, updated_at FROM products WHERE visible = 1').all<{ slug: string; updated_at: string }>();
  const urls = [
    `${origin}/`,
    ...cats.map((x) => `${origin}/categoria/${x.slug}`),
    ...(prods.results || []).map((p) => `${origin}/producto/${p.slug}`),
    `${origin}/preguntas-frecuentes`,
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
    .map((u) => `<url><loc>${u.replace(/&/g, '&amp;')}</loc></url>`)
    .join('')}</urlset>`;
  return c.body(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' });
});

/* ---------- Imágenes subidas (R2) ---------- */

app.get('/img/*', async (c) => {
  const key = decodeURIComponent(new URL(c.req.url).pathname.slice('/img/'.length));
  if (!key.startsWith('subidas/') || key.includes('..')) return c.notFound();
  const obj = await c.env.IMAGES.get(key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('ETag', obj.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return new Response(obj.body, { headers });
});

/* ---------- API ---------- */

app.route('/api', publicApi);
app.route('/api/admin', adminApi);

/* ---------- Panel y acceso con GitHub ---------- */

function cookieOpts(c: Context, maxAge: number) {
  const secure = new URL(c.req.url).protocol === 'https:';
  return { httpOnly: true, secure, sameSite: 'Lax' as const, path: '/', maxAge };
}

app.get('/admin', async (c) => {
  const settings = await getSettings(c.env.DB);
  let session = null;
  try {
    session = await verifySession(getCookie(c, SESSION_COOKIE), sessionSecret(c.env));
  } catch {
    const html = loginPage(settings, { error: 'config', devLogin: false });
    return c.html(html as any, 200, { 'Cache-Control': 'no-store' });
  }
  const host = new URL(c.req.url).hostname;
  if (!session) {
    return c.html(
      loginPage(settings, { error: c.req.query('error'), devLogin: c.env.DEV_LOGIN === '1' && isLocalHost(host) }) as any,
      200,
      { 'Cache-Control': 'no-store' },
    );
  }
  return c.html(adminShell(settings, session) as any, 200, { 'Cache-Control': 'no-store' });
});
app.get('/admin/*', (c) => c.redirect('/admin', 302));

app.get('/auth/github', (c) => {
  if (!c.env.GITHUB_CLIENT_ID || c.env.GITHUB_CLIENT_ID.startsWith('REEMPLAZAR') || !c.env.GITHUB_CLIENT_SECRET) {
    return c.redirect('/admin?error=config', 302);
  }
  const state = randomToken();
  setCookie(c, STATE_COOKIE, state, cookieOpts(c, 600));
  const redirect = `${new URL(c.req.url).origin}/auth/callback`;
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', c.env.GITHUB_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirect);
  url.searchParams.set('scope', c.env.GITHUB_SCOPE || 'read:user');
  url.searchParams.set('state', state);
  url.searchParams.set('allow_signup', 'false');
  return c.redirect(url.toString(), 302);
});

app.get('/auth/callback', async (c) => {
  if (c.req.query('error')) return c.redirect('/admin?error=cancelado', 302);
  const expected = getCookie(c, STATE_COOKIE) || '';
  const state = c.req.query('state') || '';
  deleteCookie(c, STATE_COOKIE, { path: '/' });
  if (!expected || !state || !safeEqual(expected, state)) return c.redirect('/admin?error=estado', 302);
  const code = c.req.query('code');
  if (!code) return c.redirect('/admin?error=github', 302);
  let secret: string;
  try {
    secret = sessionSecret(c.env);
  } catch {
    return c.redirect('/admin?error=config', 302);
  }
  try {
    const token = await exchangeCode(c.env, code, `${new URL(c.req.url).origin}/auth/callback`);
    const user = await fetchGithubUser(token);
    const access = await checkAccess(user.login, token, c.env);
    // El token de GitHub no se guarda: solo se usa para verificar permisos al entrar.
    if (!access.allowed) {
      console.log(`Acceso negado a ${user.login}: ${access.reason}`);
      return c.redirect('/admin?error=sin-permiso', 302);
    }
    const session = await signSession({ ...user, exp: Date.now() + SESSION_HOURS * 3600 * 1000 }, secret);
    setCookie(c, SESSION_COOKIE, session, cookieOpts(c, SESSION_HOURS * 3600));
    return c.redirect('/admin', 302);
  } catch (e) {
    console.error('Error de GitHub OAuth', e);
    return c.redirect('/admin?error=github', 302);
  }
});

/** Entrada sin GitHub, SOLO en localhost y con DEV_LOGIN=1 en .dev.vars. */
app.get('/auth/dev', async (c) => {
  const host = new URL(c.req.url).hostname;
  if (c.env.DEV_LOGIN !== '1' || !isLocalHost(host)) return c.notFound();
  const session = await signSession(
    { login: 'modo-local', name: 'Modo local', avatar: '', exp: Date.now() + SESSION_HOURS * 3600 * 1000 },
    sessionSecret(c.env),
  );
  setCookie(c, SESSION_COOKIE, session, cookieOpts(c, SESSION_HOURS * 3600));
  return c.redirect('/admin', 302);
});

app.post('/auth/salir', (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.redirect('/admin', 303);
});

/* ---------- Errores ---------- */

app.notFound(async (c) => {
  if (c.req.path.startsWith('/api/')) return c.json({ error: 'No encontrado.' }, 404);
  try {
    const { ctx } = await viewCtx(c);
    return page(c, notFoundPage(ctx), 404);
  } catch {
    return c.text('Página no encontrada', 404);
  }
});

app.onError((err, c) => {
  console.error(err);
  const msg = String(err?.message || '');
  if (msg.includes('no such table')) {
    return c.text(
      'La base de datos todavía no está inicializada. Ejecuta: npm run db:init:remote (revisa el README).',
      503,
    );
  }
  if (c.req.path.startsWith('/api/')) return c.json({ error: 'Error interno. Intenta de nuevo.' }, 500);
  return c.text('Tuvimos un problema al cargar esta página. Intenta de nuevo en un momento.', 500);
});

export default app;
