# Design

<!-- Sistema visual de JGR Importaciones: marketplace con la marca dorada y negra. -->

## Mundo

Tienda comercial tipo marketplace, construida con los colores del logo. El formato sigue las referencias del dueño: promociones grandes que rotan, cuadrícula de categorías con foto, ofertas del día con cuenta regresiva, tarjetas de producto con botón de compra visible y banners promocionales. El momento distintivo es la fila de **destacados en tarjetas inclinadas** sobre una banda dorada suave, con la cantidad en el carrito sobre cada tarjeta.

## Color

Todos los colores son variables CSS que el dueño edita en /admin > Colores y logo. Valores por defecto:

| Token | Claro (predeterminado) | Oscuro | Uso |
|---|---|---|---|
| `--bg` | `#F5F2EB` | `#0E0D0B` | Fondo de la página |
| `--surface` | `#FFFFFF` | `#1A1812` | Tarjetas, cabecera, paneles |
| `--ink` | `#1A1712` | `#EFE8DA` | Texto principal |
| `--muted` | `#5F574A` | `#A89E8A` | Texto secundario |
| `--line` | `#DDD4C3` | `#2E2A21` | Bordes |
| `--gold` | `#C9A24A` | `#D4AF5A` | Botón "Añadir al carrito", buscador, insignias, banda de destacados |
| `--gold-text` | `#7A5B17` | `#E2C277` | Textos dorados legibles |
| `--sale` | `#B3261E` | `#F08A6C` | Precio de oferta e insignia de descuento |
| `--btn` / `--btn-text` | `#1A1712` / `#F7F1E3` | `#D4AF5A` / `#14110B` | Botón del carrito, barra de aviso, chips activos |
| `--on-gold` | `#1A1712` | `#14110B` | Texto sobre dorado |

Derivados: `--tint` (fondo de fotos de producto, dorado al 7 % sobre la superficie), `--gold-soft`, `--gold-hair`.

Los estilos de slides y banners (**oscuro**, **dorado**, **claro**) usan colores fijos para oscuro y dorado (`#15120C`→`#221D13` con dorado `#E2C277`; degradado `#E9CF86`→`#C9A24A`), de modo que se ven igual en modo claro y oscuro; el estilo claro sigue el tema.

## Tipografía

- **Nunito** (variable, alojada en `/assets/fonts`), una sola familia redondeada y muy legible.
- Pesos: 500 texto, 700 nombres de producto y enlaces, 800 títulos de sección y botones, 900 precios, títulos de slides y cifras de la cuenta regresiva.
- Escala: título de slide `clamp(1.85rem → 3.25rem)`, título de página `clamp(1.8rem → 2.6rem)`, título de sección `clamp(1.35rem → 1.8rem)`, cuerpo 1rem/1.55, notas 0.8125–0.875rem.
- Precios con cifras alineadas (`tabular-nums`); la oferta en `--sale` y más grande que el precio normal, el anterior tachado.

## Forma

- Radios: 22px (slides, banners, paneles grandes), 16px (tarjetas, cuadros de categoría), 10–12px (fotos internas, opciones), píldora para botones, buscador y chips.
- Tarjeta de producto: foto cuadrada sobre `--tint`, insignias arriba a la izquierda (descuento en rojo, "Últimas N" en dorado, agotado en tinta), nombre en dos líneas, precio y botón a todo el ancho.
- Destacados: tarjetas 4:5 con radio de 26px, giro alterno de −3°, +3° y −1.5°, que se enderezan al pasar el cursor o recibir el foco.
- Sombras suaves solo en elementos que flotan (flechas, tarjetas destacadas al pasar el cursor, hojas laterales, avisos).

## Íconos

Juego propio en línea de 24px, trazo 1.6 (`src/views/icons.ts`). Las imágenes de muestra usan el mismo lenguaje en dorado y llevan "Imagen de muestra".

## Movimiento

Las promociones rotan cada 6 segundos, se detienen al pasar el cursor, al enfocar o al pausar, y no rotan con movimiento reducido. El resto responde a acciones: enderezar la tarjeta destacada, abrir el carrito, el contador al añadir y los avisos.

## Panel (/admin)

Mismo color y tipografía, controles estándar. La página de inicio se edita por bloques plegables, uno por sección.
