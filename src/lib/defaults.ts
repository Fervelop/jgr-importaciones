// Valores iniciales de todo lo editable desde /admin.
// Si una sección no se ha guardado todavía en la base de datos, se usa lo de aquí.

export type ThemeTokens = {
  bg: string; // piso de la página
  surface: string; // vitrinas y paneles
  ink: string; // texto principal
  muted: string; // texto secundario
  line: string; // filos y divisores
  gold: string; // filos y detalles dorados
  goldText: string; // texto dorado legible
  sale: string; // precio en oferta
  button: string; // fondo del botón principal
  buttonText: string; // texto del botón principal
  onGold: string; // texto sobre botones y etiquetas doradas
};

export type TrustItem = { icon: string; title: string; text: string };
export type Step = { title: string; text: string };
export type Testimonial = { name: string; city: string; text: string };
export type Faq = { q: string; a: string };
export type Slide = { title: string; subtitle: string; buttonText: string; link: string; image: string; style: string };
export type Banner = { title: string; text: string; buttonText: string; link: string; image: string; icon: string; style: string };

export type Settings = {
  brand: { name: string; slogan: string; logo: string };
  theme: { light: ThemeTokens; dark: ThemeTokens };
  home: {
    slides: Slide[];
    trust: TrustItem[];
    showCategories: boolean;
    categoriesTitle: string;
    categoriesSubtitle: string;
    categoriesIncludeSubs: boolean;
    showOffers: boolean;
    offersTitle: string;
    offersSubtitle: string;
    offersEndsAt: string;
    showFeatured: boolean;
    featuredTitle: string;
    featuredSubtitle: string;
    banners: Banner[];
    showSeasonal: boolean;
    seasonalTitle: string;
    seasonalSubtitle: string;
    seasonalCategoryId: number | null;
    showDiscover: boolean;
    discoverTitle: string;
    discoverCount: number;
    showSteps: boolean;
    stepsTitle: string;
    steps: Step[];
    testimonialsTitle: string;
    showTestimonials: boolean;
    faqTitle: string;
    showFaq: boolean;
    closingTitle: string;
    closingText: string;
    closingImage: string;
  };
  store: {
    whatsapp: string;
    perPage: number;
    lowStockThreshold: number;
    shippingNote: string;
    orderGreeting: string;
    orderClosing: string;
    askCustomerData: boolean;
    codCities: string[];
    announcement: string;
  };
  payments: string[];
  social: { instagram: string; facebook: string; tiktok: string; youtube: string };
  contact: { email: string; location: string; hours: string };
  testimonials: Testimonial[];
  faq: Faq[];
  legal: { terms: string; privacy: string; returns: string };
  seo: { title: string; description: string };
  analytics: { cloudflareToken: string };
};

export const SETTINGS_SECTIONS = [
  'brand', 'theme', 'home', 'store', 'payments', 'social', 'contact',
  'testimonials', 'faq', 'legal', 'seo', 'analytics',
] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const DEFAULT_SETTINGS: Settings = {
  brand: {
    name: 'JGR Importaciones',
    slogan: 'Calidad & Confianza',
    logo: '/marca/logo.webp',
  },
  theme: {
    light: {
      bg: '#F5F2EB',
      surface: '#FFFFFF',
      ink: '#1A1712',
      muted: '#5F574A',
      line: '#DDD4C3',
      gold: '#C9A24A',
      goldText: '#7A5B17',
      sale: '#B3261E',
      button: '#1A1712',
      buttonText: '#F7F1E3',
      onGold: '#1A1712',
    },
    dark: {
      bg: '#0E0D0B',
      surface: '#1A1812',
      ink: '#EFE8DA',
      muted: '#A89E8A',
      line: '#2E2A21',
      gold: '#D4AF5A',
      goldText: '#E2C277',
      sale: '#F08A6C',
      button: '#D4AF5A',
      buttonText: '#14110B',
      onGold: '#14110B',
    },
  },
  home: {
    slides: [
      {
        title: 'Lo mejor en tecnología y hogar, a precio de importador',
        subtitle: 'Productos revisados uno a uno. Arma tu pedido y lo confirmamos contigo por WhatsApp antes de que pagues.',
        buttonText: 'Ver ofertas del día',
        link: '/#ofertas',
        image: '/marca/logo.webp',
        style: 'oscuro',
      },
      {
        title: 'Tu casa, más inteligente',
        subtitle: 'Asistentes de voz, interruptores y bombillos que controlas desde el celular.',
        buttonText: 'Ver hogar inteligente',
        link: '/categoria/hogar-inteligente',
        image: '/muestras/categoria-hogar-inteligente.svg',
        style: 'dorado',
      },
      {
        title: 'Viaja tranquilo en tu carro',
        subtitle: 'Cámaras, cargadores y accesorios para cada trayecto.',
        buttonText: 'Ver vehículos',
        link: '/categoria/vehiculos',
        image: '/muestras/categoria-vehiculos.svg',
        style: 'claro',
      },
    ],
    showCategories: true,
    categoriesTitle: 'Explora nuestras categorías',
    categoriesSubtitle: '',
    categoriesIncludeSubs: true,
    showOffers: true,
    offersTitle: 'Ofertas del día',
    offersSubtitle: 'Precios especiales por tiempo limitado.',
    offersEndsAt: '',
    showFeatured: true,
    featuredTitle: 'Destacados de la semana',
    featuredSubtitle: 'Lo que más recomendamos ahora.',
    banners: [
      { title: 'Envíos a toda Colombia', text: 'Te cotizamos el envío por WhatsApp antes de pagar.', buttonText: 'Cómo comprar', link: '/#como-comprar', image: '', icon: 'truck', style: 'oscuro' },
      { title: 'Paga como prefieras', text: 'Nequi, Daviplata, llave Bre-B, PSE, tarjeta y contraentrega en Ibagué y Bogotá.', buttonText: 'Ver preguntas frecuentes', link: '/preguntas-frecuentes', image: '', icon: 'tag', style: 'dorado' },
      { title: '¿Compras al por mayor?', text: 'Escríbenos y te cotizamos pedidos grandes.', buttonText: 'Escribir por WhatsApp', link: 'whatsapp', image: '', icon: 'box', style: 'claro' },
    ],
    showSeasonal: true,
    seasonalTitle: 'Regalos para esta Navidad',
    seasonalSubtitle: 'Tecnología que se regala sola.',
    seasonalCategoryId: 1,
    showDiscover: true,
    discoverTitle: 'Descubre nuestros productos',
    discoverCount: 8,
    trust: [
      { icon: 'shield', title: 'Compra segura', text: 'Pagas solo después de confirmar tu pedido con una persona.' },
      { icon: 'gem', title: 'Calidad revisada', text: 'Probamos cada producto antes de enviarlo.' },
      { icon: 'tag', title: 'Precios bajos', text: 'Importamos directo, sin intermediarios.' },
      { icon: 'chat', title: 'Atención por WhatsApp', text: 'Resolvemos tus dudas antes y después de comprar.' },
    ],
    showSteps: true,
    stepsTitle: 'Así compras en JGR',
    steps: [
      { title: 'Arma tu carrito', text: 'Agrega los productos que quieras, con su color o versión.' },
      { title: 'Envía tu pedido por WhatsApp', text: 'El mensaje sale listo con productos, cantidades y total.' },
      { title: 'Confirmamos envío y pago', text: 'Te cotizamos el envío a tu ciudad y eliges cómo pagar.' },
      { title: 'Recibe en tu puerta', text: 'Te compartimos la guía para que sigas tu paquete.' },
    ],
    testimonialsTitle: 'Lo que dicen nuestros clientes',
    showTestimonials: true,
    faqTitle: 'Preguntas frecuentes',
    showFaq: true,
    closingTitle: '¿Buscas algo que no ves en la tienda?',
    closingText: 'Escríbenos. Si lo podemos importar, te lo cotizamos.',
    closingImage: '',
  },
  store: {
    whatsapp: '573026983562',
    perPage: 12,
    lowStockThreshold: 5,
    shippingNote: 'El valor del envío se confirma por WhatsApp.',
    orderGreeting: '¡Hola JGR Importaciones! Quiero hacer este pedido:',
    orderClosing: '¿Me confirman el valor del envío, por favor? Gracias.',
    askCustomerData: true,
    codCities: ['Ibagué', 'Bogotá'],
    announcement: 'Envíos a toda Colombia. El valor del envío se confirma por WhatsApp.',
  },
  payments: [
    'Nequi',
    'Daviplata',
    'Llave Bre-B',
    'PSE',
    'Tarjeta de crédito o débito',
    'Efectivo contraentrega (solo Ibagué y Bogotá)',
  ],
  social: { instagram: '', facebook: '', tiktok: '', youtube: '' },
  contact: {
    email: '',
    location: 'Colombia',
    hours: 'Lunes a sábado, 8:00 a. m. a 7:00 p. m.',
  },
  testimonials: [
    { name: 'Cliente de muestra', city: 'Bogotá', text: 'Testimonio de ejemplo. Reemplázalo desde el panel con la opinión real de un cliente.' },
    { name: 'Cliente de muestra', city: 'Medellín', text: 'Testimonio de ejemplo. Aquí va lo que un cliente dijo sobre su compra y la atención.' },
    { name: 'Cliente de muestra', city: 'Cali', text: 'Testimonio de ejemplo. Puedes agregar, editar u ocultar los testimonios cuando quieras.' },
  ],
  faq: [
    { q: '¿Cómo hago un pedido?', a: 'Agrega los productos al carrito y presiona "Enviar pedido por WhatsApp". El mensaje sale listo con todo tu pedido y te respondemos para confirmar.' },
    { q: '¿Cuánto cuesta el envío?', a: 'Depende de tu ciudad y del tamaño del paquete. Te lo confirmamos por WhatsApp antes de que pagues.' },
    { q: '¿Qué medios de pago aceptan?', a: 'Nequi, Daviplata, llave Bre-B, PSE y tarjetas de crédito o débito. En Ibagué y Bogotá también puedes pagar en efectivo contraentrega.' },
    { q: '¿Los productos tienen garantía?', a: 'Sí. Todos nuestros productos tienen garantía contra defectos de fábrica. Revisa la página de cambios y devoluciones para ver los plazos.' },
    { q: '¿Cuánto tarda en llegar mi pedido?', a: 'Normalmente entre 1 y 5 días hábiles según tu ciudad. Te compartimos la guía de envío para que hagas seguimiento.' },
  ],
  legal: {
    terms:
      '## Uso de la tienda\nEste sitio es un catálogo. Los pedidos se confirman por WhatsApp y solo se consideran aceptados cuando JGR Importaciones confirma disponibilidad, valor del envío y medio de pago.\n\n## Precios\nLos precios están en pesos colombianos (COP) e incluyen los impuestos aplicables. El valor del envío no está incluido y se informa antes del pago.\n\n## Disponibilidad\nLas unidades disponibles se actualizan con frecuencia, pero pueden cambiar. Si un producto se agota después de tu pedido, te ofreceremos una alternativa o la devolución de tu dinero.\n\nTexto de ejemplo: revísalo con tu asesor antes de publicarlo.',
    privacy:
      '## Datos que recogemos\nSolo los datos que nos compartes para tu pedido: nombre, ciudad, dirección y número de WhatsApp.\n\n## Para qué los usamos\nPara confirmar, enviar y dar soporte a tu pedido. No vendemos ni compartimos tus datos con terceros, salvo la transportadora que entrega tu paquete.\n\n## Tus derechos\nDe acuerdo con la Ley 1581 de 2012, puedes conocer, actualizar o pedir que eliminemos tus datos escribiéndonos por WhatsApp.\n\nTexto de ejemplo: revísalo con tu asesor antes de publicarlo.',
    returns:
      '## Derecho de retracto\nTienes 5 días hábiles desde que recibes el producto para retractarte de la compra, siempre que el producto esté sin uso y en su empaque original (Ley 1480 de 2011, artículo 47).\n\n## Garantía\nSi el producto presenta un defecto de fábrica, escríbenos por WhatsApp con fotos o video. Lo revisamos y lo reparamos, cambiamos o devolvemos tu dinero.\n\n## Cómo solicitarlo\nEscríbenos por WhatsApp con tu número de pedido y el motivo.\n\nTexto de ejemplo: revísalo con tu asesor antes de publicarlo.',
  },
  seo: {
    title: 'JGR Importaciones | Calidad & Confianza',
    description:
      'Tecnología, hogar inteligente, cocina y accesorios para vehículos con calidad revisada y precios de importador. Pide por WhatsApp.',
  },
  analytics: { cloudflareToken: '' },
};

export const TRUST_ICONS = ['shield', 'gem', 'tag', 'chat', 'truck', 'box', 'star', 'clock'] as const;
