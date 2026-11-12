// Genera db/seed.sql (categorías y productos de muestra) y las imágenes de muestra en public/muestras/.
// Uso: node scripts/build-seed.mjs
// Todo lo que crea este script es de EJEMPLO: reemplázalo desde /admin.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'muestras');
mkdirSync(outDir, { recursive: true });

/* ---------- Dibujos en línea (viewBox 300x300) ---------- */
const ICONS = {
  camSeguridad: `<circle cx="150" cy="135" r="48"/><circle cx="150" cy="135" r="18"/><circle cx="150" cy="135" r="6" class="f"/><path d="M110 192h80v22a8 8 0 0 1-8 8h-64a8 8 0 0 1-8-8z"/><path d="M102 135a48 48 0 0 1 96 0"/>`,
  camAccion: `<rect x="82" y="100" width="136" height="100" rx="18"/><circle cx="150" cy="150" r="32"/><circle cx="150" cy="150" r="14" class="f"/><path d="M178 100v-10h24v10"/><circle cx="104" cy="120" r="4" class="f"/>`,
  parlante: `<rect x="100" y="66" width="100" height="168" rx="26"/><circle cx="150" cy="108" r="17"/><circle cx="150" cy="176" r="36"/><circle cx="150" cy="176" r="13" class="f"/>`,
  barraSonido: `<rect x="44" y="124" width="212" height="52" rx="26"/>${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${82 + i * 27}" cy="150" r="6" class="f"/>`).join('')}<path d="M118 186h64"/>`,
  audifonos: `<path d="M78 178v-28a72 72 0 0 1 144 0v28"/><rect x="64" y="162" width="34" height="62" rx="14"/><rect x="202" y="162" width="34" height="62" rx="14"/><path d="M110 112a50 50 0 0 1 80 0" class="t"/>`,
  audifonosTWS: `<rect x="92" y="148" width="116" height="74" rx="32"/><path d="M92 176h116"/><circle cx="150" cy="198" r="4" class="f"/><path d="M124 88a16 16 0 1 1 0 32v22"/><path d="M176 88a16 16 0 1 0 0 32v22"/>`,
  asistente: `<ellipse cx="150" cy="96" rx="56" ry="15"/><path d="M94 96v108a56 15 0 0 0 112 0V96"/><ellipse cx="150" cy="96" rx="36" ry="8" class="f t"/><path d="M110 140h80M110 158h80M110 176h80" class="t"/>`,
  pantalla: `<rect x="66" y="80" width="168" height="112" rx="14"/><path d="M122 192l-16 36h88l-16-36"/><circle cx="150" cy="136" r="26"/><path d="M150 122v14l10 8"/>`,
  interruptor: `<rect x="94" y="72" width="112" height="156" rx="16"/><rect x="118" y="104" width="64" height="92" rx="10"/><path d="M118 150h64"/><circle cx="150" cy="90" r="4" class="f"/>`,
  enchufe: `<rect x="98" y="86" width="104" height="128" rx="28"/><circle cx="130" cy="138" r="8" class="f"/><circle cx="170" cy="138" r="8" class="f"/><circle cx="150" cy="182" r="9"/><path d="M150 214v20"/>`,
  bombillo: `<circle cx="150" cy="122" r="50"/><path d="M128 166v24h44v-24"/><path d="M132 202h36M138 214h24"/><path d="M134 128l16-16 16 16" class="t"/>`,
  timbre: `<rect x="114" y="66" width="72" height="168" rx="36"/><circle cx="150" cy="112" r="18"/><circle cx="150" cy="112" r="6" class="f"/><circle cx="150" cy="182" r="20"/>`,
  tiraLed: `<path d="M50 176c40-56 80 56 120 0s70-50 84-24"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<circle cx="${62 + i * 30}" cy="${[160, 132, 152, 182, 160, 140, 152][i]}" r="5" class="f"/>`).join('')}`,
  hervidor: `<path d="M96 218l14-104h80l14 104z"/><path d="M118 100h64"/><circle cx="150" cy="90" r="7"/><path d="M190 126c46 0 46 66 8 70"/><path d="M110 136l-30-16"/>`,
  licuadora: `<path d="M108 66h84l-10 104h-64z"/><rect x="104" y="170" width="92" height="52" rx="10"/><circle cx="150" cy="196" r="10" class="f"/><path d="M134 146h32" class="t"/><path d="M102 66h96"/>`,
  freidora: `<rect x="84" y="78" width="132" height="148" rx="32"/><rect x="108" y="138" width="84" height="58" rx="12"/><path d="M132 196v-8h36v8"/><circle cx="150" cy="108" r="12"/><circle cx="150" cy="108" r="4" class="f"/>`,
  cuchillos: `<path d="M94 226l26-116h82l14 116z"/><path d="M134 110l-6-40M156 110V66M178 110l6-36"/><path d="M110 190h96" class="t"/>`,
  sarten: `<circle cx="130" cy="150" r="62"/><circle cx="130" cy="150" r="48" class="t"/><rect x="190" y="142" width="84" height="16" rx="8"/>`,
  bascula: `<rect x="70" y="148" width="160" height="72" rx="14"/><rect x="82" y="128" width="136" height="14" rx="7"/><rect x="118" y="170" width="64" height="26" rx="5"/><path d="M130 184h12M150 184h20" class="t"/>`,
  recipientes: `<rect x="66" y="142" width="94" height="80" rx="12"/><rect x="60" y="128" width="106" height="16" rx="7"/><rect x="164" y="112" width="72" height="110" rx="12"/><rect x="158" y="98" width="84" height="16" rx="7"/>`,
  cafetera: `<path d="M98 204V80h104v124"/><rect x="88" y="204" width="124" height="20" rx="6"/><path d="M120 204v-52h58v52"/><path d="M98 112h104"/><path d="M178 166h12a10 10 0 0 1 0 20h-12" class="t"/>`,
  cargadorAuto: `<path d="M128 66h44v84l-10 40h-24l-10-40z"/><rect x="140" y="190" width="20" height="32" rx="4"/><rect x="138" y="92" width="24" height="9" rx="3" class="f"/><rect x="138" y="114" width="24" height="9" rx="3" class="f"/>`,
  dashcam: `<rect x="82" y="110" width="136" height="84" rx="20"/><circle cx="150" cy="152" r="26"/><circle cx="150" cy="152" r="10" class="f"/><path d="M150 110V82"/><rect x="118" y="68" width="64" height="14" rx="7"/>`,
  aspiradora: `<rect x="66" y="124" width="126" height="58" rx="24"/><path d="M192 138l56-8v44l-56-8"/><path d="M92 124c0-32 74-32 74 0"/><circle cx="104" cy="153" r="6" class="f"/>`,
  soporte: `<rect x="110" y="66" width="80" height="140" rx="14"/><rect x="94" y="104" width="16" height="52" rx="5"/><rect x="190" y="104" width="16" height="52" rx="5"/><path d="M150 206v24"/><ellipse cx="150" cy="236" rx="36" ry="8"/>`,
  compresor: `<rect x="92" y="78" width="112" height="132" rx="22"/><circle cx="148" cy="124" r="26"/><path d="M148 124l16-14"/><path d="M204 180c42 0 42 52 0 52H118"/><rect x="120" y="168" width="56" height="16" rx="5" class="t"/>`,
  organizador: `<path d="M78 110h144v108H78z"/><path d="M126 110v108M174 110v108"/><path d="M118 110V88h64v22"/>`,
  reloj: `<rect x="104" y="94" width="92" height="112" rx="24"/><rect x="120" y="58" width="60" height="36" rx="8"/><rect x="120" y="206" width="60" height="36" rx="8"/><path d="M150 128v22l14 10"/><path d="M196 136h8" />`,
  bateria: `<rect x="100" y="66" width="100" height="168" rx="22"/><path d="M156 116l-18 34h24l-18 36"/><circle cx="126" cy="88" r="4" class="f"/><circle cx="142" cy="88" r="4" class="f"/><circle cx="158" cy="88" r="4" class="t"/>`,
};

const STYLE = `<style>.l{fill:none;stroke:#9A7A33;stroke-width:6;stroke-linecap:round;stroke-linejoin:round}.l .f{fill:#9A7A33;stroke:none}.l .t{stroke:#C9A24A;opacity:.75}.l .f.t{fill:#C9A24A;stroke:none;opacity:.5}.n{font:500 13px system-ui,sans-serif;fill:#8A7A5C;letter-spacing:.5px}</style>`;

function productSvg(icon, view) {
  const transforms = [
    'translate(0 0)',
    'translate(150 150) rotate(-8) scale(1.08) translate(-150 -150)',
    'translate(150 150) scale(1.75) translate(-150 -138)',
  ];
  const shadow = view === 2 ? '' : '<ellipse cx="150" cy="252" rx="78" ry="9" fill="#000" opacity=".06"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="900" height="900">${STYLE}${shadow}<g class="l" transform="${transforms[view]}">${ICONS[icon]}</g><text class="n" x="150" y="288" text-anchor="middle">Imagen de muestra</text></svg>`;
}

function categorySvg(icons) {
  const pos = [
    { x: -120, y: 10, s: 0.8 },
    { x: 0, y: -10, s: 1 },
    { x: 120, y: 10, s: 0.8 },
  ];
  const groups = icons
    .slice(0, 3)
    .map((ic, i) => {
      const p = pos[i];
      return `<g class="l" transform="translate(${150 + p.x} ${150 + p.y}) scale(${p.s}) translate(-150 -150)">${ICONS[ic]}</g>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 0 420 300" width="1260" height="900">${STYLE}${groups}<text class="n" x="150" y="290" text-anchor="middle">Imagen de muestra</text></svg>`;
}

/* ---------- Catálogo de muestra ---------- */
const CATEGORIES = [
  { slug: 'tecnologia', name: 'Tecnología', description: 'Cámaras, sonido, audífonos y accesorios para tu día a día.', icons: ['camAccion', 'audifonos', 'parlante'],
    children: [
      { slug: 'camaras', name: 'Cámaras', icon: 'camAccion' },
      { slug: 'sonido', name: 'Sonido', icon: 'parlante' },
      { slug: 'audifonos', name: 'Audífonos', icon: 'audifonos' },
      { slug: 'accesorios-tecnologia', name: 'Accesorios', icon: 'bateria' },
    ] },
  { slug: 'hogar-inteligente', name: 'Hogar inteligente', description: 'Asistentes de voz, interruptores, iluminación y seguridad que controlas desde el celular.', icons: ['interruptor', 'asistente', 'bombillo'],
    children: [
      { slug: 'asistentes-de-voz', name: 'Asistentes de voz', icon: 'asistente' },
      { slug: 'interruptores-y-enchufes', name: 'Interruptores y enchufes', icon: 'interruptor' },
      { slug: 'iluminacion', name: 'Iluminación', icon: 'bombillo' },
      { slug: 'seguridad', name: 'Seguridad', icon: 'camSeguridad' },
    ] },
  { slug: 'cocina', name: 'Cocina', description: 'Electrodomésticos y utensilios que hacen más fácil cocinar en casa.', icons: ['hervidor', 'freidora', 'sarten'],
    children: [
      { slug: 'electrodomesticos', name: 'Electrodomésticos', icon: 'freidora' },
      { slug: 'utensilios', name: 'Utensilios', icon: 'sarten' },
      { slug: 'almacenamiento', name: 'Almacenamiento', icon: 'recipientes' },
    ] },
  { slug: 'vehiculos', name: 'Vehículos', description: 'Electrónica, limpieza y accesorios para tu carro o moto.', icons: ['dashcam', 'cargadorAuto', 'soporte'],
    children: [
      { slug: 'electronica-vehiculos', name: 'Electrónica', icon: 'dashcam' },
      { slug: 'limpieza-y-cuidado', name: 'Limpieza y cuidado', icon: 'aspiradora' },
      { slug: 'accesorios-vehiculos', name: 'Accesorios', icon: 'soporte' },
    ] },
];

const COLOR = (values) => [{ name: 'Color', values: values.map((v) => (typeof v === 'string' ? { label: v, delta: 0, soldOut: false } : v)) }];

// [slug de subcategoría, nombre, icono, precio, precio anterior, unidades, extra]
const PRODUCTS = [
  ['camaras', 'Cámara de seguridad Wi-Fi 360° 2K', 'camSeguridad', 129900, 179900, 14, { featured: 1, short: 'Gira 360°, visión nocturna y alertas de movimiento al celular.', specs: [['Resolución', '2K (2304 × 1296)'], ['Conexión', 'Wi-Fi 2,4 GHz'], ['Almacenamiento', 'MicroSD hasta 128 GB'], ['Audio', 'Bidireccional']] }],
  ['camaras', 'Cámara deportiva 4K con estuche sumergible', 'camAccion', 189900, 239900, 6, { short: 'Graba en 4K, resiste el agua hasta 30 m con su estuche.', specs: [['Video', '4K a 30 fps'], ['Pantalla', '2"'], ['Batería', '1350 mAh']] }],
  ['camaras', 'Cámara para exterior con reflector', 'camSeguridad', 219900, null, 3, { short: 'Reflector LED, sirena y detección de personas.' }],
  ['sonido', 'Parlante Bluetooth resistente al agua', 'parlante', 149900, 199900, 22, { featured: 1, short: 'Sonido potente, 20 horas de batería y certificación IPX7.', options: COLOR(['Negro', 'Azul noche', 'Arena']), specs: [['Potencia', '20 W'], ['Batería', 'Hasta 20 h'], ['Resistencia', 'IPX7']] }],
  ['sonido', 'Barra de sonido 2.1 con subwoofer', 'barraSonido', 459900, 549900, 4, { short: 'Diálogos claros y bajos profundos para tu TV.', specs: [['Potencia', '160 W'], ['Conexiones', 'HDMI ARC, óptica, Bluetooth']] }],
  ['sonido', 'Parlante portátil con luces', 'parlante', 89900, null, null, { short: 'Luces al ritmo de la música y entrada para micrófono.' }],
  ['audifonos', 'Audífonos inalámbricos con cancelación de ruido', 'audifonos', 239900, 319900, 9, { featured: 1, short: 'Cancelación activa de ruido y 40 horas de batería.', options: COLOR(['Negro', 'Blanco hueso', { label: 'Champaña', delta: 10000, soldOut: false }]), specs: [['Batería', 'Hasta 40 h'], ['Carga rápida', '10 min = 5 h'], ['Conexión', 'Bluetooth 5.3']] }],
  ['audifonos', 'Audífonos TWS de estuche compacto', 'audifonosTWS', 79900, 109900, 31, { short: 'Ligeros, con estuche de carga y control táctil.', options: COLOR(['Negro', 'Blanco']) }],
  ['audifonos', 'Audífonos deportivos de gancho', 'audifonosTWS', 99900, null, 0, { short: 'Ganchos que no se caen al entrenar. Resisten el sudor.' }],
  ['accesorios-tecnologia', 'Batería portátil 20.000 mAh carga rápida', 'bateria', 99900, 129900, 18, { short: 'Carga tu celular hasta 4 veces. USB-C de 22,5 W.', specs: [['Capacidad', '20.000 mAh'], ['Puertos', 'USB-C y 2 USB-A']] }],
  ['accesorios-tecnologia', 'Reloj inteligente con llamadas', 'reloj', 169900, 219900, 2, { short: 'Contesta llamadas, mide pasos, ritmo cardíaco y sueño.', options: COLOR(['Negro', 'Plateado', 'Dorado']) }],
  ['accesorios-tecnologia', 'Cargador de pared USB-C 30 W', 'enchufe', 59900, null, null, { short: 'Carga rápida para celular, tablet y audífonos.' }],
  ['accesorios-tecnologia', 'Reloj inteligente deportivo', 'reloj', 129900, null, 12, { short: 'GPS integrado y más de 100 modos deportivos.' }],
  ['camaras', 'Mini cámara Wi-Fi para interior', 'camAccion', 74900, 99900, 25, { short: 'Pequeña, discreta y con visión nocturna.' }],

  ['asistentes-de-voz', 'Asistente de voz inteligente', 'asistente', 189900, 229900, 11, { featured: 1, short: 'Pon música, controla tus luces y pregunta lo que quieras con la voz.', options: COLOR(['Carbón', 'Gris claro']), specs: [['Conexión', 'Wi-Fi y Bluetooth'], ['Idioma', 'Español']] }],
  ['asistentes-de-voz', 'Pantalla inteligente de 8"', 'pantalla', 389900, 459900, 5, { short: 'Videollamadas, recetas y tus cámaras en una sola pantalla.' }],
  ['interruptores-y-enchufes', 'Interruptor inteligente Wi-Fi sencillo', 'interruptor', 54900, 69900, 40, { short: 'Prende y apaga tus luces desde el celular o con la voz.', options: [{ name: 'Botones', values: [{ label: '1 botón', delta: 0, soldOut: false }, { label: '2 botones', delta: 10000, soldOut: false }, { label: '3 botones', delta: 18000, soldOut: false }] }] }],
  ['interruptores-y-enchufes', 'Enchufe inteligente con medidor de consumo', 'enchufe', 44900, null, 26, { short: 'Programa horarios y mira cuánta energía gasta cada aparato.' }],
  ['iluminacion', 'Bombillo LED inteligente RGB', 'bombillo', 34900, 44900, 60, { short: '16 millones de colores y blancos cálidos o fríos.' }],
  ['iluminacion', 'Tira LED inteligente 5 metros', 'tiraLed', 79900, 99900, 15, { featured: 1, short: 'Ilumina tu sala o cuarto y sincronízala con la música.', options: [{ name: 'Largo', values: [{ label: '5 m', delta: 0, soldOut: false }, { label: '10 m', delta: 45000, soldOut: false }] }] }],
  ['seguridad', 'Timbre con cámara y video en vivo', 'timbre', 199900, 249900, 0, { short: 'Mira y habla con quien toca, estés donde estés.', soldOut: 1 }],
  ['seguridad', 'Kit de cámara y sensores para el hogar', 'camSeguridad', 349900, null, 4, { short: 'Cámara, sensor de puerta y sensor de movimiento.' }],

  ['electrodomesticos', 'Freidora de aire digital 5,5 L', 'freidora', 299900, 389900, 8, { featured: 1, short: 'Cocina crujiente con hasta 80 % menos aceite.', options: COLOR(['Negro', 'Blanco']), specs: [['Capacidad', '5,5 litros'], ['Potencia', '1700 W'], ['Programas', '8 automáticos']] }],
  ['electrodomesticos', 'Hervidor eléctrico de acero 1,7 L', 'hervidor', 89900, 109900, 20, { short: 'Hierve agua en minutos y se apaga solo.' }],
  ['electrodomesticos', 'Licuadora de alta potencia', 'licuadora', 249900, null, 6, { short: 'Tritura hielo y frutas congeladas en segundos.' }],
  ['electrodomesticos', 'Cafetera de goteo programable', 'cafetera', 159900, 189900, 3, { short: 'Programa tu café para cuando te levantes.' }],
  ['utensilios', 'Set de cuchillos con bloque de madera', 'cuchillos', 139900, 179900, 10, { short: 'Seis cuchillos de acero inoxidable con su bloque.' }],
  ['utensilios', 'Sartén antiadherente de 28 cm', 'sarten', 79900, null, 24, { short: 'Recubrimiento antiadherente libre de PFOA.', options: [{ name: 'Tamaño', values: [{ label: '24 cm', delta: -10000, soldOut: false }, { label: '28 cm', delta: 0, soldOut: false }, { label: '32 cm', delta: 20000, soldOut: true }] }] }],
  ['utensilios', 'Báscula digital de cocina', 'bascula', 49900, 64900, 33, { short: 'Pesa hasta 10 kg con precisión de 1 g.' }],
  ['almacenamiento', 'Set de 5 recipientes herméticos de vidrio', 'recipientes', 89900, 119900, 12, { short: 'Aptos para horno, microondas y lavaplatos.' }],
  ['almacenamiento', 'Organizador de recipientes con tapas', 'recipientes', 59900, null, null, { short: 'Mantén tu alacena en orden.' }],

  ['electronica-vehiculos', 'Cámara para carro Full HD con visión nocturna', 'dashcam', 179900, 229900, 7, { featured: 1, short: 'Graba tu camino en Full HD y detecta impactos al estar parqueado.', specs: [['Video', '1080p'], ['Ángulo', '170°'], ['Almacenamiento', 'MicroSD hasta 128 GB']] }],
  ['electronica-vehiculos', 'Cargador para carro doble USB-C 48 W', 'cargadorAuto', 49900, 69900, 40, { short: 'Carga dos celulares a la vez y rápido.' }],
  ['electronica-vehiculos', 'Compresor de aire portátil digital', 'compresor', 169900, null, 5, { short: 'Infla llantas de carro, moto y bicicleta. Se detiene solo.' }],
  ['limpieza-y-cuidado', 'Aspiradora inalámbrica para carro', 'aspiradora', 119900, 149900, 13, { short: 'Potente, liviana y con boquillas para rincones.' }],
  ['accesorios-vehiculos', 'Soporte magnético de celular para carro', 'soporte', 39900, 54900, 50, { short: 'Fija tu celular con una sola mano y sin vibraciones.' }],
  ['accesorios-vehiculos', 'Organizador para baúl plegable', 'organizador', 69900, null, 9, { short: 'Tres compartimentos y se dobla cuando no lo usas.', options: COLOR(['Negro', 'Gris']) }],
];

/* ---------- Salida ---------- */
const sql = [];
const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

sql.push('-- Datos de MUESTRA para JGR Importaciones. Reemplázalos desde /admin.');
sql.push('DELETE FROM products; DELETE FROM categories;');
sql.push("DELETE FROM sqlite_sequence WHERE name IN ('products','categories');");

let catId = 0;
const subIds = {};
CATEGORIES.forEach((c, ci) => {
  catId++;
  const parentId = catId;
  writeFileSync(join(outDir, `categoria-${c.slug}.svg`), categorySvg(c.icons));
  sql.push(
    `INSERT INTO categories (id, parent_id, slug, name, description, image, sort_order, visible) VALUES (${parentId}, NULL, ${q(c.slug)}, ${q(c.name)}, ${q(c.description)}, ${q(`/muestras/categoria-${c.slug}.svg`)}, ${ci}, 1);`,
  );
  c.children.forEach((s, si) => {
    catId++;
    subIds[s.slug] = catId;
    sql.push(
      `INSERT INTO categories (id, parent_id, slug, name, description, image, sort_order, visible) VALUES (${catId}, ${parentId}, ${q(s.slug)}, ${q(s.name)}, '', ${q(`/muestras/${s.icon}-1.svg`)}, ${si}, 1);`,
    );
  });
});

const slugify = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const usedIcons = new Set();
PRODUCTS.forEach(([sub, name, icon, price, compare, stock, extra], i) => {
  usedIcons.add(icon);
  const slug = slugify(name);
  const images = [0, 1, 2].map((v) => ({ url: `/muestras/${icon}-${v + 1}.svg`, alt: `${name}, imagen de muestra ${v + 1}` }));
  const specs = (extra.specs || []).map(([label, value]) => ({ label, value }));
  const description =
    `${extra.short}\n\nDescripción de muestra: aquí va la información completa del producto, qué incluye la caja, cómo se usa y su garantía. Edítala desde el panel de administración.`;
  sql.push(
    `INSERT INTO products (category_id, slug, name, brand, sku, short_description, description, price, compare_at_price, stock, sold_out, featured, visible, sort_order, images, options, specs) VALUES (${subIds[sub]}, ${q(slug)}, ${q(name)}, 'JGR', ${q('JGR-' + String(i + 1).padStart(4, '0'))}, ${q(extra.short)}, ${q(description)}, ${price}, ${q(compare)}, ${q(stock)}, ${extra.soldOut ? 1 : 0}, ${extra.featured ? 1 : 0}, 1, ${i}, ${q(JSON.stringify(images))}, ${q(JSON.stringify(extra.options || []))}, ${q(JSON.stringify(specs))});`,
  );
});

for (const icon of Object.keys(ICONS)) {
  for (const v of [0, 1, 2]) writeFileSync(join(outDir, `${icon}-${v + 1}.svg`), productSvg(icon, v));
}

writeFileSync(join(root, 'db', 'seed.sql'), sql.join('\n') + '\n');
console.log(`Listo: ${CATEGORIES.length} categorías, ${Object.keys(subIds).length} subcategorías, ${PRODUCTS.length} productos, ${Object.keys(ICONS).length * 3} imágenes de muestra.`);
