// Panel de administración de JGR Importaciones.
// Todo se guarda al instante en la base de datos de Cloudflare: la tienda cambia apenas guardas.
import { formatCOP, discountPercent } from '/assets/js/order.js';

const app = document.getElementById('app');
const USER = JSON.parse(app.dataset.user || '{}');

/* ---------- Utilidades ---------- */
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const ICONS = {
  home: '<path d="M4 11 12 4l8 7v8.5a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19.5V11Z"/>',
  box: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  folder: '<path d="M3.5 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7Z"/>',
  receipt: '<path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2v-17Z"/><path d="M9 8h6M9 12h6"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.4-1.2-1.6-1.2-2.8 0-.9.7-1.5 1.6-1.5h2.1a3.7 3.7 0 0 0 3.7-3.7C20 6.7 16.4 3.5 12 3.5Z"/><circle cx="7.8" cy="11" r="1.1"/><circle cx="10.5" cy="7.5" r="1.1"/><circle cx="15" cy="7.8" r="1.1"/>',
  layout: '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M3.5 9.5h17M9 9.5V20"/>',
  text: '<path d="M5 6h14M5 11h14M5 16h9"/>',
  store: '<path d="M4 9.5 5.5 4h13L20 9.5a2.8 2.8 0 0 1-5.3 1.2 2.9 2.9 0 0 1-5.4 0A2.8 2.8 0 0 1 4 9.5Z"/><path d="M5.5 12v8h13v-8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
  up: '<path d="m6 14.5 6-6 6 6"/>',
  down: '<path d="m6 9.5 6 6 6-6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"/>',
  logout: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  whatsapp: '<path fill="currentColor" stroke="none" d="M12 2.6a9.3 9.3 0 0 0-8 14.1L2.7 21.4l4.8-1.3A9.3 9.3 0 1 0 12 2.6Zm0 17a7.7 7.7 0 0 1-3.9-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A7.7 7.7 0 1 1 12 19.6Z"/>',
};
const icon = (name, size = 18) => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('width', size);
  s.setAttribute('height', size);
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.6');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONS[name] || ICONS.box;
  return s;
};

async function api(path, opts = {}) {
  const init = { method: opts.method || 'GET', headers: { Accept: 'application/json' } };
  if (init.method !== 'GET') init.headers['X-JGR-Admin'] = '1';
  if (opts.body instanceof FormData) init.body = opts.body;
  else if (opts.body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(opts.body);
  }
  const res = await fetch(`/api/admin${path}`, init);
  if (res.status === 401) {
    toast('Tu sesión terminó. Vuelve a entrar.', 'error');
    setTimeout(() => (location.href = '/admin'), 1200);
    throw new Error('401');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'No se pudo completar la acción.');
    err.field = data.field;
    throw err;
  }
  return data;
}

let toastTimer;
function toast(message, kind = 'ok') {
  let el = document.querySelector('.toast');
  if (!el) {
    el = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(el);
  }
  el.className = `toast toast--${kind}`;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), kind === 'error' ? 6000 : 3000);
}

function confirmDialog({ title, text, confirm = 'Eliminar', danger = true }) {
  return new Promise((resolve) => {
    const d = h(
      'dialog',
      { class: 'modal', 'aria-labelledby': 'modal-t' },
      h('h2', { id: 'modal-t', text: title }),
      h('p', { text }),
      h(
        'div',
        { class: 'modal__acciones' },
        h('button', { class: 'btn btn--linea', type: 'button', text: 'Cancelar', onclick: () => d.close('no') }),
        h('button', { class: `btn ${danger ? 'btn--peligro' : 'btn--primario'}`, type: 'button', text: confirm, onclick: () => d.close('si') }),
      ),
    );
    d.addEventListener('close', () => {
      resolve(d.returnValue === 'si');
      d.remove();
    });
    document.body.append(d);
    d.showModal();
  });
}

const slugify = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const fmtDate = (s) => {
  if (!s) return '';
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' });
};

/* ---------- Subida de imágenes (se reducen en el navegador antes de subir) ---------- */
async function shrink(file, maxSide = 1600) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 600 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.86));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' });
  } catch {
    return file;
  }
}

async function uploadImage(file) {
  const small = await shrink(file);
  const fd = new FormData();
  fd.append('archivo', small);
  const { url } = await api('/subir', { method: 'POST', body: fd });
  return url;
}

function pickFiles(multiple = false) {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/avif,image/gif', multiple });
    input.addEventListener('change', () => resolve([...input.files]));
    input.click();
  });
}

/** Campo de una sola imagen (logo, portada, etc.). */
function imageField({ label, value, onChange, hint }) {
  let current = value || '';
  const preview = h('div', { class: 'img-campo__vista' });
  const render = () => {
    preview.textContent = '';
    if (current) preview.append(h('img', { src: current, alt: '' }));
    else preview.append(h('span', { class: 'img-campo__vacia', text: 'Sin imagen' }));
    quitar.hidden = !current;
  };
  const subir = async (files) => {
    if (!files.length) return;
    btn.disabled = true;
    btn.textContent = 'Subiendo…';
    try {
      current = await uploadImage(files[0]);
      onChange(current);
      render();
      toast('Imagen subida. Recuerda guardar los cambios.');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = current ? 'Cambiar imagen' : 'Subir imagen';
    }
  };
  const btn = h('button', { type: 'button', class: 'btn btn--linea btn--sm', text: value ? 'Cambiar imagen' : 'Subir imagen', onclick: async () => subir(await pickFiles()) });
  const quitar = h('button', {
    type: 'button',
    class: 'btn btn--texto btn--sm',
    text: 'Quitar',
    onclick: () => {
      current = '';
      onChange('');
      render();
    },
  });
  const wrap = h(
    'div',
    { class: 'campo img-campo' },
    h('span', { class: 'campo__label', text: label }),
    h('div', { class: 'img-campo__fila' }, preview, h('div', { class: 'img-campo__acciones' }, btn, quitar)),
    hint ? h('span', { class: 'campo__ayuda', text: hint }) : null,
  );
  wrap.addEventListener('dragover', (e) => {
    e.preventDefault();
    wrap.classList.add('is-drop');
  });
  wrap.addEventListener('dragleave', () => wrap.classList.remove('is-drop'));
  wrap.addEventListener('drop', (e) => {
    e.preventDefault();
    wrap.classList.remove('is-drop');
    subir([...e.dataTransfer.files].filter((f) => f.type.startsWith('image/')));
  });
  render();
  return wrap;
}

/* ---------- Campos de formulario ---------- */
let fieldSeq = 0;
function field({ label, type = 'text', value = '', hint, onInput, attrs = {}, options, wide }) {
  const id = `f${++fieldSeq}`;
  let control;
  if (type === 'textarea') control = h('textarea', { id, rows: attrs.rows || 4, ...attrs }, value ?? '');
  else if (type === 'select') {
    control = h('select', { id, ...attrs }, options.map((o) => h('option', { value: o.value, text: o.label })));
    control.value = value ?? '';
  } else control = h('input', { id, type, value: value ?? '', ...attrs });
  if (onInput) control.addEventListener(type === 'select' ? 'change' : 'input', () => onInput(control.value, control));
  const hintEl = hint ? h('span', { class: 'campo__ayuda', id: `${id}-a`, text: hint }) : null;
  if (hintEl) control.setAttribute('aria-describedby', `${id}-a`);
  const err = h('span', { class: 'campo__error', id: `${id}-e`, hidden: true });
  const wrap = h('div', { class: `campo${wide ? ' campo--ancho' : ''}` }, h('label', { for: id, class: 'campo__label', text: label }), control, hintEl, err);
  wrap.setError = (msg) => {
    err.textContent = msg || '';
    err.hidden = !msg;
    control.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) control.focus();
  };
  wrap.control = control;
  return wrap;
}

function toggle({ label, checked, onChange, hint }) {
  const id = `t${++fieldSeq}`;
  const input = h('input', { id, type: 'checkbox', role: 'switch', checked, onchange: () => onChange(input.checked) });
  return h(
    'div',
    { class: 'interruptor' },
    input,
    h('label', { for: id }, h('span', { class: 'interruptor__txt', text: label }), hint ? h('span', { class: 'campo__ayuda', text: hint }) : null),
  );
}

/** Lista editable de elementos con los mismos campos (preguntas, testimonios, pasos…). */
function repeater({ items, fields, addLabel, empty, onChange, max = 50 }) {
  const list = h('ol', { class: 'repetidor' });
  const wrap = h('div', { class: 'repetidor__wrap' }, list);
  const addBtn = h('button', {
    type: 'button',
    class: 'btn btn--linea btn--sm',
    onclick: () => {
      const blank = {};
      for (const f of fields) blank[f.key] = f.default ?? '';
      items.push(blank);
      onChange(items);
      render();
      list.lastElementChild?.querySelector('input,textarea,select')?.focus();
    },
  }, icon('plus', 16), addLabel);
  wrap.append(addBtn);
  function render() {
    list.textContent = '';
    if (!items.length) list.append(h('li', { class: 'repetidor__vacio', text: empty }));
    items.forEach((item, i) => {
      const li = h('li', { class: 'repetidor__item' });
      const grid = h('div', { class: 'repetidor__campos' });
      for (const f of fields) {
        if (f.type === 'checkbox') {
          grid.append(toggle({ label: f.label, checked: !!item[f.key], onChange: (v) => { item[f.key] = v; onChange(items); } }));
        } else if (f.type === 'image') {
          const im = imageField({ label: f.label, value: item[f.key], hint: f.hint, onChange: (v) => { item[f.key] = v; onChange(items); } });
          im.classList.add('campo--ancho');
          grid.append(im);
        } else {
          grid.append(
            field({
              label: f.label,
              type: f.type,
              value: item[f.key],
              options: f.options,
              hint: f.hint,
              wide: f.wide,
              attrs: f.attrs || {},
              onInput: (v) => {
                item[f.key] = f.type === 'number' ? (v === '' ? '' : Number(v)) : v;
                onChange(items);
              },
            }),
          );
        }
      }
      const tools = h(
        'div',
        { class: 'repetidor__herr' },
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Subir', disabled: i === 0, onclick: () => move(i, -1) }, icon('up')),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Bajar', disabled: i === items.length - 1, onclick: () => move(i, 1) }, icon('down')),
        h('button', { type: 'button', class: 'icon-btn icon-btn--peligro', 'aria-label': 'Eliminar', onclick: () => { items.splice(i, 1); onChange(items); render(); } }, icon('trash')),
      );
      li.append(grid, tools);
      list.append(li);
    });
    addBtn.hidden = items.length >= max;
  }
  function move(i, d) {
    const [x] = items.splice(i, 1);
    items.splice(i + d, 0, x);
    onChange(items);
    render();
  }
  render();
  return wrap;
}

/* ---------- Estructura del panel ---------- */
const NAV = [
  { id: 'resumen', label: 'Resumen', icon: 'home' },
  { id: 'productos', label: 'Productos', icon: 'box' },
  { id: 'categorias', label: 'Categorías', icon: 'folder' },
  { id: 'pedidos', label: 'Pedidos', icon: 'receipt' },
  { id: 'inicio', label: 'Página de inicio', icon: 'layout' },
  { id: 'apariencia', label: 'Colores y logo', icon: 'palette' },
  { id: 'contenido', label: 'Textos y páginas', icon: 'text' },
  { id: 'tienda', label: 'Tienda y contacto', icon: 'store' },
];

let dirty = false;
const setDirty = (v) => {
  dirty = v;
  document.body.classList.toggle('hay-cambios', v);
};
window.addEventListener('beforeunload', (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});

const main = h('main', { class: 'principal', id: 'principal', tabindex: '-1' });
const navList = h('ul');
const sidebar = h(
  'aside',
  { class: 'lateral', id: 'lateral' },
  h('a', { class: 'lateral__marca', href: '#/resumen' }, h('img', { src: '/marca/logo.webp', alt: '', width: 40, height: 36 }), h('span', {}, h('strong', { text: 'Panel JGR' }), h('small', { text: 'Administración' }))),
  h('nav', { 'aria-label': 'Secciones del panel' }, navList),
  h(
    'div',
    { class: 'lateral__pie' },
    h(
      'div',
      { class: 'usuario' },
      USER.avatar ? h('img', { src: USER.avatar, alt: '', width: 32, height: 32 }) : h('span', { class: 'usuario__ini', text: (USER.name || 'A')[0] }),
      h('span', {}, h('strong', { text: USER.name || USER.login }), h('small', { text: `@${USER.login}` })),
    ),
    h('form', { method: 'post', action: '/auth/salir' }, h('button', { class: 'btn btn--texto btn--sm', type: 'submit' }, icon('logout', 16), 'Cerrar sesión')),
  ),
);
for (const n of NAV) navList.append(h('li', {}, h('a', { href: `#/${n.id}`, 'data-nav': n.id }, icon(n.icon), n.label)));

const themeBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Cambiar modo claro u oscuro', onclick: () => {
  const dark = document.documentElement.getAttribute('data-theme') !== 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  try { localStorage.setItem('jgr-theme', dark ? 'dark' : 'light'); } catch {}
  themeBtn.replaceChildren(icon(dark ? 'sun' : 'moon'));
} }, icon(document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon'));

const topbar = h(
  'header',
  { class: 'barra-sup' },
  h('button', { class: 'icon-btn solo-movil', type: 'button', 'aria-label': 'Abrir menú del panel', onclick: () => document.body.classList.toggle('menu-abierto') }, icon('menu')),
  h('span', { class: 'barra-sup__titulo', id: 'titulo-vista' }),
  h('div', { class: 'barra-sup__acc' }, themeBtn, h('a', { class: 'btn btn--linea btn--sm', href: '/', target: '_blank', rel: 'noopener' }, icon('ext', 16), 'Ver tienda')),
);

app.replaceChildren(sidebar, h('div', { class: 'cuerpo' }, topbar, main));

function setTitle(t) {
  document.getElementById('titulo-vista').textContent = t;
  document.title = `${t} | Panel JGR`;
}

/* ---------- Router ---------- */
let lastHash = location.hash;
async function route() {
  const hash = location.hash || '#/resumen';
  if (dirty && hash !== lastHash) {
    const ok = await confirmDialog({ title: 'Tienes cambios sin guardar', text: 'Si sales ahora se perderán. ¿Quieres salir sin guardar?', confirm: 'Salir sin guardar' });
    if (!ok) {
      history.replaceState(null, '', lastHash);
      return;
    }
    setDirty(false);
  }
  lastHash = hash;
  document.body.classList.remove('menu-abierto');
  const [, section = 'resumen', sub] = hash.split('?')[0].split('/');
  for (const a of navList.querySelectorAll('a')) a.toggleAttribute('aria-current', a.dataset.nav === section);
  main.replaceChildren(h('p', { class: 'cargando', text: 'Cargando…' }));
  try {
    const view = VIEWS[section] || VIEWS.resumen;
    await view(sub);
  } catch (e) {
    if (e.message !== '401') main.replaceChildren(h('div', { class: 'aviso aviso--error' }, h('p', { text: e.message }), h('button', { class: 'btn btn--linea btn--sm', onclick: route, text: 'Intentar de nuevo' })));
  }
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

/* ---------- Datos compartidos ---------- */
let categoriesCache = null;
async function categories(force = false) {
  if (!categoriesCache || force) categoriesCache = (await api('/categorias')).items;
  return categoriesCache;
}
function categoryOptions(cats, { includeNone = true, onlyRoots = false, exclude } = {}) {
  const roots = cats.filter((c) => !c.parentId);
  const opts = includeNone ? [{ value: '', label: onlyRoots ? 'Ninguna (es categoría principal)' : 'Sin categoría' }] : [];
  for (const r of roots) {
    if (r.id === exclude) continue;
    opts.push({ value: String(r.id), label: r.name });
    if (!onlyRoots) for (const k of cats.filter((c) => c.parentId === r.id)) opts.push({ value: String(k.id), label: `   ${r.name} › ${k.name}` });
  }
  return opts;
}

/* ================= VISTAS ================= */
const VIEWS = {};

/* ---------- Resumen ---------- */
VIEWS.resumen = async () => {
  setTitle('Resumen');
  const r = await api('/resumen');
  const p = r.productos || {};
  const stat = (n, label, href) => h('a', { class: 'dato', href }, h('strong', { text: String(n ?? 0) }), h('span', { text: label }));
  main.replaceChildren(
    h('div', { class: 'cab-vista' }, h('div', {}, h('h1', { text: `Hola, ${(USER.name || USER.login).split(' ')[0]}` }), h('p', { text: 'Esto es lo que pasa en tu tienda.' })),
      h('div', { class: 'cab-vista__acc' }, h('a', { class: 'btn btn--primario', href: '#/productos/nuevo' }, icon('plus', 16), 'Nuevo producto'))),
    h(
      'section',
      { class: 'datos-fila', 'aria-label': 'Cifras de la tienda' },
      stat(p.visibles, 'productos publicados', '#/productos?estado=visibles'),
      stat(p.pocas, 'con pocas unidades', '#/productos?estado=pocas'),
      stat(p.agotados, 'agotados', '#/productos?estado=agotados'),
      stat(r.pedidos7?.n, 'pedidos en 7 días', '#/pedidos'),
    ),
    h(
      'section',
      { class: 'panel' },
      h('div', { class: 'panel__cab' }, h('h2', { text: 'Últimos pedidos' }), h('a', { href: '#/pedidos', text: 'Ver todos' })),
      r.recientes.length
        ? h('ul', { class: 'lista-simple' }, r.recientes.map((o) => h('li', {}, h('span', {}, h('strong', { text: o.code }), h('small', { text: ` ${fmtDate(o.createdAt)}${o.customer?.name ? ` · ${o.customer.name}` : ''}` })), h('span', { class: 'num', text: formatCOP(o.total) }), estadoPill(o.status))))
        : h('p', { class: 'vacio', text: 'Todavía no hay pedidos. Aparecerán aquí cuando un cliente envíe su carrito por WhatsApp.' }),
    ),
    h(
      'section',
      { class: 'panel' },
      h('div', { class: 'panel__cab' }, h('h2', { text: 'Accesos rápidos' })),
      h(
        'div',
        { class: 'accesos' },
        h('a', { href: '#/productos/nuevo' }, icon('box'), 'Agregar un producto'),
        h('a', { href: '#/categorias' }, icon('folder'), 'Crear una categoría'),
        h('a', { href: '#/inicio' }, icon('layout'), 'Cambiar frases e imágenes del inicio'),
        h('a', { href: '#/apariencia' }, icon('palette'), 'Cambiar colores y logo'),
      ),
    ),
  );
};

function estadoPill(s) {
  return h('span', { class: `pill pill--${s}`, text: s.charAt(0).toUpperCase() + s.slice(1) });
}

/* ---------- Productos: lista ---------- */
VIEWS.productos = async (sub) => {
  if (sub && sub.startsWith('nuevo')) return productEditor(null);
  if (sub && /^\d+/.test(sub)) return productEditor(parseInt(sub, 10));
  setTitle('Productos');
  const params = new URLSearchParams((location.hash.split('?')[1]) || '');
  const state = { q: params.get('q') || '', categoria: params.get('categoria') || '', estado: params.get('estado') || 'todos', pagina: Number(params.get('pagina')) || 1 };
  const cats = await categories(true);
  const tbody = h('tbody');
  const info = h('p', { class: 'tabla-info', role: 'status' });
  const pager = h('nav', { class: 'paginador', 'aria-label': 'Páginas de productos' });

  const load = async () => {
    const qs = new URLSearchParams({ q: state.q, categoria: state.categoria, estado: state.estado, pagina: String(state.pagina) });
    history.replaceState(null, '', `#/productos?${qs}`);
    lastHash = location.hash;
    const data = await api(`/productos?${qs}`);
    info.textContent = data.total === 1 ? '1 producto' : `${data.total} productos`;
    tbody.textContent = '';
    if (!data.items.length) {
      tbody.append(h('tr', {}, h('td', { colspan: 7, class: 'vacio' }, state.q || state.categoria || state.estado !== 'todos' ? 'Ningún producto coincide con estos filtros.' : 'Aún no tienes productos. Crea el primero con el botón "Nuevo producto".')));
    }
    for (const p of data.items) tbody.append(productRow(p, cats, load));
    pager.textContent = '';
    if (data.pages > 1) {
      for (let i = 1; i <= data.pages; i++) {
        pager.append(h('button', { type: 'button', class: `paginador__n${i === data.page ? ' is-actual' : ''}`, 'aria-current': i === data.page ? 'page' : null, text: String(i), onclick: () => { state.pagina = i; load(); } }));
      }
    }
  };

  let timer;
  const filtros = h(
    'div',
    { class: 'filtros' },
    field({ label: 'Buscar', type: 'search', value: state.q, attrs: { placeholder: 'Nombre o referencia' }, onInput: (v) => { clearTimeout(timer); timer = setTimeout(() => { state.q = v; state.pagina = 1; load(); }, 300); } }),
    field({ label: 'Categoría', type: 'select', value: state.categoria, options: [{ value: '', label: 'Todas' }, ...categoryOptions(cats, { includeNone: false, onlyRoots: false })], onInput: (v) => { state.categoria = v; state.pagina = 1; load(); } }),
    field({
      label: 'Mostrar',
      type: 'select',
      value: state.estado,
      options: [
        { value: 'todos', label: 'Todos' },
        { value: 'visibles', label: 'Publicados' },
        { value: 'ocultos', label: 'Ocultos' },
        { value: 'destacados', label: 'Destacados' },
        { value: 'pocas', label: 'Con pocas unidades' },
        { value: 'agotados', label: 'Agotados' },
        { value: 'sin-categoria', label: 'Sin categoría' },
      ],
      onInput: (v) => { state.estado = v; state.pagina = 1; load(); },
    }),
  );

  main.replaceChildren(
    h('div', { class: 'cab-vista' }, h('div', {}, h('h1', { text: 'Productos' }), h('p', { text: 'Edita precios y unidades directamente en la tabla, o abre un producto para cambiar todo.' })),
      h('div', { class: 'cab-vista__acc' }, h('a', { class: 'btn btn--primario', href: '#/productos/nuevo' }, icon('plus', 16), 'Nuevo producto'))),
    h('section', { class: 'panel' }, filtros, info,
      h('div', { class: 'tabla-wrap' },
        h('table', { class: 'tabla' },
          h('thead', {}, h('tr', {}, h('th', { text: 'Producto' }), h('th', { text: 'Categoría' }), h('th', { text: 'Precio (COP)' }), h('th', { text: 'Unidades' }), h('th', { text: 'Publicado' }), h('th', { text: 'Destacado' }), h('th', {}, h('span', { class: 'sr', text: 'Acciones' })))),
          tbody)),
      pager),
  );
  await load();
};

function productRow(p, cats, reload) {
  const cat = cats.find((c) => c.id === p.categoryId);
  const parent = cat?.parentId ? cats.find((c) => c.id === cat.parentId) : null;
  const patch = async (changes, okMsg) => {
    try {
      const { item } = await api(`/productos/${p.id}`, { method: 'PATCH', body: changes });
      Object.assign(p, item);
      toast(okMsg || 'Guardado');
      return true;
    } catch (e) {
      toast(e.message, 'error');
      return false;
    }
  };
  const priceInput = h('input', { type: 'number', min: 0, step: 100, value: p.price, class: 'en-linea', 'aria-label': `Precio de ${p.name}` });
  priceInput.addEventListener('change', async () => {
    if (!(await patch({ price: Number(priceInput.value) }, 'Precio guardado'))) priceInput.value = p.price;
  });
  const stockInput = h('input', { type: 'number', min: 0, step: 1, value: p.stock ?? '', placeholder: 'Sin límite', class: 'en-linea en-linea--corto', 'aria-label': `Unidades de ${p.name}` });
  stockInput.addEventListener('change', async () => {
    const v = stockInput.value === '' ? null : Number(stockInput.value);
    if (!(await patch({ stock: v }, 'Unidades guardadas'))) stockInput.value = p.stock ?? '';
    reload();
  });
  const sw = (checked, label, key) => {
    const input = h('input', { type: 'checkbox', role: 'switch', checked, 'aria-label': `${label}: ${p.name}`, class: 'switch' });
    input.addEventListener('change', async () => {
      if (!(await patch({ [key]: input.checked }, input.checked ? `${label}: sí` : `${label}: no`))) input.checked = !input.checked;
    });
    return input;
  };
  const pct = discountPercent(p.price, p.compareAtPrice);
  return h(
    'tr',
    { class: p.visible ? '' : 'is-oculto' },
    h('td', {},
      h('a', { class: 'prod-celda', href: `#/productos/${p.id}` },
        p.images[0] ? h('img', { src: p.images[0].url, alt: '', width: 48, height: 48, loading: 'lazy' }) : h('span', { class: 'prod-celda__sin' }, icon('box')),
        h('span', {}, h('strong', { text: p.name }), h('small', { text: [p.sku, p.soldOut ? 'Agotado' : '', pct ? `Oferta -${pct}%` : '', p.options.length ? `${p.options.length} variante${p.options.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ') })))),
    h('td', { text: cat ? (parent ? `${parent.name} › ${cat.name}` : cat.name) : 'Sin categoría' }),
    h('td', {}, priceInput),
    h('td', {}, stockInput),
    h('td', {}, sw(p.visible, 'Publicado', 'visible')),
    h('td', {}, sw(p.featured, 'Destacado', 'featured')),
    h('td', {}, h('div', { class: 'acciones' },
      h('a', { class: 'icon-btn', href: `#/productos/${p.id}`, 'aria-label': `Editar ${p.name}`, title: 'Editar' }, icon('edit')),
      h('a', { class: 'icon-btn', href: `/producto/${p.slug}`, target: '_blank', rel: 'noopener', 'aria-label': `Ver ${p.name} en la tienda`, title: 'Ver en la tienda' }, icon('eye')),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Duplicar ${p.name}`, title: 'Duplicar', onclick: async () => {
        try {
          const { item } = await api(`/productos/${p.id}/duplicar`, { method: 'POST' });
          toast('Copia creada (oculta). Edítala y publícala cuando esté lista.');
          location.hash = `#/productos/${item.id}`;
        } catch (e) { toast(e.message, 'error'); }
      } }, icon('copy')),
      h('button', { class: 'icon-btn icon-btn--peligro', type: 'button', 'aria-label': `Eliminar ${p.name}`, title: 'Eliminar', onclick: async () => {
        if (!(await confirmDialog({ title: `¿Eliminar "${p.name}"?`, text: 'El producto desaparece de la tienda y no se puede recuperar. Si solo quieres esconderlo, desactiva "Publicado".' }))) return;
        try { await api(`/productos/${p.id}`, { method: 'DELETE' }); toast('Producto eliminado'); reload(); } catch (e) { toast(e.message, 'error'); }
      } }, icon('trash'))),
    ),
  );
}

/* ---------- Productos: editor ---------- */
async function productEditor(id) {
  const cats = await categories(true);
  let p;
  if (id) p = (await api(`/productos/${id}`)).item;
  else
    p = { name: '', slug: '', categoryId: null, brand: '', sku: '', shortDescription: '', description: '', price: '', compareAtPrice: null, stock: null, soldOutFlag: false, featured: false, visible: true, sortOrder: 0, images: [], options: [], specs: [] };
  setTitle(id ? 'Editar producto' : 'Nuevo producto');
  const fields = {};
  const mark = () => setDirty(true);
  const set = (key) => (v) => { p[key] = v; mark(); updatePreview(); };

  /* Imágenes */
  const gal = h('ul', { class: 'galeria-ed' });
  const renderImages = () => {
    gal.textContent = '';
    if (!p.images.length) gal.append(h('li', { class: 'galeria-ed__vacia', text: 'Arrastra fotos aquí o usa "Subir fotos". La primera es la portada.' }));
    p.images.forEach((im, i) => {
      gal.append(
        h('li', { class: 'galeria-ed__item' },
          h('img', { src: im.url, alt: '' }),
          i === 0 ? h('span', { class: 'galeria-ed__portada', text: 'Portada' }) : null,
          h('div', { class: 'galeria-ed__herr' },
            h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Mover a la izquierda', disabled: i === 0, onclick: () => { p.images.splice(i - 1, 0, p.images.splice(i, 1)[0]); mark(); renderImages(); } }, icon('up')),
            h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Mover a la derecha', disabled: i === p.images.length - 1, onclick: () => { p.images.splice(i + 1, 0, p.images.splice(i, 1)[0]); mark(); renderImages(); } }, icon('down')),
            h('button', { type: 'button', class: 'icon-btn icon-btn--peligro', 'aria-label': 'Quitar foto', onclick: () => { p.images.splice(i, 1); mark(); renderImages(); } }, icon('trash'))),
          (() => {
            const alt = h('input', { type: 'text', value: im.alt || '', placeholder: 'Describe la foto', 'aria-label': `Descripción de la foto ${i + 1}` });
            alt.addEventListener('input', () => { im.alt = alt.value; mark(); });
            return alt;
          })()),
      );
    });
    updatePreview();
  };
  const addFiles = async (files) => {
    files = files.filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    const room = 12 - p.images.length;
    if (room <= 0) return toast('Puedes tener hasta 12 fotos por producto.', 'error');
    upBtn.disabled = true;
    let done = 0;
    for (const f of files.slice(0, room)) {
      upBtn.textContent = `Subiendo ${++done} de ${Math.min(files.length, room)}…`;
      try {
        const url = await uploadImage(f);
        p.images.push({ url, alt: p.name });
        mark();
        renderImages();
      } catch (e) {
        toast(`${f.name}: ${e.message}`, 'error');
      }
    }
    upBtn.disabled = false;
    upBtn.replaceChildren(icon('upload', 16), 'Subir fotos');
  };
  const upBtn = h('button', { type: 'button', class: 'btn btn--linea btn--sm', onclick: async () => addFiles(await pickFiles(true)) }, icon('upload', 16), 'Subir fotos');
  const urlBtn = h('button', { type: 'button', class: 'btn btn--texto btn--sm', text: 'Agregar por enlace', onclick: () => {
    const url = prompt('Pega el enlace https de la imagen');
    if (!url) return;
    if (!/^https:\/\/\S+$/i.test(url.trim())) return toast('El enlace debe empezar por https://', 'error');
    p.images.push({ url: url.trim(), alt: p.name }); mark(); renderImages();
  } });
  const dropZone = h('div', { class: 'zona-fotos' }, gal, h('div', { class: 'zona-fotos__acc' }, upBtn, urlBtn, h('span', { class: 'campo__ayuda', text: 'JPG, PNG o WEBP. Se optimizan solas antes de subir.' })));
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('is-drop'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-drop'));
  dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('is-drop'); addFiles([...e.dataTransfer.files]); });

  /* Vista previa de precio */
  const preview = h('div', { class: 'vista-precio', 'aria-live': 'polite' });
  function updatePreview() {
    preview.textContent = '';
    const price = Number(p.price) || 0;
    const compare = Number(p.compareAtPrice) || 0;
    const pct = discountPercent(price, compare);
    preview.append(
      h('span', { class: 'vista-precio__t', text: 'Así se verá en la tienda' }),
      h('div', { class: 'vista-precio__fila' },
        h('strong', { class: pct ? 'es-oferta' : '', text: formatCOP(price) }),
        pct ? h('s', { text: formatCOP(compare) }) : null,
        pct ? h('span', { class: 'pill pill--oferta', text: `-${pct}%` }) : null),
      h('span', { class: 'vista-precio__stock', text: p.soldOutFlag || p.stock === 0 ? 'Agotado' : p.stock === null || p.stock === '' ? 'Disponible (sin control de unidades)' : `${p.stock} unidades disponibles` }),
    );
  }

  /* Variantes */
  const optionsWrap = h('div', { class: 'variantes' });
  const renderOptions = () => {
    optionsWrap.textContent = '';
    if (!p.options.length) optionsWrap.append(h('p', { class: 'campo__ayuda', text: 'Si el producto viene en colores, tallas o versiones, agrégalas aquí. El cliente deberá elegir una antes de agregarlo al carrito.' }));
    p.options.forEach((o, oi) => {
      optionsWrap.append(
        h('div', { class: 'variante' },
          h('div', { class: 'variante__cab' },
            field({ label: 'Nombre de la opción', value: o.name, attrs: { placeholder: 'Ej.: Color, Talla, Capacidad' }, onInput: (v) => { o.name = v; mark(); } }),
            h('button', { type: 'button', class: 'btn btn--texto btn--sm btn--peligro-txt', onclick: () => { p.options.splice(oi, 1); mark(); renderOptions(); } }, icon('trash', 16), 'Quitar opción')),
          repeater({
            items: o.values,
            addLabel: 'Agregar valor',
            empty: 'Agrega al menos un valor (por ejemplo: Negro).',
            onChange: mark,
            max: 30,
            fields: [
              { key: 'label', label: 'Valor', attrs: { placeholder: 'Ej.: Negro' } },
              { key: 'delta', label: 'Ajuste de precio', type: 'number', default: 0, hint: 'Suma o resta al precio. 0 si cuesta igual.', attrs: { step: 100 } },
              { key: 'soldOut', label: 'Agotado', type: 'checkbox', default: false },
            ],
          })),
      );
    });
    if (p.options.length < 4) optionsWrap.append(h('button', { type: 'button', class: 'btn btn--linea btn--sm', onclick: () => { p.options.push({ name: '', values: [{ label: '', delta: 0, soldOut: false }] }); mark(); renderOptions(); } }, icon('plus', 16), p.options.length ? 'Agregar otra opción' : 'Agregar opción (color, talla…)'));
  };

  fields.name = field({ label: 'Nombre del producto', value: p.name, attrs: { required: true, maxlength: 160 }, onInput: (v) => { p.name = v; if (!id && !slugTouched) { fields.slug.control.value = slugify(v); p.slug = slugify(v); } mark(); } });
  let slugTouched = !!id;
  fields.categoryId = field({ label: 'Categoría', type: 'select', value: p.categoryId ? String(p.categoryId) : '', options: categoryOptions(cats), onInput: (v) => { p.categoryId = v ? Number(v) : null; mark(); } });
  fields.price = field({ label: 'Precio de venta', type: 'number', value: p.price, hint: 'En pesos, sin puntos. Ej.: 129900', attrs: { min: 0, step: 100, required: true, inputmode: 'numeric' }, onInput: (v) => set('price')(v === '' ? '' : Number(v)) });
  fields.compareAtPrice = field({ label: 'Precio anterior (opcional)', type: 'number', value: p.compareAtPrice ?? '', hint: 'Si lo llenas, se muestra tachado y el precio de venta aparece como oferta.', attrs: { min: 0, step: 100, inputmode: 'numeric' }, onInput: (v) => set('compareAtPrice')(v === '' ? null : Number(v)) });
  fields.stock = field({ label: 'Unidades disponibles', type: 'number', value: p.stock ?? '', hint: 'Déjalo vacío si no quieres controlar unidades. Con 0 se marca agotado.', attrs: { min: 0, step: 1, inputmode: 'numeric', placeholder: 'Sin límite' }, onInput: (v) => set('stock')(v === '' ? null : Number(v)) });
  fields.slug = field({ label: 'Dirección del producto', value: p.slug, hint: 'Se crea sola con el nombre. Solo cámbiala si sabes lo que haces.', attrs: { maxlength: 120 }, onInput: (v) => { slugTouched = true; p.slug = slugify(v); mark(); } });

  const form = h(
    'form',
    { class: 'editor', novalidate: true },
    h('div', { class: 'editor__col' },
      h('section', { class: 'panel' }, h('h2', { text: 'Información' }),
        fields.name,
        field({ label: 'Descripción corta', type: 'textarea', value: p.shortDescription, hint: 'Una o dos frases. Aparece junto al precio.', attrs: { rows: 2, maxlength: 300 }, onInput: (v) => { p.shortDescription = v; mark(); } }),
        field({ label: 'Descripción completa', type: 'textarea', value: p.description, hint: 'Escribe "## " al inicio de una línea para un subtítulo y "- " para una lista. Deja una línea en blanco entre párrafos.', attrs: { rows: 8, maxlength: 10000 }, onInput: (v) => { p.description = v; mark(); } })),
      h('section', { class: 'panel' }, h('h2', { text: 'Fotos' }), dropZone),
      h('section', { class: 'panel' }, h('h2', { text: 'Variantes' }), optionsWrap),
      h('section', { class: 'panel' }, h('h2', { text: 'Ficha técnica' }),
        repeater({ items: p.specs, addLabel: 'Agregar característica', empty: 'Agrega datos como potencia, batería o medidas.', onChange: mark, max: 40, fields: [
          { key: 'label', label: 'Característica', attrs: { placeholder: 'Ej.: Batería' } },
          { key: 'value', label: 'Valor', attrs: { placeholder: 'Ej.: Hasta 20 h' } },
        ] }))),
    h('div', { class: 'editor__col editor__col--lado' },
      h('section', { class: 'panel' }, h('h2', { text: 'Publicación' }),
        toggle({ label: 'Publicado en la tienda', checked: p.visible, onChange: (v) => { p.visible = v; mark(); }, hint: 'Si lo apagas, el producto queda guardado pero no se ve.' }),
        toggle({ label: 'Destacado en el inicio', checked: p.featured, onChange: (v) => { p.featured = v; mark(); }, hint: 'Los destacados aparecen en la vitrina principal.' }),
        fields.categoryId),
      h('section', { class: 'panel' }, h('h2', { text: 'Precio' }), fields.price, fields.compareAtPrice, preview),
      h('section', { class: 'panel' }, h('h2', { text: 'Inventario' }), fields.stock,
        toggle({ label: 'Marcar como agotado', checked: p.soldOutFlag, onChange: (v) => { p.soldOutFlag = v; mark(); updatePreview(); }, hint: 'Útil cuando se acaba aunque no lleves el conteo de unidades.' })),
      h('section', { class: 'panel' }, h('h2', { text: 'Datos adicionales' }),
        field({ label: 'Marca', value: p.brand, attrs: { maxlength: 80 }, onInput: (v) => { p.brand = v; mark(); } }),
        field({ label: 'Referencia (SKU)', value: p.sku, attrs: { maxlength: 60 }, onInput: (v) => { p.sku = v; mark(); } }),
        fields.slug)),
  );

  const saveBtn = h('button', { type: 'submit', class: 'btn btn--primario' }, icon('check', 16), id ? 'Guardar cambios' : 'Crear producto');
  const bar = h('div', { class: 'barra-guardar' },
    h('a', { class: 'btn btn--texto btn--sm', href: '#/productos', text: 'Volver a productos' }),
    h('span', { class: 'barra-guardar__estado', text: 'Cambios sin guardar' }),
    id ? h('a', { class: 'btn btn--linea', href: `/producto/${p.slug}`, target: '_blank', rel: 'noopener' }, icon('eye', 16), 'Ver en la tienda') : null,
    saveBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    for (const f of Object.values(fields)) f.setError('');
    if (!String(p.name).trim()) return fields.name.setError('Escribe el nombre del producto.');
    if (p.price === '' || p.price === null || Number.isNaN(Number(p.price))) return fields.price.setError('Escribe el precio en pesos.');
    for (const o of p.options) {
      o.values = o.values.filter((v) => String(v.label || '').trim());
      if (!String(o.name).trim() || !o.values.length) return toast('Cada opción necesita un nombre y al menos un valor.', 'error');
    }
    saveBtn.disabled = true;
    try {
      const body = { ...p };
      const res = id ? await api(`/productos/${id}`, { method: 'PUT', body }) : await api('/productos', { method: 'POST', body });
      setDirty(false);
      toast(id ? 'Cambios guardados. Ya se ven en la tienda.' : 'Producto creado');
      if (!id) location.hash = `#/productos/${res.item.id}`;
      else productEditor(id);
    } catch (err) {
      if (err.field && fields[err.field]) fields[err.field].setError(err.message);
      else toast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });
  form.append(bar);
  main.replaceChildren(
    h('div', { class: 'cab-vista' }, h('div', {}, h('h1', { text: id ? p.name : 'Nuevo producto' }), h('p', { text: id ? 'Los cambios se publican apenas guardas.' : 'Llena los datos y presiona "Crear producto".' }))),
    form,
  );
  renderImages();
  renderOptions();
  updatePreview();
  setDirty(false);
}

/* ---------- Categorías ---------- */
VIEWS.categorias = async () => {
  setTitle('Categorías');
  const cats = await categories(true);
  const roots = cats.filter((c) => !c.parentId);
  const editor = h('div', { class: 'cat-editor' });

  const list = h('ul', { class: 'arbol' });
  const moveIn = async (group, i, d) => {
    const ids = group.map((c) => c.id);
    const [x] = ids.splice(i, 1);
    ids.splice(i + d, 0, x);
    // Se guarda el orden de todas las categorías respetando el nuevo orden del grupo.
    const all = [];
    const newRoots = group[0].parentId ? roots.map((r) => r.id) : ids;
    for (const rid of newRoots) {
      all.push(rid);
      const kids = cats.filter((c) => c.parentId === rid).map((c) => c.id);
      all.push(...(group[0].parentId === rid ? ids : kids));
    }
    await api('/categorias/orden', { method: 'POST', body: { ids: all } });
    toast('Orden guardado');
    VIEWS.categorias();
  };
  const row = (c, group, i) =>
    h('div', { class: `arbol__fila${c.visible ? '' : ' is-oculto'}` },
      c.image ? h('img', { src: c.image, alt: '', width: 44, height: 44 }) : h('span', { class: 'prod-celda__sin' }, icon('folder')),
      h('span', { class: 'arbol__nombre' }, h('strong', { text: c.name }), h('small', { text: `${c.productCount} productos${c.visible ? '' : ' · oculta'}` })),
      h('div', { class: 'acciones' },
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Subir ${c.name}`, disabled: i === 0, onclick: () => moveIn(group, i, -1) }, icon('up')),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Bajar ${c.name}`, disabled: i === group.length - 1, onclick: () => moveIn(group, i, 1) }, icon('down')),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Editar ${c.name}`, onclick: () => openEditor(c) }, icon('edit')),
        h('a', { class: 'icon-btn', href: `/categoria/${c.slug}`, target: '_blank', rel: 'noopener', 'aria-label': `Ver ${c.name} en la tienda` }, icon('eye'))));
  roots.forEach((r, i) => {
    const kids = cats.filter((c) => c.parentId === r.id);
    list.append(h('li', {}, row(r, roots, i), kids.length ? h('ul', {}, kids.map((k, ki) => h('li', {}, row(k, kids, ki)))) : null,
      h('button', { class: 'btn btn--texto btn--sm arbol__sub', type: 'button', onclick: () => openEditor({ parentId: r.id }) }, icon('plus', 14), `Subcategoría en ${r.name}`)));
  });
  if (!roots.length) list.append(h('li', { class: 'vacio', text: 'Aún no hay categorías. Crea la primera.' }));

  function openEditor(c) {
    const isNew = !c.id;
    const data = { name: c.name || '', parentId: c.parentId || null, description: c.description || '', image: c.image || '', visible: c.visible !== false, slug: c.slug || '', sortOrder: c.sortOrder || 0 };
    const nameF = field({ label: 'Nombre', value: data.name, attrs: { maxlength: 80, required: true }, onInput: (v) => { data.name = v; setDirty(true); } });
    const parentF = field({ label: 'Está dentro de', type: 'select', value: data.parentId ? String(data.parentId) : '', options: categoryOptions(cats, { onlyRoots: true, exclude: c.id }), hint: 'Elige una categoría principal para que esta sea una subcategoría.', onInput: (v) => { data.parentId = v ? Number(v) : null; setDirty(true); } });
    const save = h('button', { class: 'btn btn--primario', type: 'submit' }, icon('check', 16), isNew ? 'Crear categoría' : 'Guardar cambios');
    const f = h('form', { class: 'panel', novalidate: true },
      h('div', { class: 'panel__cab' }, h('h2', { text: isNew ? 'Nueva categoría' : `Editar ${c.name}` }), h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Cerrar', onclick: () => { setDirty(false); editor.textContent = ''; } }, icon('close'))),
      nameF, parentF,
      field({ label: 'Descripción', type: 'textarea', value: data.description, attrs: { rows: 3, maxlength: 600 }, hint: 'Aparece bajo el nombre en el inicio y en la página de la categoría.', onInput: (v) => { data.description = v; setDirty(true); } }),
      imageField({ label: 'Imagen de portada', value: data.image, hint: 'Se muestra en la ventana de la categoría en el inicio. Mejor horizontal.', onChange: (v) => { data.image = v; setDirty(true); } }),
      toggle({ label: 'Visible en la tienda', checked: data.visible, onChange: (v) => { data.visible = v; setDirty(true); } }),
      !isNew ? field({ label: 'Dirección', value: data.slug, hint: `Se ve así: /categoria/${data.slug}`, onInput: (v) => { data.slug = slugify(v); setDirty(true); } }) : null,
      h('div', { class: 'fila-acc' },
        !isNew ? h('button', { class: 'btn btn--texto btn--peligro-txt', type: 'button', onclick: async () => {
          if (!(await confirmDialog({ title: `¿Eliminar la categoría "${c.name}"?`, text: 'Sus productos y subcategorías no se borran: quedan sin categoría hasta que los muevas.' }))) return;
          try { await api(`/categorias/${c.id}`, { method: 'DELETE' }); setDirty(false); toast('Categoría eliminada'); VIEWS.categorias(); } catch (e) { toast(e.message, 'error'); }
        } }, icon('trash', 16), 'Eliminar') : h('span'),
        save));
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      nameF.setError('');
      parentF.setError('');
      if (!data.name.trim()) return nameF.setError('Escribe el nombre.');
      save.disabled = true;
      try {
        if (isNew) await api('/categorias', { method: 'POST', body: data });
        else await api(`/categorias/${c.id}`, { method: 'PUT', body: data });
        setDirty(false);
        toast(isNew ? 'Categoría creada' : 'Cambios guardados');
        VIEWS.categorias();
      } catch (err) {
        if (err.field === 'parentId') parentF.setError(err.message);
        else if (err.field === 'name') nameF.setError(err.message);
        else toast(err.message, 'error');
      } finally { save.disabled = false; }
    });
    editor.replaceChildren(f);
    nameF.control.focus();
    if (matchMedia('(max-width: 900px)').matches) f.scrollIntoView({ behavior: 'smooth' });
  }

  main.replaceChildren(
    h('div', { class: 'cab-vista' }, h('div', {}, h('h1', { text: 'Categorías' }), h('p', { text: 'Organiza tu tienda en categorías principales y subcategorías. Usa las flechas para cambiar el orden en el menú y en el inicio.' })),
      h('div', { class: 'cab-vista__acc' }, h('button', { class: 'btn btn--primario', type: 'button', onclick: () => openEditor({}) }, icon('plus', 16), 'Nueva categoría'))),
    h('div', { class: 'dos-col' }, h('section', { class: 'panel' }, list), editor),
  );
};

/* ---------- Pedidos ---------- */
VIEWS.pedidos = async () => {
  setTitle('Pedidos');
  const state = { pagina: 1, estado: '' };
  const wrap = h('div');
  const load = async () => {
    const data = await api(`/pedidos?pagina=${state.pagina}&estado=${state.estado}`);
    wrap.textContent = '';
    if (!data.items.length) wrap.append(h('p', { class: 'vacio', text: state.estado ? 'No hay pedidos con este estado.' : 'Todavía no hay pedidos. Cada vez que un cliente envía su carrito por WhatsApp, queda registrado aquí.' }));
    for (const o of data.items) {
      const status = h('select', { 'aria-label': `Estado del pedido ${o.code}` }, data.statuses.map((s) => h('option', { value: s, text: s.charAt(0).toUpperCase() + s.slice(1) })));
      status.value = o.status;
      status.addEventListener('change', async () => {
        try { await api(`/pedidos/${o.id}`, { method: 'PATCH', body: { status: status.value } }); toast('Estado actualizado'); } catch (e) { toast(e.message, 'error'); status.value = o.status; }
      });
      const c = o.customer || {};
      wrap.append(
        h('details', { class: 'pedido' },
          h('summary', {},
            h('span', { class: 'pedido__cod' }, h('strong', { text: o.code }), h('small', { text: fmtDate(o.createdAt) })),
            h('span', { class: 'pedido__cli', text: c.name || 'Sin nombre' }),
            h('span', { class: 'num', text: formatCOP(o.total) }),
            estadoPill(o.status)),
          h('div', { class: 'pedido__det' },
            h('table', { class: 'tabla tabla--compacta' },
              h('thead', {}, h('tr', {}, h('th', { text: 'Producto' }), h('th', { text: 'Cant.' }), h('th', { text: 'Precio' }), h('th', { text: 'Subtotal' }))),
              h('tbody', {}, o.items.map((it) => h('tr', {},
                h('td', { text: `${it.name}${Object.keys(it.variant || {}).length ? ` (${Object.entries(it.variant).map(([k, v]) => `${k}: ${v}`).join(', ')})` : ''}` }),
                h('td', { class: 'num', text: String(it.qty) }), h('td', { class: 'num', text: formatCOP(it.unitPrice) }), h('td', { class: 'num', text: formatCOP(it.qty * it.unitPrice) })))),
              h('tfoot', {}, h('tr', {}, h('td', { colspan: 3, text: 'Total productos (sin envío)' }), h('td', { class: 'num', text: formatCOP(o.total) })))),
            h('dl', { class: 'pedido__datos' },
              [['Ciudad', c.city], ['Dirección', c.address], ['Pago preferido', c.payment], ['Nota', c.note]].filter(([, v]) => v).map(([k, v]) => h('div', {}, h('dt', { text: k }), h('dd', { text: v })))),
            h('div', { class: 'fila-acc' },
              h('label', { class: 'campo campo--en-linea' }, h('span', { class: 'campo__label', text: 'Estado' }), status),
              h('button', { class: 'btn btn--texto btn--peligro-txt btn--sm', type: 'button', onclick: async () => {
                if (!(await confirmDialog({ title: `¿Eliminar el pedido ${o.code}?`, text: 'Solo se borra del panel. La conversación de WhatsApp no se ve afectada.' }))) return;
                try { await api(`/pedidos/${o.id}`, { method: 'DELETE' }); toast('Pedido eliminado'); load(); } catch (e) { toast(e.message, 'error'); }
              } }, icon('trash', 16), 'Eliminar')))),
      );
    }
    if (data.pages > 1) {
      const pager = h('nav', { class: 'paginador', 'aria-label': 'Páginas de pedidos' });
      for (let i = 1; i <= data.pages; i++) pager.append(h('button', { type: 'button', class: `paginador__n${i === data.page ? ' is-actual' : ''}`, text: String(i), onclick: () => { state.pagina = i; load(); } }));
      wrap.append(pager);
    }
  };
  main.replaceChildren(
    h('div', { class: 'cab-vista' }, h('div', {}, h('h1', { text: 'Pedidos' }), h('p', { text: 'Cada carrito enviado por WhatsApp queda aquí con su código, para que lo encuentres en la conversación y lleves el seguimiento.' }))),
    h('section', { class: 'panel' },
      h('div', { class: 'filtros' }, field({ label: 'Mostrar', type: 'select', value: '', options: [{ value: '', label: 'Todos' }, ...['nuevo', 'confirmado', 'enviado', 'entregado', 'cancelado'].map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))], onInput: (v) => { state.estado = v; state.pagina = 1; load(); } })),
      wrap),
  );
  await load();
};

/* ---------- Secciones de ajustes (formularios genéricos) ---------- */
let settingsCache;
async function loadSettings() {
  settingsCache = await api('/ajustes');
  return settingsCache;
}

function settingsForm({ title, intro, sections }) {
  const saveBtn = h('button', { type: 'submit', class: 'btn btn--primario' }, icon('check', 16), 'Guardar cambios');
  const bar = h('div', { class: 'barra-guardar' }, h('span', { class: 'barra-guardar__estado', text: 'Cambios sin guardar' }), h('a', { class: 'btn btn--linea', href: '/', target: '_blank', rel: 'noopener' }, icon('eye', 16), 'Ver tienda'), saveBtn);
  const form = h('form', { class: 'ajustes', novalidate: true }, ...sections.map((s) => s.node), bar);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;
    try {
      for (const s of sections) if (s.save) await s.save();
      setDirty(false);
      toast('Cambios guardados. Ya se ven en la tienda.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });
  main.replaceChildren(h('div', { class: 'cab-vista' }, h('div', {}, h('h1', { text: title }), intro ? h('p', { text: intro }) : null)), form);
  setDirty(false);
}

/** Crea una sección de ajustes que edita una copia de settings[key] y la guarda con PUT. */
function section(key, title, build, { intro } = {}) {
  const value = structuredClone(settingsCache.settings[key]);
  const mark = () => setDirty(true);
  const node = h('section', { class: 'panel' }, h('h2', { text: title }), intro ? h('p', { class: 'campo__ayuda', text: intro }) : null);
  build(node, value, mark);
  return { node, save: async () => { const r = await api(`/ajustes/${key}`, { method: 'PUT', body: value }); settingsCache.settings[key] = r.value; } };
}

const ICON_LABELS = { shield: 'Escudo (seguridad)', gem: 'Diamante (calidad)', tag: 'Etiqueta (precio)', chat: 'Mensaje (atención)', truck: 'Camión (envíos)', box: 'Caja (producto)', star: 'Estrella', clock: 'Reloj (rapidez)' };

const STYLE_OPTS = [
  { value: 'oscuro', label: 'Oscuro (negro con dorado)' },
  { value: 'dorado', label: 'Dorado' },
  { value: 'claro', label: 'Claro' },
];

VIEWS.inicio = async () => {
  setTitle('Página de inicio');
  await loadSettings();
  const cats = await categories(true);
  const icons = settingsCache.icons.map((i) => ({ value: i, label: ICON_LABELS[i] || i }));
  const linkHint = 'Ej.: /ofertas, /categoria/cocina, un enlace https o la palabra whatsapp.';
  settingsForm({
    title: 'Página de inicio',
    intro: 'Cambia las promociones, frases, imágenes y qué secciones se muestran. Cada sección se puede ocultar.',
    sections: [
      section('home', 'Secciones del inicio', (n, v, mark) => {
        const grupo = (titulo, abierto, ...hijos) => h('details', { class: 'grupo', open: abierto }, h('summary', {}, h('span', { text: titulo }), icon('down', 18)), h('div', { class: 'grupo__cuerpo' }, ...hijos));
        const t = (label, key, hint) => toggle({ label, checked: v[key], hint, onChange: (x) => { v[key] = x; mark(); } });
        const f = (label, key, opts = {}) => field({ label, value: v[key], ...opts, onInput: (x) => { v[key] = opts.type === 'number' ? Number(x) : x; mark(); } });
        n.append(
          grupo('Promociones principales (slides)', true,
          h('p', { class: 'campo__ayuda', text: 'Rotan solas cada 6 segundos. Usa imágenes con fondo transparente (PNG o WEBP) para que se vean mejor.' }),
          repeater({ items: v.slides, addLabel: 'Agregar promoción', empty: 'Sin promociones: el inicio empieza en la franja de confianza.', onChange: mark, max: 8, fields: [
            { key: 'title', label: 'Título', attrs: { maxlength: 140 }, wide: true },
            { key: 'subtitle', label: 'Texto', type: 'textarea', attrs: { rows: 2, maxlength: 300 }, wide: true },
            { key: 'buttonText', label: 'Texto del botón', attrs: { maxlength: 40 } },
            { key: 'link', label: 'Enlace del botón', hint: linkHint, attrs: { maxlength: 300 } },
            { key: 'style', label: 'Estilo', type: 'select', options: STYLE_OPTS, default: 'oscuro' },
            { key: 'image', label: 'Imagen', type: 'image', default: '' },
          ] })
          ),
          grupo('Razones para comprar', false,
          repeater({ items: v.trust, addLabel: 'Agregar razón', empty: 'Sin razones: la franja no se mostrará.', onChange: mark, max: 6, fields: [
            { key: 'icon', label: 'Ícono', type: 'select', options: icons, default: 'shield' },
            { key: 'title', label: 'Título', attrs: { maxlength: 60 } },
            { key: 'text', label: 'Texto', attrs: { maxlength: 160 }, wide: true },
          ] })
          ),
          grupo('Categorías', false,
          t('Mostrar la cuadrícula de categorías', 'showCategories'),
          t('Incluir subcategorías en la cuadrícula', 'categoriesIncludeSubs', 'Si lo apagas, solo se muestran las categorías principales.'),
          f('Título', 'categoriesTitle'),
          f('Texto (opcional)', 'categoriesSubtitle')
          ),
          grupo('Ofertas del día', false,
          t('Mostrar ofertas del día', 'showOffers', 'Aparecen los productos que tienen precio anterior, ordenados por mayor descuento.'),
          f('Título', 'offersTitle'),
          f('Texto', 'offersSubtitle'),
          f('Las ofertas terminan el', 'offersEndsAt', { type: 'datetime-local', hint: 'Déjalo vacío para que la cuenta regresiva termine cada día a medianoche.' })
          ),
          grupo('Destacados (tarjetas inclinadas)', false,
          t('Mostrar destacados', 'showFeatured', 'Aparecen los productos marcados como "Destacado".'),
          f('Título', 'featuredTitle'),
          f('Texto', 'featuredSubtitle')
          ),
          grupo('Banners promocionales', false,
          repeater({ items: v.banners, addLabel: 'Agregar banner', empty: 'Sin banners: la fila no se mostrará.', onChange: mark, max: 3, fields: [
            { key: 'title', label: 'Título', attrs: { maxlength: 80 } },
            { key: 'text', label: 'Texto', attrs: { maxlength: 200 }, wide: true },
            { key: 'buttonText', label: 'Texto del botón', attrs: { maxlength: 40 } },
            { key: 'link', label: 'Enlace', hint: linkHint, attrs: { maxlength: 300 } },
            { key: 'style', label: 'Estilo', type: 'select', options: STYLE_OPTS, default: 'claro' },
            { key: 'icon', label: 'Ícono (si no hay imagen)', type: 'select', options: icons, default: 'box' },
            { key: 'image', label: 'Imagen (opcional)', type: 'image', default: '' },
          ] })
          ),
          grupo('Colección de temporada', false,
          t('Mostrar colección de temporada', 'showSeasonal'),
          f('Título', 'seasonalTitle', { hint: 'Ej.: Regalos para esta Navidad, Día de la madre, Regreso a clases.' }),
          f('Texto', 'seasonalSubtitle'),
          field({ label: 'Productos de la categoría', type: 'select', value: v.seasonalCategoryId ? String(v.seasonalCategoryId) : '', options: categoryOptions(cats, { includeNone: false }).length ? [{ value: '', label: 'Elige una categoría' }, ...categoryOptions(cats, { includeNone: false })] : [{ value: '', label: 'Crea una categoría primero' }], hint: 'Tip: crea una categoría "Navidad" y muévele los productos de temporada.', onInput: (x) => { v.seasonalCategoryId = x ? Number(x) : null; mark(); } })
          ),
          grupo('Descubre nuestros productos', false,
          t('Mostrar los productos más recientes', 'showDiscover'),
          f('Título', 'discoverTitle'),
          f('Cuántos productos mostrar', 'discoverCount', { type: 'number', attrs: { min: 4, max: 24, step: 4 } })
          ),
          grupo('Cómo comprar', false,
          t('Mostrar los pasos', 'showSteps'),
          f('Título', 'stepsTitle'),
          repeater({ items: v.steps, addLabel: 'Agregar paso', empty: 'Sin pasos: la sección no se mostrará.', onChange: mark, max: 6, fields: [
            { key: 'title', label: 'Paso', attrs: { maxlength: 80 } },
            { key: 'text', label: 'Explicación', attrs: { maxlength: 200 }, wide: true },
          ] })
          ),
          grupo('Otras secciones', false,
          t('Mostrar testimonios', 'showTestimonials', 'Los testimonios se editan en "Textos y páginas".'),
          f('Título de testimonios', 'testimonialsTitle'),
          t('Mostrar preguntas frecuentes', 'showFaq'),
          f('Título de preguntas', 'faqTitle')
          ),
          grupo('Franja final', false,
          f('Título', 'closingTitle', { hint: 'Déjalo vacío para ocultar la franja.' }),
          f('Texto', 'closingText'),
          imageField({ label: 'Foto de fondo (opcional)', value: v.closingImage, onChange: (x) => { v.closingImage = x; mark(); } })
          ),
        );
      }),
      section('store', 'Barra de aviso superior', (n, v, mark) => {
        n.append(field({ label: 'Texto del aviso', value: v.announcement, hint: 'Aparece arriba de todo. Déjalo vacío para ocultarlo.', attrs: { maxlength: 160 }, onInput: (x) => { v.announcement = x; mark(); } }));
      }),
    ],
  });
};

const COLOR_LABELS = {
  bg: ['Fondo de la página', 'El color de base de toda la tienda.'],
  surface: ['Fondo de vitrinas y paneles', 'Detrás de los productos, el carrito y el pie.'],
  ink: ['Texto principal', 'Títulos y textos.'],
  muted: ['Texto secundario', 'Descripciones y notas.'],
  line: ['Líneas y bordes', 'Separadores y bordes de campos.'],
  gold: ['Dorado de detalles', 'Filos, luces de las vitrinas y bordes dorados.'],
  goldText: ['Dorado para textos', 'La frase principal y los textos dorados. Debe leerse bien.'],
  sale: ['Precio en oferta', 'El precio cuando hay descuento.'],
  button: ['Botón principal', 'Fondo de "Agregar al carrito" y de la barra superior.'],
  buttonText: ['Texto del botón principal', 'Debe contrastar con el botón.'],
  onGold: ['Texto sobre dorado', 'Texto de "Añadir al carrito" y etiquetas doradas.'],
};

function contrast(a, b) {
  const lum = (hex) => {
    const n = hex.replace('#', '');
    const f = n.length === 3 ? n.split('').map((c) => c + c).join('') : n;
    const rgb = [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

VIEWS.apariencia = async () => {
  setTitle('Colores y logo');
  await loadSettings();
  const defaults = settingsCache.defaults.theme;
  settingsForm({
    title: 'Colores y logo',
    intro: 'Cambia los colores de la tienda en modo claro y modo oscuro. La vista previa se actualiza mientras eliges.',
    sections: [
      section('brand', 'Marca', (n, v, mark) => {
        n.append(
          field({ label: 'Nombre de la tienda', value: v.name, attrs: { maxlength: 80 }, onInput: (x) => { v.name = x; mark(); } }),
          field({ label: 'Eslogan', value: v.slogan, attrs: { maxlength: 120 }, onInput: (x) => { v.slogan = x; mark(); } }),
          imageField({ label: 'Logo', value: v.logo, hint: 'Usa un PNG o WEBP con fondo transparente.', onChange: (x) => { v.logo = x || '/marca/logo.webp'; mark(); } }),
        );
      }),
      section('theme', 'Colores', (n, v, mark) => {
        const mode = (key, label) => {
          const prev = h('div', { class: 'vista-color', 'data-modo': key });
          const paint = () => {
            const t = v[key];
            for (const [k, val] of Object.entries(t)) prev.style.setProperty(`--p-${k}`, val);
            prev.replaceChildren(
              h('div', { class: 'vista-color__vitrina' }, h('span', { class: 'vista-color__rotulo', text: 'Lo mejor en tecnología' }), h('span', { class: 'vista-color__sub', text: 'Texto secundario de ejemplo' }),
                h('div', { class: 'vista-color__fila' }, h('span', { class: 'vista-color__precio', text: '$129.900' }), h('s', { text: '$179.900' })), h('span', { class: 'vista-color__btn', text: 'Añadir al carrito' })),
            );
            const warn = [];
            if (contrast(t.ink, t.bg) < 4.5) warn.push('el texto principal casi no se lee sobre el fondo');
            if (contrast(t.goldText, t.surface) < 4.5) warn.push('el dorado para textos se lee poco sobre las vitrinas');
            if (contrast(t.buttonText, t.button) < 4.5) warn.push('el texto del botón no contrasta con el botón');
            if (contrast(t.sale, t.surface) < 3) warn.push('el precio en oferta se lee poco');
            if (contrast(t.onGold, t.gold) < 4.5) warn.push('el texto sobre dorado no contrasta con el dorado');
            warnEl.textContent = warn.length ? `Atención: ${warn.join('; ')}.` : '';
            warnEl.hidden = !warn.length;
          };
          const warnEl = h('p', { class: 'aviso aviso--alerta', hidden: true });
          const grid = h('div', { class: 'colores' });
          for (const [k, [lab, help]] of Object.entries(COLOR_LABELS)) {
            const id = `c-${key}-${k}`;
            const picker = h('input', { type: 'color', id, value: v[key][k] });
            const hex = h('input', { type: 'text', value: v[key][k], maxlength: 7, 'aria-label': `${lab} en hexadecimal`, class: 'hex', spellcheck: 'false' });
            picker.addEventListener('input', () => { v[key][k] = picker.value.toUpperCase(); hex.value = v[key][k]; mark(); paint(); });
            hex.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(hex.value)) { v[key][k] = hex.value.toUpperCase(); picker.value = hex.value; mark(); paint(); } });
            grid.append(h('div', { class: 'color' }, h('label', { for: id }, h('strong', { text: lab }), h('small', { text: help })), h('div', { class: 'color__ctrl' }, picker, hex)));
          }
          const reset = h('button', { type: 'button', class: 'btn btn--texto btn--sm', text: `Restablecer colores originales del modo ${label.toLowerCase()}`, onclick: () => {
            v[key] = structuredClone(defaults[key]);
            mark();
            const fresh = mode(key, label);
            wrap.replaceWith(fresh);
          } });
          const wrap = h('div', { class: 'modo' }, h('h3', { text: `Modo ${label.toLowerCase()}` }), h('div', { class: 'modo__grid' }, grid, h('div', {}, prev, warnEl)), reset);
          paint();
          return wrap;
        };
        n.append(mode('light', 'Claro'), mode('dark', 'Oscuro'));
      }),
    ],
  });
};

VIEWS.contenido = async () => {
  setTitle('Textos y páginas');
  await loadSettings();
  settingsForm({
    title: 'Textos y páginas',
    intro: 'Testimonios, preguntas frecuentes y las páginas de términos, privacidad y devoluciones.',
    sections: [
      section('testimonials', 'Testimonios', (n, v, mark) => {
        n.append(repeater({ items: v, addLabel: 'Agregar testimonio', empty: 'Sin testimonios: la sección no se mostrará.', onChange: mark, max: 24, fields: [
          { key: 'name', label: 'Nombre del cliente', attrs: { maxlength: 60 } },
          { key: 'city', label: 'Ciudad', attrs: { maxlength: 60 } },
          { key: 'text', label: 'Lo que dijo', type: 'textarea', attrs: { rows: 3, maxlength: 400 }, wide: true },
        ] }));
      }, { intro: 'Usa opiniones reales de tus clientes. Los que vienen de ejemplo dicen "Cliente de muestra": reemplázalos.' }),
      section('faq', 'Preguntas frecuentes', (n, v, mark) => {
        n.append(repeater({ items: v, addLabel: 'Agregar pregunta', empty: 'Sin preguntas: la sección no se mostrará.', onChange: mark, max: 40, fields: [
          { key: 'q', label: 'Pregunta', attrs: { maxlength: 200 }, wide: true },
          { key: 'a', label: 'Respuesta', type: 'textarea', attrs: { rows: 3, maxlength: 1200 }, wide: true },
        ] }));
      }),
      section('legal', 'Páginas legales', (n, v, mark) => {
        n.append(
          h('p', { class: 'campo__ayuda', text: 'Escribe "## " al inicio de una línea para un subtítulo y "- " para una lista. Revisa estos textos con tu asesor: los que vienen son de ejemplo.' }),
          field({ label: 'Términos y condiciones', type: 'textarea', value: v.terms, attrs: { rows: 10 }, onInput: (x) => { v.terms = x; mark(); } }),
          field({ label: 'Política de privacidad', type: 'textarea', value: v.privacy, attrs: { rows: 10 }, onInput: (x) => { v.privacy = x; mark(); } }),
          field({ label: 'Cambios y devoluciones', type: 'textarea', value: v.returns, attrs: { rows: 10 }, onInput: (x) => { v.returns = x; mark(); } }),
        );
      }),
    ],
  });
};

VIEWS.tienda = async () => {
  setTitle('Tienda y contacto');
  await loadSettings();
  settingsForm({
    title: 'Tienda y contacto',
    intro: 'WhatsApp, mensaje del pedido, medios de pago, redes sociales y datos para buscadores.',
    sections: [
      section('store', 'Pedidos por WhatsApp', (n, v, mark) => {
        n.append(
          field({ label: 'Número de WhatsApp', value: v.whatsapp, hint: 'Con indicativo del país y sin espacios. Ej.: 573026983562', attrs: { inputmode: 'tel', maxlength: 15 }, onInput: (x) => { v.whatsapp = x.replace(/\D/g, ''); mark(); } }),
          field({ label: 'Saludo del mensaje', value: v.orderGreeting, attrs: { maxlength: 300 }, onInput: (x) => { v.orderGreeting = x; mark(); } }),
          field({ label: 'Cierre del mensaje', value: v.orderClosing, attrs: { maxlength: 300 }, onInput: (x) => { v.orderClosing = x; mark(); } }),
          field({ label: 'Nota sobre el envío', value: v.shippingNote, hint: 'Se muestra en el carrito y en cada producto.', attrs: { maxlength: 200 }, onInput: (x) => { v.shippingNote = x; mark(); } }),
          toggle({ label: 'Pedir datos de envío en el carrito', checked: v.askCustomerData, hint: 'Nombre, ciudad, dirección y medio de pago. Siempre son opcionales para el cliente.', onChange: (x) => { v.askCustomerData = x; mark(); } }),
          field({ label: 'Productos por página', type: 'number', value: v.perPage, attrs: { min: 4, max: 48 }, onInput: (x) => { v.perPage = Number(x); mark(); } }),
          field({ label: 'Avisar "quedan pocas" desde', type: 'number', value: v.lowStockThreshold, hint: 'Cuando las unidades sean iguales o menos que este número.', attrs: { min: 0, max: 100 }, onInput: (x) => { v.lowStockThreshold = Number(x); mark(); } }),
        );
      }),
      section('payments', 'Medios de pago', (n, v, mark) => {
        const items = v.map((x) => ({ name: x }));
        const sync = () => { v.length = 0; v.push(...items.map((x) => String(x.name || '').trim()).filter(Boolean)); mark(); };
        n.append(repeater({ items, addLabel: 'Agregar medio de pago', empty: 'Sin medios de pago.', onChange: sync, max: 20, fields: [{ key: 'name', label: 'Medio de pago', attrs: { maxlength: 60 } }] }));
      }),
      section('social', 'Redes sociales', (n, v, mark) => {
        for (const [k, lab] of [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['youtube', 'YouTube']]) {
          n.append(field({ label: lab, type: 'url', value: v[k], attrs: { placeholder: 'https://…' }, hint: k === 'instagram' ? 'Pega el enlace completo. Si lo dejas vacío, no se muestra.' : null, onInput: (x) => { v[k] = x.trim(); mark(); } }));
        }
      }),
      section('contact', 'Contacto', (n, v, mark) => {
        n.append(
          field({ label: 'Correo (opcional)', type: 'email', value: v.email, onInput: (x) => { v.email = x; mark(); } }),
          field({ label: 'Ubicación', value: v.location, onInput: (x) => { v.location = x; mark(); } }),
          field({ label: 'Horario de atención', value: v.hours, onInput: (x) => { v.hours = x; mark(); } }),
        );
      }),
      section('seo', 'Buscadores (Google)', (n, v, mark) => {
        n.append(
          field({ label: 'Título de la tienda en Google', value: v.title, attrs: { maxlength: 120 }, onInput: (x) => { v.title = x; mark(); } }),
          field({ label: 'Descripción en Google', type: 'textarea', value: v.description, attrs: { rows: 3, maxlength: 300 }, onInput: (x) => { v.description = x; mark(); } }),
        );
      }),
      section('analytics', 'Estadísticas de visitas', (n, v, mark) => {
        n.append(field({ label: 'Token de Cloudflare Web Analytics', value: v.cloudflareToken, hint: 'En Cloudflare: Analytics y registros > Web Analytics > Agregar sitio. Copia el token del código que te da.', attrs: { maxlength: 64, spellcheck: 'false' }, onInput: (x) => { v.cloudflareToken = x.trim(); mark(); } }));
      }),
    ],
  });
};

route();
