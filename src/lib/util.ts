export { formatCOP, discountPercent } from '../../public/assets/js/order.js';

export function slugify(input: string): string {
  return String(input || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function parseJSON<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try {
    const v = JSON.parse(value);
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export function isHex(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value);
}

/** Solo rutas propias o https; cualquier otra cosa (javascript:, data:, etc.) se descarta. */
export function safeImage(url: unknown): string {
  if (typeof url !== 'string') return '';
  const u = url.trim();
  // Sin comillas, espacios, paréntesis ni barras invertidas: así es seguro dentro de atributos y de url() en CSS.
  if (/^\/(?!\/)[^\s"'<>()\\]*$/.test(u)) return u;
  if (/^https:\/\/[^\s"'<>()\\]+$/i.test(u)) return u;
  return '';
}

/** Enlace de botón: ruta propia, https o la palabra "whatsapp" (abre el chat de la tienda). */
export function safeHref(url: unknown): string {
  if (typeof url !== 'string') return '';
  const u = url.trim();
  if (u.toLowerCase() === 'whatsapp') return 'whatsapp';
  if (/^\/(?!\/)[^\s"'<>\\]*$/.test(u)) return u;
  if (/^https:\/\/[^\s"'<>\\]+$/i.test(u)) return u;
  return '';
}

export function safeLink(url: unknown): string {
  if (typeof url !== 'string') return '';
  const u = url.trim();
  if (/^https:\/\/[^\s"'<>]+$/i.test(u)) return u;
  return '';
}

export function toInt(value: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function str(value: unknown, max = 500): string {
  if (value === null || value === undefined) return '';
  return String(value).slice(0, max);
}

/** Pasa texto con formato mínimo (## título, - lista, párrafos) a HTML ya escapado. */
export function simpleMarkdown(src: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const blocks = String(src || '').replace(/\r/g, '').split(/\n{2,}/);
  const out: string[] = [];
  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim() !== '');
    if (!lines.length) continue;
    let para: string[] = [];
    let list: string[] = [];
    const flushPara = () => {
      if (para.length) out.push(`<p>${para.map(inline).join('<br>')}</p>`);
      para = [];
    };
    const flushList = () => {
      if (list.length) out.push(`<ul>${list.map((l) => `<li>${inline(l)}</li>`).join('')}</ul>`);
      list = [];
    };
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith('## ')) {
        flushPara();
        flushList();
        out.push(`<h2>${inline(t.slice(3))}</h2>`);
      } else if (t.startsWith('- ')) {
        flushPara();
        list.push(t.slice(2));
      } else {
        flushList();
        para.push(t);
      }
    }
    flushPara();
    flushList();
  }
  return out.join('\n');
}

/** JSON seguro para incrustar dentro de <script>. */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
