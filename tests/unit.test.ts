import { describe, expect, it } from 'vitest';
import {
  buildOrderMessage,
  cartTotals,
  clampQty,
  discountPercent,
  formatCOP,
  lineKey,
  maxQty,
  unitPrice,
  whatsappUrl,
} from '../public/assets/js/order.js';
import { checkAccess, signSession, verifySession } from '../src/lib/auth';
import { cleanProductInput, ValidationError } from '../src/lib/db';
import { DEFAULT_SETTINGS } from '../src/lib/defaults';
import { sanitizeSection } from '../src/lib/settings';
import { jsonForScript, safeImage, safeLink, simpleMarkdown, slugify } from '../src/lib/util';

describe('precios y carrito', () => {
  it('formatea pesos colombianos sin decimales', () => {
    expect(formatCOP(239900)).toBe('$239.900');
    expect(formatCOP(1500000)).toBe('$1.500.000');
    expect(formatCOP(0)).toBe('$0');
    expect(formatCOP('abc' as any)).toBe('$0');
  });

  it('calcula el porcentaje de descuento', () => {
    expect(discountPercent(239900, 319900)).toBe(25);
    expect(discountPercent(100, 100)).toBe(0);
    expect(discountPercent(100, null)).toBe(0);
    expect(discountPercent(200, 100)).toBe(0);
  });

  const product = {
    id: 7,
    price: 100000,
    stock: 3,
    soldOut: false,
    options: [
      { name: 'Color', values: [{ label: 'Negro', delta: 0 }, { label: 'Champaña', delta: 10000 }] },
      { name: 'Tamaño', values: [{ label: 'S', delta: -5000 }, { label: 'L', delta: 5000 }] },
    ],
  };

  it('suma los ajustes de precio de cada variante', () => {
    expect(unitPrice(product, {})).toBe(100000);
    expect(unitPrice(product, { Color: 'Champaña', Tamaño: 'L' })).toBe(115000);
    expect(unitPrice(product, { Color: 'Negro', Tamaño: 'S' })).toBe(95000);
    expect(unitPrice(product, { Color: 'Inventado' })).toBe(100000);
  });

  it('distingue líneas por variante sin importar el orden', () => {
    expect(lineKey(7, { Color: 'Negro', Tamaño: 'S' })).toBe(lineKey(7, { Tamaño: 'S', Color: 'Negro' }));
    expect(lineKey(7, { Color: 'Negro' })).not.toBe(lineKey(7, { Color: 'Champaña' }));
  });

  it('respeta las unidades disponibles y los agotados', () => {
    expect(maxQty(product)).toBe(3);
    expect(maxQty({ ...product, stock: null })).toBe(99);
    expect(maxQty({ ...product, soldOut: true })).toBe(0);
    expect(clampQty(10, 3)).toBe(3);
    expect(clampQty(-2, 3)).toBe(0);
  });

  it('totaliza el carrito', () => {
    expect(cartTotals([{ qty: 2, unitPrice: 149900 }, { qty: 1, unitPrice: 79900 }])).toEqual({ count: 3, total: 379700 });
  });
});

describe('mensaje de WhatsApp', () => {
  const items = [
    { name: 'Parlante Bluetooth', variant: { Color: 'Azul noche' }, qty: 2, unitPrice: 149900 },
    { name: 'Audífonos TWS', variant: {}, qty: 1, unitPrice: 79900 },
  ];

  it('incluye cada producto, su precio, subtotales, total y nota de envío', () => {
    const msg = buildOrderMessage(items, { name: 'Ana', city: 'Bogotá', payment: 'Nequi' }, {
      greeting: '¡Hola JGR!',
      closing: '¿Me confirman el envío?',
      shippingNote: 'se confirma por WhatsApp',
      code: 'JGR-261112-0042',
    });
    expect(msg).toContain('¡Hola JGR!');
    expect(msg).toContain('Pedido JGR-261112-0042');
    expect(msg).toContain('1. Parlante Bluetooth (Color: Azul noche)');
    expect(msg).toContain('2 x $149.900 = $299.800');
    expect(msg).toContain('1 x $79.900 = $79.900');
    expect(msg).toContain('*Total productos: $379.700*');
    expect(msg).toContain('Envío: se confirma por WhatsApp');
    expect(msg).toContain('Nombre: Ana');
    expect(msg).toContain('Ciudad: Bogotá');
    expect(msg).toContain('Pago preferido: Nequi');
    expect(msg).not.toContain('Dirección:');
    expect(msg.trim().endsWith('¿Me confirman el envío?')).toBe(true);
  });

  it('arma el enlace wa.me al número de la tienda', () => {
    const url = whatsappUrl('+57 302 6983562', 'Hola & total: $10.000');
    expect(url.startsWith('https://wa.me/573026983562?text=')).toBe(true);
    expect(decodeURIComponent(url.split('text=')[1])).toBe('Hola & total: $10.000');
  });
});

describe('utilidades de seguridad', () => {
  it('crea direcciones limpias', () => {
    expect(slugify('Freidora de aire 5,5 L')).toBe('freidora-de-aire-5-5-l');
    expect(slugify('Ñandú & Café')).toBe('nandu-y-cafe');
  });

  it('solo acepta imágenes propias o https', () => {
    expect(safeImage('/img/subidas/a.webp')).toBe('/img/subidas/a.webp');
    expect(safeImage('https://cdn.ejemplo.com/a.jpg')).toBe('https://cdn.ejemplo.com/a.jpg');
    expect(safeImage('javascript:alert(1)')).toBe('');
    expect(safeImage('//evil.com/a.png')).toBe('');
    expect(safeImage("/a.png');background:url(x)")).toBe('');
    expect(safeLink('http://inseguro.com')).toBe('');
  });

  it('escapa el HTML del texto con formato', () => {
    const out = simpleMarkdown('## Título\n- uno\n- <b>dos</b>\n\nHola <script>x</script>');
    expect(out).toContain('<h2>Título</h2>');
    expect(out).toContain('<li>&lt;b&gt;dos&lt;/b&gt;</li>');
    expect(out).not.toContain('<script>');
  });

  it('el JSON incrustado no puede cerrar la etiqueta script', () => {
    expect(jsonForScript({ a: '</script><script>alert(1)</script>' })).not.toContain('</script>');
  });
});

describe('ajustes editables', () => {
  it('descarta colores que no son hexadecimales', () => {
    const t = sanitizeSection('theme', { light: { bg: 'red;}</style>', ink: '#123456' }, dark: {} });
    expect(t.light.bg).toBe(DEFAULT_SETTINGS.theme.light.bg);
    expect(t.light.ink).toBe('#123456');
  });

  it('deja solo dígitos en el número de WhatsApp y limita valores', () => {
    const s = sanitizeSection('store', { whatsapp: '+57 302 698 3562', perPage: 1000 });
    expect(s.whatsapp).toBe('573026983562');
    expect(s.perPage).toBe(48);
  });

  it('ignora redes sociales que no son enlaces https', () => {
    const s = sanitizeSection('social', { instagram: 'javascript:alert(1)', facebook: 'https://facebook.com/jgr' });
    expect(s.instagram).toBe('');
    expect(s.facebook).toBe('https://facebook.com/jgr');
  });
});

describe('validación de productos', () => {
  it('exige nombre y precio', () => {
    expect(() => cleanProductInput({ price: 100 })).toThrow(ValidationError);
    expect(() => cleanProductInput({ name: 'X', price: '' })).toThrow(/precio/);
  });

  it('exige que el precio anterior sea mayor al actual', () => {
    expect(() => cleanProductInput({ name: 'X', price: 100, compareAtPrice: 90 })).toThrow(/mayor/);
  });

  it('limpia imágenes, variantes vacías y crea la dirección', () => {
    const d = cleanProductInput({
      name: 'Cámara 4K',
      price: 1000,
      stock: '',
      images: [{ url: 'javascript:x' }, { url: '/img/subidas/a.webp', alt: 'A' }],
      options: [{ name: 'Color', values: [{ label: '' }, { label: 'Negro', delta: '2000' }] }, { name: '', values: [{ label: 'x' }] }],
    });
    expect(d.slug).toBe('camara-4k');
    expect(d.stock).toBeNull();
    expect(JSON.parse(d.images)).toEqual([{ url: '/img/subidas/a.webp', alt: 'A' }]);
    expect(JSON.parse(d.options)).toEqual([{ name: 'Color', values: [{ label: 'Negro', delta: 2000, soldOut: false }] }]);
  });
});

describe('sesión del panel', () => {
  const secret = 'x'.repeat(40);
  it('firma y verifica la sesión', async () => {
    const tok = await signSession({ login: 'ana', name: 'Ana', avatar: '', exp: Date.now() + 60000 }, secret);
    expect((await verifySession(tok, secret))?.login).toBe('ana');
  });
  it('rechaza sesiones alteradas, con otra clave o vencidas', async () => {
    const tok = await signSession({ login: 'ana', name: 'Ana', avatar: '', exp: Date.now() + 60000 }, secret);
    const [body, sig] = tok.split('.');
    const forged = btoa(JSON.stringify({ login: 'intruso', name: '', avatar: '', exp: Date.now() + 60000 })).replace(/=+$/, '');
    expect(await verifySession(`${forged}.${sig}`, secret)).toBeNull();
    expect(await verifySession(tok, 'y'.repeat(40))).toBeNull();
    const old = await signSession({ login: 'ana', name: 'Ana', avatar: '', exp: Date.now() - 1 }, secret);
    expect(await verifySession(old, secret)).toBeNull();
    expect(await verifySession(`${body}`, secret)).toBeNull();
  });
});

describe('permiso de acceso con GitHub', () => {
  const env = { GITHUB_REPO: 'dueno/tienda', ADMIN_USERS: '' };
  const fakeFetch = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  it('permite al dueño del repositorio sin consultar GitHub', async () => {
    const r = await checkAccess('Dueno', 'tok', env, (() => { throw new Error('no debía llamar'); }) as any);
    expect(r.allowed).toBe(true);
  });
  it('permite a colaboradores con permiso de escritura', async () => {
    expect((await checkAccess('ana', 'tok', env, fakeFetch(200, { owner: { login: 'dueno' }, permissions: { push: true } }))).allowed).toBe(true);
    expect((await checkAccess('ana', 'tok', env, fakeFetch(200, { owner: { login: 'dueno' }, permissions: { maintain: true } }))).allowed).toBe(true);
  });
  it('niega a quien solo puede leer o no ve el repositorio', async () => {
    expect((await checkAccess('ana', 'tok', env, fakeFetch(200, { owner: { login: 'dueno' }, permissions: { pull: true } }))).allowed).toBe(false);
    expect((await checkAccess('ana', 'tok', env, fakeFetch(404, {}))).allowed).toBe(false);
  });
  it('permite usuarios listados en ADMIN_USERS', async () => {
    expect((await checkAccess('Socio', 'tok', { ...env, ADMIN_USERS: 'otro, socio' }, fakeFetch(404, {}))).allowed).toBe(true);
  });
  it('niega si el repositorio no está configurado', async () => {
    expect((await checkAccess('ana', 'tok', { GITHUB_REPO: 'REEMPLAZAR', ADMIN_USERS: '' }, fakeFetch(200, {}))).allowed).toBe(false);
  });
});
