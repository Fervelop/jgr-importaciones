import {
  DEFAULT_SETTINGS,
  SETTINGS_SECTIONS,
  TRUST_ICONS,
  type Settings,
  type SettingsSection,
  type ThemeTokens,
} from './defaults';
import { isHex, parseJSON, safeHref, safeImage, safeLink, str, toInt } from './util';

export type Env = {
  DB: D1Database;
  /** Opcional: si existe, las fotos subidas se guardan en R2; si no, en D1. */
  IMAGES?: R2Bucket;
  ASSETS: Fetcher;
  GITHUB_REPO: string;
  GITHUB_CLIENT_ID: string;
  /** Permisos que se piden a GitHub: 'read:user' (repositorio público) o 'repo' (repositorio privado). */
  GITHUB_SCOPE?: string;
  GITHUB_CLIENT_SECRET?: string;
  SESSION_SECRET?: string;
  /** Lista opcional de usuarios de GitHub siempre autorizados, separados por coma. */
  ADMIN_USERS?: string;
  /** Solo para desarrollo local en localhost. */
  DEV_LOGIN?: string;
  /**
   * Qué tienda atiende este Worker. Vacío o "jgr": la tienda principal.
   * Otro valor (por ejemplo "t2"): una tienda con los mismos productos y fotos de JGR,
   * pero con sus propios precios, su propio WhatsApp, sus propios pedidos y un panel limitado.
   */
  STORE?: string;
};

export const MAIN_STORE = 'jgr';

/** Identificador de la tienda de este Worker (solo letras minúsculas y números). */
export function storeId(env: Pick<Env, 'STORE'>): string {
  const s = String(env.STORE || '').trim().toLowerCase();
  return /^[a-z0-9]{1,20}$/.test(s) ? s : MAIN_STORE;
}

export const isMainStore = (store: string) => store === MAIN_STORE;

/** Ajustes propios de una tienda secundaria (lo que la diferencia de JGR). */
export type StoreOverrides = { whatsapp: string };

const overridesKey = (store: string) => `tienda:${store}`;

export async function getStoreOverrides(db: D1Database, store: string): Promise<StoreOverrides> {
  if (isMainStore(store)) return { whatsapp: '' };
  try {
    const row = await db.prepare('SELECT value FROM settings WHERE key = ?1').bind(overridesKey(store)).first<{ value: string }>();
    return sanitizeOverrides(parseJSON<unknown>(row?.value, {}));
  } catch {
    return { whatsapp: '' };
  }
}

export function sanitizeOverrides(v: any): StoreOverrides {
  return { whatsapp: String(v?.whatsapp ?? '').replace(/\D/g, '').slice(0, 15) };
}

export async function saveStoreOverrides(db: D1Database, store: string, value: unknown) {
  if (isMainStore(store)) throw new Error('La tienda principal no usa ajustes propios.');
  const clean = sanitizeOverrides(value);
  await db
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(overridesKey(store), JSON.stringify(clean))
    .run();
  return clean;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/**
 * Ajustes de la tienda. Una tienda secundaria usa todo lo de JGR (marca, colores, inicio, textos)
 * y solo cambia el número de WhatsApp (si ya lo configuraste en su panel).
 */
export async function getSettings(db: D1Database, store: string = MAIN_STORE): Promise<Settings> {
  const out = await getMainSettings(db);
  if (!isMainStore(store)) {
    const o = await getStoreOverrides(db, store);
    if (o.whatsapp) out.store.whatsapp = o.whatsapp;
  }
  return out;
}

async function getMainSettings(db: D1Database): Promise<Settings> {
  const out = clone(DEFAULT_SETTINGS);
  let rows: { key: string; value: string }[] = [];
  try {
    const res = await db.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>();
    rows = res.results || [];
  } catch {
    // Base sin inicializar: se usan los valores por defecto.
  }
  for (const row of rows) {
    if (!(SETTINGS_SECTIONS as readonly string[]).includes(row.key)) continue;
    const key = row.key as SettingsSection;
    const saved = parseJSON<unknown>(row.value, null);
    if (saved === null) continue;
    (out as any)[key] = sanitizeSection(key, saved);
  }
  return out;
}

function tokens(input: any, fallback: ThemeTokens): ThemeTokens {
  const t = { ...fallback };
  for (const k of Object.keys(fallback) as (keyof ThemeTokens)[]) {
    if (isHex(input?.[k])) t[k] = input[k];
  }
  return t;
}

function list<T>(input: unknown, max: number, map: (v: any) => T | null): T[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, max).map(map).filter((v): v is T => v !== null);
}

/** Limpia y valida una sección antes de guardarla o de usarla en la página. */
export function sanitizeSection(section: SettingsSection, v: any): any {
  const d = DEFAULT_SETTINGS;
  switch (section) {
    case 'brand':
      return {
        name: str(v?.name, 80) || d.brand.name,
        slogan: str(v?.slogan, 120),
        logo: safeImage(v?.logo) || d.brand.logo,
      };
    case 'theme':
      return { light: tokens(v?.light, d.theme.light), dark: tokens(v?.dark, d.theme.dark) };
    case 'home': {
      const h = d.home;
      const style = (x: unknown) => (['oscuro', 'dorado', 'claro'].includes(String(x)) ? String(x) : 'oscuro');
      const iconOf = (x: unknown) => ((TRUST_ICONS as readonly string[]).includes(String(x)) ? String(x) : 'shield');
      const has = (k: string) => v && typeof v === 'object' && k in v;
      return {
        slides: has('slides')
          ? list(v.slides, 8, (t) =>
              t && (t.title || t.image)
                ? {
                    title: str(t.title, 140),
                    subtitle: str(t.subtitle, 300),
                    buttonText: str(t.buttonText, 40),
                    link: safeHref(t.link),
                    image: safeImage(t.image),
                    style: style(t.style),
                  }
                : null,
            )
          : h.slides,
        trust: has('trust')
          ? list(v.trust, 6, (t) =>
              t && (t.title || t.text) ? { icon: iconOf(t.icon), title: str(t.title, 60), text: str(t.text, 160) } : null,
            )
          : h.trust,
        showCategories: v?.showCategories !== false,
        categoriesTitle: str(v?.categoriesTitle ?? h.categoriesTitle, 120),
        categoriesSubtitle: str(v?.categoriesSubtitle ?? h.categoriesSubtitle, 240),
        categoriesIncludeSubs: v?.categoriesIncludeSubs !== false,
        showOffers: v?.showOffers !== false,
        offersTitle: str(v?.offersTitle ?? h.offersTitle, 80),
        offersSubtitle: str(v?.offersSubtitle ?? h.offersSubtitle, 160),
        offersEndsAt: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(v?.offersEndsAt || '')) ? String(v.offersEndsAt) : '',
        showFeatured: v?.showFeatured !== false,
        featuredTitle: str(v?.featuredTitle ?? h.featuredTitle, 120),
        featuredSubtitle: str(v?.featuredSubtitle ?? h.featuredSubtitle, 200),
        banners: has('banners')
          ? list(v.banners, 3, (t) =>
              t && t.title
                ? {
                    title: str(t.title, 80),
                    text: str(t.text, 200),
                    buttonText: str(t.buttonText, 40),
                    link: safeHref(t.link),
                    image: safeImage(t.image),
                    icon: iconOf(t.icon),
                    style: style(t.style),
                  }
                : null,
            )
          : h.banners,
        showSeasonal: v?.showSeasonal !== false,
        seasonalTitle: str(v?.seasonalTitle ?? h.seasonalTitle, 120),
        seasonalSubtitle: str(v?.seasonalSubtitle ?? h.seasonalSubtitle, 200),
        seasonalCategoryId: has('seasonalCategoryId')
          ? v.seasonalCategoryId === null || v.seasonalCategoryId === ''
            ? null
            : toInt(v.seasonalCategoryId, 0, 1) || null
          : h.seasonalCategoryId,
        showDiscover: v?.showDiscover !== false,
        discoverTitle: str(v?.discoverTitle ?? h.discoverTitle, 120),
        discoverCount: toInt(v?.discoverCount, h.discoverCount, 4, 24),
        showSteps: v?.showSteps !== false,
        stepsTitle: str(v?.stepsTitle ?? h.stepsTitle, 120),
        steps: has('steps')
          ? list(v.steps, 6, (s) => (s && s.title ? { title: str(s.title, 80), text: str(s.text, 200) } : null))
          : h.steps,
        testimonialsTitle: str(v?.testimonialsTitle ?? h.testimonialsTitle, 120),
        showTestimonials: v?.showTestimonials !== false,
        faqTitle: str(v?.faqTitle ?? h.faqTitle, 120),
        showFaq: v?.showFaq !== false,
        closingTitle: str(v?.closingTitle ?? h.closingTitle, 160),
        closingText: str(v?.closingText ?? h.closingText, 300),
        closingImage: safeImage(v?.closingImage),
      };
    }
    case 'store':
      return {
        whatsapp: String(v?.whatsapp ?? d.store.whatsapp).replace(/\D/g, '').slice(0, 15) || d.store.whatsapp,
        perPage: toInt(v?.perPage, d.store.perPage, 4, 48),
        lowStockThreshold: toInt(v?.lowStockThreshold, d.store.lowStockThreshold, 0, 100),
        shippingNote: str(v?.shippingNote, 200),
        orderGreeting: str(v?.orderGreeting, 300) || d.store.orderGreeting,
        orderClosing: str(v?.orderClosing, 300),
        askCustomerData: v?.askCustomerData !== false,
        codCities: Array.isArray(v?.codCities)
          ? v.codCities.map((x: unknown) => str(x, 60).trim()).filter(Boolean).slice(0, 30)
          : d.store.codCities,
        announcement: str(v?.announcement, 160),
      };
    case 'payments':
      return list(v, 20, (p) => (typeof p === 'string' && p.trim() ? str(p.trim(), 60) : null));
    case 'social':
      return {
        instagram: safeLink(v?.instagram),
        facebook: safeLink(v?.facebook),
        tiktok: safeLink(v?.tiktok),
        youtube: safeLink(v?.youtube),
      };
    case 'contact':
      return { email: str(v?.email, 120), location: str(v?.location, 120), hours: str(v?.hours, 160) };
    case 'testimonials':
      return list(v, 24, (t) =>
        t && t.text ? { name: str(t.name, 60), city: str(t.city, 60), text: str(t.text, 400) } : null,
      );
    case 'faq':
      return list(v, 40, (f) => (f && f.q ? { q: str(f.q, 200), a: str(f.a, 1200) } : null));
    case 'legal':
      return {
        terms: str(v?.terms, 20000),
        privacy: str(v?.privacy, 20000),
        returns: str(v?.returns, 20000),
      };
    case 'seo':
      return { title: str(v?.title, 120) || d.seo.title, description: str(v?.description, 300) };
    case 'analytics':
      return { cloudflareToken: str(v?.cloudflareToken, 64).replace(/[^a-zA-Z0-9]/g, '') };
  }
}

export async function saveSection(db: D1Database, section: SettingsSection, value: unknown) {
  const clean = sanitizeSection(section, value);
  await db
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(section, JSON.stringify(clean))
    .run();
  return clean;
}
