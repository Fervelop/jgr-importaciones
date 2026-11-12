# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Cloudflare Workers (Hono, server-rendered HTML) + D1 (datos) + R2 (imágenes). Panel /admin propio en español con inicio de sesión por GitHub OAuth, restringido al dueño y a los colaboradores con permiso de escritura en el repositorio configurado. Entrega en .zip con guía de despliegue. Dominio inicial gratuito de Cloudflare (`*.workers.dev`). Opción B elegida por el usuario: cambios instantáneos sin reconstruir.

## Users

- Compradores en Colombia, mayoritariamente desde el celular, que llegan por redes o WhatsApp buscando tecnología, hogar inteligente, cocina y accesorios para vehículos a buen precio, y que necesitan confiar en una tienda que aún no conocen.
- El dueño de JGR Importaciones (y colaboradores), que administra catálogo, precios, existencias, textos, imágenes y colores sin saber programar.

## Product Purpose

Catálogo con carrito que convierte la visita en una conversación de WhatsApp con el pedido completo ya armado (productos, variantes, cantidades, precio unitario, subtotales y total). El envío se cotiza en WhatsApp. Éxito: el visitante entiende en segundos que es una tienda seria, encuentra el producto y envía el pedido sin fricción.

## Positioning

Importador directo: calidad verificada con precios bajos y atención humana por WhatsApp antes de pagar (el cliente confirma envío y paga solo después de hablar con una persona).

## Operating Context

- Pedido se cierra por wa.me al +57 302 6983562.
- Medios de pago a mencionar: todos los habituales en Colombia (Nequi, Daviplata, Bancolombia/transferencia, PSE, tarjetas, efectivo/contraentrega) — el cliente elige su preferido en el formulario del carrito.
- Formulario opcional antes de WhatsApp: nombre, ciudad, dirección, método de pago, nota.

## Capabilities and Constraints

- Categorías iniciales: Tecnología, Hogar inteligente, Cocina, Vehículos, con subcategorías; el dueño creará más.
- Producto: varias imágenes, descripción, precio, precio anterior tachado, precio de oferta destacado en otro color y tamaño, unidades disponibles, marca de agotado, variantes (algunos productos, p. ej. color).
- Paginación por categoría.
- Modo claro (predeterminado siempre) y modo oscuro con interruptor.
- Todo lo de la página de inicio (colores, frases, imágenes), categorías y productos editable desde /admin.
- Incluye: redes sociales, preguntas frecuentes, testimonios, términos, privacidad, cambios y devoluciones, Cloudflare Web Analytics.
- Productos e imágenes iniciales son de muestra (inventados) y se reemplazarán.

## Brand Commitments

- Nombre: JGR Importaciones. Eslogan: "Calidad & Confianza".
- Logo: emblema dorado y plateado con laureles, estrellas y diamante (archivo del proyecto `Picsart_26-08-18_14-26-33-564.png`, fondo transparente). Usarlo tal cual.
- Estilo pedido: minimalista pero premium y exclusivo.
- Paleta clara (predeterminada): blanco hueso con dorados y negros. Paleta oscura: negro profundo con dorado como acento.

## Evidence on Hand

- Logo real. No hay fotos reales de productos ni testimonios reales: los testimonios y productos iniciales son de muestra y deben marcarse como tales en la entrega para que el dueño los reemplace. No inventar cifras de clientes, años de trayectoria ni certificaciones.

## Product Principles

1. Confianza antes que espectáculo: cada pantalla debe dejar claro quién vende, cómo se paga y que una persona confirma el pedido.
2. El carrito es el producto: agregar, revisar y enviar a WhatsApp debe ser lo más fácil de la página.
3. El dueño manda: nada fijo en código que el dueño quiera cambiar.
4. Celular primero.

## Accessibility & Inclusion

WCAG 2.1 AA en contraste y navegación por teclado; respeta prefers-reduced-motion.
