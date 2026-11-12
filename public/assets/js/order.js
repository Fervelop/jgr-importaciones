// Lógica pura del carrito y del mensaje de WhatsApp.
// La usan el navegador (site.js) y las pruebas automáticas, por eso no toca el DOM.

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** Formatea un entero en pesos colombianos: 159900 -> "$159.900" */
export function formatCOP(value) {
  const n = Math.round(Number(value) || 0);
  // Intl usa un espacio duro entre el símbolo y la cifra; lo normalizamos.
  return COP.format(n).replace(/[\s\u00a0\u202f]+/g, '');
}

/** Clave única de una línea del carrito: mismo producto con distinta variante = línea distinta. */
export function lineKey(productId, variant) {
  const parts = Object.keys(variant || {})
    .sort()
    .map((k) => `${k}=${variant[k]}`);
  return `${productId}|${parts.join('&')}`;
}

/** Precio unitario de un producto con la variante elegida (cada opción puede sumar o restar). */
export function unitPrice(product, variant) {
  let price = Number(product.price) || 0;
  for (const group of product.options || []) {
    const chosen = variant ? variant[group.name] : undefined;
    const value = (group.values || []).find((v) => v.label === chosen);
    if (value && Number.isFinite(Number(value.delta))) price += Number(value.delta);
  }
  return Math.max(0, price);
}

/** Máximo que se puede pedir de un producto (null = sin límite). */
export function maxQty(product) {
  if (product.soldOut) return 0;
  if (product.stock === null || product.stock === undefined) return 99;
  return Math.max(0, Math.min(99, Number(product.stock)));
}

export function clampQty(qty, max) {
  const n = Math.floor(Number(qty) || 0);
  return Math.max(0, Math.min(n, max ?? 99));
}

/** Totales del carrito. */
export function cartTotals(items) {
  let count = 0;
  let total = 0;
  for (const it of items) {
    const q = Math.max(0, Math.floor(Number(it.qty) || 0));
    count += q;
    total += q * (Math.round(Number(it.unitPrice)) || 0);
  }
  return { count, total };
}

function variantText(variant) {
  const entries = Object.entries(variant || {});
  if (!entries.length) return '';
  return ' (' + entries.map(([k, v]) => `${k}: ${v}`).join(', ') + ')';
}

/**
 * Arma el texto del pedido para WhatsApp.
 * @param {Array} items  [{name, variant, qty, unitPrice, sku}]
 * @param {Object} customer  {name, city, address, payment, note}
 * @param {Object} opts  {greeting, closing, shippingNote, code}
 */
export function buildOrderMessage(items, customer = {}, opts = {}) {
  const lines = [];
  lines.push(opts.greeting || 'Hola, quiero hacer este pedido:');
  if (opts.code) lines.push(`Pedido ${opts.code}`);
  lines.push('');
  items.forEach((it, i) => {
    const q = Math.max(1, Math.floor(Number(it.qty) || 1));
    const unit = Math.round(Number(it.unitPrice)) || 0;
    lines.push(`${i + 1}. ${it.name}${variantText(it.variant)}`);
    lines.push(`   ${q} x ${formatCOP(unit)} = ${formatCOP(q * unit)}`);
  });
  const { count, total } = cartTotals(items);
  lines.push('');
  lines.push(`Productos: ${count} ${count === 1 ? 'unidad' : 'unidades'}`);
  lines.push(`*Total productos: ${formatCOP(total)}*`);
  lines.push(`Envío: ${opts.shippingNote || 'por confirmar'}`);

  const data = [];
  if (customer.name) data.push(`Nombre: ${customer.name}`);
  if (customer.city) data.push(`Ciudad: ${customer.city}`);
  if (customer.address) data.push(`Dirección: ${customer.address}`);
  if (customer.payment) data.push(`Pago preferido: ${customer.payment}`);
  if (customer.note) data.push(`Nota: ${customer.note}`);
  if (data.length) {
    lines.push('');
    lines.push(...data);
  }
  if (opts.closing) {
    lines.push('');
    lines.push(opts.closing);
  }
  return lines.join('\n');
}

/** Enlace wa.me con el mensaje. El número va solo con dígitos, con indicativo de país. */
export function whatsappUrl(number, message) {
  const digits = String(number || '').replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Porcentaje de descuento redondeado (0 si no hay precio anterior válido). */
export function discountPercent(price, compareAt) {
  const p = Number(price);
  const c = Number(compareAt);
  if (!c || !p || c <= p) return 0;
  return Math.round(((c - p) / c) * 100);
}

const norm = (t) =>
  String(t || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** ¿El medio de pago elegido es contraentrega? */
export function isCashOnDelivery(payment) {
  return norm(payment).includes('contraentrega');
}

/** ¿La ciudad escrita es una de las que tienen contraentrega? */
export function cityAllowsCod(city, codCities = []) {
  const c = norm(city);
  if (!codCities.length) return true;
  return codCities.some((allowed) => {
    const a = norm(allowed);
    return a && (c === a || c.startsWith(a + ' ') || c.includes(a));
  });
}

/**
 * Revisa los datos de envío del carrito. Devuelve un objeto { campo: mensaje } vacío si todo está bien.
 * La nota es el único campo opcional.
 */
export function validateCustomer(customer = {}, opts = {}) {
  const errors = {};
  const name = String(customer.name || '').trim();
  const city = String(customer.city || '').trim();
  const address = String(customer.address || '').trim();
  const payment = String(customer.payment || '').trim();
  if (name.length < 3) errors.name = 'Escribe tu nombre completo.';
  if (city.length < 3) errors.city = 'Escribe la ciudad de entrega.';
  if (address.length < 6) errors.address = 'Escribe la dirección completa (calle, número y barrio).';
  const payments = opts.payments || [];
  if (!payment) errors.payment = 'Elige cómo quieres pagar.';
  else if (payments.length && !payments.includes(payment)) errors.payment = 'Elige un medio de pago de la lista.';
  else if (isCashOnDelivery(payment) && city && !errors.city && !cityAllowsCod(city, opts.codCities || [])) {
    errors.payment = `La contraentrega solo está disponible en ${listCities(opts.codCities || [])}. Elige otro medio de pago.`;
  }
  return errors;
}

function listCities(cities) {
  if (cities.length <= 1) return cities.join('');
  return cities.slice(0, -1).join(', ') + ' y ' + cities[cities.length - 1];
}
