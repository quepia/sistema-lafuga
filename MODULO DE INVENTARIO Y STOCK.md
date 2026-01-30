# Módulo de Inventario y Stock — Plan de Implementación

> Plan organizado en fases con tareas paralelizables para múltiples agentes.
> Cada tarea marcada con `[Agente X]` indica que puede ejecutarse en paralelo con otras del mismo grupo.

---

## FASE 1: Base de Datos (Schema + Migraciones)

Todo el schema se puede crear en paralelo porque las tablas no tienen dependencias circulares.

### Grupo 1A — Tablas nuevas (paralelizable)

| # | Tarea | Agente | Detalle |
|---|-------|--------|---------|
| 1.1 | Crear tabla `proveedores` | Agente A | Tabla con campos: id, nombre, cuit, contacto, telefono, email, direccion, condicion_pago, notas, activo, created_at. Incluir RLS (soft delete, no hard delete). |
| 1.2 | Crear tabla `movimientos_stock` | Agente B | Tabla inmutable (solo INSERT). Campos: id, created_at, producto_id (FK), tipo_movimiento (enum con 12 valores), cantidad, stock_previo, stock_resultante, costo_unitario, costo_total, usuario_id, referencia_id, referencia_tipo, motivo, lote, fecha_vencimiento. Índices: (producto_id, created_at) y (tipo_movimiento, created_at). RLS: solo INSERT para usuarios normales. |
| 1.3 | Crear tablas `compras` + `compras_detalle` | Agente C | Cabecera con proveedor_id (FK), fecha, numero_factura, tipo_documento, cae, subtotal, iva, total, estado, notas, usuario_id. Detalle con compra_id (FK), producto_id (FK), cantidad, cantidad_recibida, costo_unitario, costo_total, fecha_vencimiento, lote. RLS: no permitir DELETE si estado='RECIBIDA'. |
| 1.4 | Crear tabla `composicion_combos` | Agente A | producto_padre_id (FK), producto_hijo_id (FK), cantidad. Simple join table. |
| 1.5 | Crear tabla `ordenes_compra` | Agente B | Similar a compras pero con estados de workflow: BORRADOR, PENDIENTE, APROBADA, ENVIADA, PARCIAL, COMPLETA, CANCELADA. Campos: numero_orden, fecha_orden, fecha_entrega_esperada, etc. |

### Grupo 1B — Modificar tabla `productos` (un solo agente)

| # | Tarea | Agente | Detalle |
|---|-------|--------|---------|
| 1.6 | Agregar campos de stock a `productos` | Agente D | Nuevos campos: stock_actual (float, default 0), stock_minimo (float, default 0), stock_maximo (float, nullable), stock_reservado (float, default 0), punto_pedido (float, nullable), permite_stock_negativo (bool, default true), unidad_stock (string, default 'unidad'), unidad_compra (string, default 'unidad'), factor_conversion (float, default 1), merma_esperada (float, default 0), ubicacion_deposito (string, nullable), controla_vencimiento (bool, default false), codigo_barras (string, nullable — OJO: ya existe `codigo_barra`, evaluar si renombrar o usar el existente), proveedor_predeterminado_id (uuid FK -> proveedores). Índices: (stock_actual) WHERE stock_actual <= stock_minimo, (codigo_barras). |

### Grupo 1C — Configuración global

| # | Tarea | Agente | Detalle |
|---|-------|--------|---------|
| 1.7 | Crear tabla o mecanismo de `configuracion_sistema` | Agente D | Tabla key-value o JSON para: metodo_costeo ('PROMEDIO_PONDERADO'), permitir_venta_sin_stock (true), alertas_stock_email (false), dias_alerta_vencimiento (30). Alternativa: usar una tabla `configuracion` con campos tipados. |

**Resultado esperado:** Todas las migraciones SQL listas en `/supabase/migrations/`. Ejecutar en orden: primero proveedores, luego las que tienen FK a productos/proveedores.

---

## FASE 2: API y Lógica de Negocio

Requiere que Fase 1 esté completa. Las funciones de API se pueden desarrollar en paralelo.

### Grupo 2A — Types y API base (paralelizable)

| # | Tarea | Agente | Detalle |
|---|-------|--------|---------|
| 2.1 | Definir interfaces TypeScript | Agente A | En `lib/supabase.ts`: agregar interfaces Proveedor, MovimientoStock, Compra, CompraDetalle, ComposicionCombo, OrdenCompra, ConfiguracionSistema. Extender la interface Producto con los nuevos campos de stock. Crear enums TipoMovimiento, EstadoCompra, TipoDocumento, MetodoCosteo. |
| 2.2 | Funciones API de Proveedores (CRUD) | Agente B | En `lib/api.ts`: listarProveedores, obtenerProveedor, crearProveedor, actualizarProveedor, desactivarProveedor (soft delete). Seguir el patrón existente del proyecto. |
| 2.3 | Funciones API de Movimientos de Stock | Agente C | En `lib/api.ts`: registrarMovimiento (función base interna), obtenerMovimientos (con filtros por producto/fecha/tipo), obtenerKardex (historial de un producto con saldos). |
| 2.4 | Función obtenerAlertasStock | Agente D | En `lib/api.ts`: query productos donde stock_actual <= stock_minimo (crítico), stock_actual entre mínimo y mínimo+20% (precaución). Incluir productos próximos a vencer si controla_vencimiento = true. |

### Grupo 2B — Lógica de negocio core (secuencial entre sí, pero paralelizable por función)

| # | Tarea | Agente | Detalle |
|---|-------|--------|---------|
| 2.5 | Función `registrarCompra` | Agente A | Crear compra + detalle, convertir unidades (factor_conversion), incrementar stock_actual, crear movimientos tipo COMPRA, actualizar costo según método (promedio ponderado o último costo). Todo en transacción atómica (usar Supabase rpc o función SQL). |
| 2.6 | Función `ajustarStock` | Agente B | Recibe productoId, cantidadReal, motivo, tipoAjuste. Calcula diferencia, actualiza stock_actual, crea movimiento (AJUSTE_MANUAL, MERMA, ROTURA, VENCIMIENTO). |
| 2.7 | Modificar `crearVenta` / `crearVentaExtendida` | Agente C | Agregar: validar stock disponible (si permite_stock_negativo=false), decrementar stock_actual, crear movimiento tipo VENTA. Para combos: recorrer composicion_combos y descontar componentes. Manejar estados PRESUPUESTO/PENDIENTE/CONFIRMADA/CANCELADA. Todo en transacción atómica. |
| 2.8 | Función `registrarDevolucion` | Agente D | Devolución cliente: incrementar stock si buen estado, registrar merma si dañado, movimiento DEVOLUCION_CLIENTE. Devolución proveedor: decrementar stock, movimiento DEVOLUCION_PROVEEDOR. |

### Grupo 2C — Hooks de React

| # | Tarea | Agente | Detalle |
|---|-------|--------|---------|
| 2.9 | Hook `useProveedores` | Agente A | Listar, buscar, CRUD. Seguir patrón de `useProductos`. |
| 2.10 | Hook `useInventario` | Agente B | Estado de stock, alertas, KPIs (valor total inventario, productos críticos, sin movimiento 30 días). |
| 2.11 | Hook `useCompras` | Agente C | Listar compras, crear compra, detalle de compra. |
| 2.12 | Hook `useMovimientosStock` | Agente D | Historial filtrable, kardex por producto. |

---

## FASE 3: UI — Páginas de Consulta (read-only)

Se puede arrancar cuando los types (2.1) y hooks estén listos. Las páginas son independientes entre sí.

### Grupo 3A — Estructura base

| # | Tarea | Agente | Detalle |
|---|-------|--------|---------|
| 3.1 | Agregar sección "Inventario" al sidebar | Agente A | En `components/sidebar.tsx`: nueva sección con ícono Package (lucide-react). Sub-items: Dashboard (/inventario), Stock (/inventario/productos), Compras (/inventario/compras), Proveedores (/inventario/proveedores), Ajustes (/inventario/ajustes), Movimientos (/inventario/movimientos). Crear layout en `app/(protected)/inventario/layout.tsx` si necesario. |

### Grupo 3B — Páginas de consulta (paralelizable)

| # | Tarea | Agente | Detalle |
|---|-------|--------|---------|
| 3.2 | Dashboard de Inventario (`/inventario`) | Agente A | KPIs: valor total inventario (a costo), productos con stock crítico, productos sin movimiento (30 días), próximos a vencer. Accesos rápidos: registrar compra, ajuste rápido, ver alertas. Usar Cards de Radix UI + recharts para gráficos. |
| 3.3 | Lista de Inventario (`/inventario/productos`) | Agente B | Tabla con: código, producto, stock actual, mínimo, máximo, estado (indicador color rojo/amarillo/verde), último movimiento, costo unitario. Filtros: estado stock, categoría, proveedor. Acciones: ver historial, ajuste rápido (+/-), editar parámetros stock. Export Excel. |
| 3.4 | Historial de Movimientos (`/inventario/movimientos`) | Agente C | Tabla con: fecha/hora, producto, tipo movimiento, cantidad, stock resultante, referencia (venta/compra/ajuste), usuario. Filtros por producto, fecha, tipo. Paginación. |
| 3.5 | Gestión de Proveedores (`/inventario/proveedores`) | Agente D | ABM completo: lista con nombre, CUIT, teléfono, última compra, estado. Dialog de crear/editar. Detalle con historial de compras y productos frecuentes. Soft delete (activar/desactivar). |

---

## FASE 4: UI — Páginas de Acción (write)

Requiere hooks de Grupo 2C y funciones de Grupo 2B.

### Grupo 4A — Formularios principales (paralelizable)

| # | Tarea | Agente | Detalle |
|---|-------|--------|---------|
| 4.1 | Entrada de Mercadería (`/inventario/compras/nueva`) | Agente A | Formulario completo: seleccionar proveedor, fecha, tipo documento, número factura. Detalle: buscador productos (nombre/código/barras), cantidad en unidad compra (mostrar equivalencia stock), costo unitario (mostrar último costo referencia), vencimiento/lote. Resumen: subtotal, IVA, total. Alerta si costo cambió >X%. Botón confirmar recepción. |
| 4.2 | Ajustes de Stock (`/inventario/ajustes`) | Agente B | Tipos: corrección conteo físico, merma, rotura, vencimiento, consumo interno. Formulario: búsqueda producto, stock actual (readonly), nueva cantidad, diferencia (calculada), tipo ajuste, motivo (obligatorio). Historial de ajustes realizados. |
| 4.3 | Historial de Compras (`/inventario/compras`) | Agente C | Lista: fecha, proveedor, número documento, total, estado. Acciones: ver detalle, imprimir/exportar, registrar devolución parcial. Dialog de detalle de compra. |
| 4.4 | Composición de Combos/Kits | Agente D | En el formulario existente de producto (`ProductFormDialog.tsx`): agregar pestaña/sección "Combo". Toggle "Es combo/kit". Si es combo: tabla de componentes con buscador de productos, cantidad por componente. Guardar en tabla composicion_combos. Mostrar badge "COMBO" en lista de productos. |

---

## FASE 5: Integración con Vistas Existentes

Requiere Fase 4 completada. Modifica código existente, cuidado con conflictos.

### Grupo 5A — Modificaciones a vistas existentes (secuencial recomendado)

| # | Tarea | Agente | Detalle |
|---|-------|--------|---------|
| 5.1 | Modificar Lista de Productos (`/productos`) | Agente A | Nueva columna "Stock" con indicador de color (rojo/amarillo/verde). Badges "COMBO" y "SIN STOCK". Filtro por estado de stock. Modificar `price-consultation-view.tsx`. |
| 5.2 | Modificar Nueva Venta (`/ventas/nueva`) | Agente B | Mostrar stock disponible junto al producto en el buscador. Indicador visual si stock bajo. Alerta al intentar vender más de lo disponible. Opción continuar/cancelar según config `permite_stock_negativo`. |
| 5.3 | Modificar Catálogo Público (`/catalogo/[token]`) | Agente C | Config por catálogo: mostrar/ocultar stock. Opción "Ocultar productos sin stock". Badge "Agotado" / "Últimas unidades". Deshabilitar agregar si no hay stock. |
| 5.4 | Modificar ProductFormDialog | Agente D | Agregar campos de stock al formulario de producto: stock_actual, stock_minimo, stock_maximo, unidad_stock, unidad_compra, factor_conversion, permite_stock_negativo, ubicacion_deposito, controla_vencimiento, proveedor_predeterminado (select). Organizar en tabs o sección colapsable. |

---

## FASE 6: Funcionalidades Avanzadas

Opcional / posterior. Cada una es independiente.

| # | Tarea | Agente | Detalle |
|---|-------|--------|---------|
| 6.1 | Modo Auditoría Rápida (Mobile) | Agente A | Nueva ruta `/inventario/auditoria`. Mobile-first, pantalla completa, botones grandes. Escaneo código barras con cámara (reutilizar `barcode-scanner.tsx`). Muestra nombre + foto + stock actual grande. Teclado numérico para cantidad contada. Botones +1/-1/+10/-10. Confirmar y siguiente. |
| 6.2 | Órdenes de Compra (workflow) | Agente B | CRUD de órdenes con estados (BORRADOR→PENDIENTE→APROBADA→ENVIADA→RECIBIDA). Convertir orden aprobada en compra al recibir mercadería. |
| 6.3 | Reportes de Inventario | Agente C | Ampliar `/reportes` con: valorización de inventario, productos más/menos rotados, análisis ABC, mermas por período, compras por proveedor. |
| 6.4 | Alertas por email | Agente D | Supabase Edge Function o cron que revisa stock bajo y productos por vencer. Envía email a usuarios configurados. |

---

## Resumen de Dependencias entre Fases

```
FASE 1 (DB Schema)
  └──> FASE 2 (API + Hooks)
         ├──> FASE 3 (UI Consulta)  ← puede arrancar con types (2.1) listos
         └──> FASE 4 (UI Acción)    ← requiere hooks completos
                └──> FASE 5 (Integración vistas existentes)
                       └──> FASE 6 (Avanzado, opcional)
```

## Distribución Sugerida de Agentes

- **Agente A**: Proveedores (tabla → API → hook → UI) + Dashboard inventario + Entrada mercadería
- **Agente B**: Movimientos stock (tabla → API → hook → UI) + Ajustes de stock + Venta con stock
- **Agente C**: Compras (tablas → API → hook → UI) + Historial compras + Catálogo público
- **Agente D**: Campos productos + Config sistema + Alertas + Combos + ProductFormDialog

Cada agente lleva su "vertical" completa de punta a punta, minimizando conflictos de merge.

---

## Notas Técnicas Importantes

1. **`codigo_barra` vs `codigo_barras`**: La tabla productos ya tiene `codigo_barra`. Evaluar si reusar ese campo o crear `codigo_barras` nuevo. Recomendación: usar el existente.
2. **Transacciones atómicas**: Supabase JS client no soporta transacciones nativas. Opciones: usar `supabase.rpc()` llamando a funciones PL/pgSQL, o usar Supabase Edge Functions.
3. **`id` de productos**: El campo `id` actual es string (viene de CSV 'CODIGO'), no UUID. Las tablas nuevas que referencian productos deben usar `text` como FK, no `uuid`.
4. **Patrón existente**: Seguir el patrón de `lib/api.ts` (clase ApiService con métodos), hooks en `/hooks/`, y componentes con `"use client"`.
5. **UI Components**: Usar los componentes Radix UI existentes en `/components/ui/` (Button, Card, Dialog, Table, Input, Select, Badge, Tabs, etc.).
