# Plan de Implementación: Módulo de Inventario y Stock

Este documento detalla la arquitectura para el nuevo módulo de control de stock, diseñado para integrarse con el sistema existente de "Sistema de Gestión de Precios - La Fuga".

---

## 1. Cambios en Base de Datos (Supabase)

Se requieren migraciones SQL para soportar el control de inventario.

### 1.1 Modificación de tabla `productos`

Agregar campos para gestionar cantidades, alertas y conversiones.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `stock_actual` | float | Cantidad actual disponible. Default 0. |
| `stock_minimo` | float | Cantidad mínima antes de mostrar alerta. Default 0. |
| `stock_maximo` | float | Cantidad máxima recomendada (para evitar sobrestock). Nullable. |
| `stock_reservado` | float | Cantidad comprometida en ventas pendientes. Default 0. |
| `punto_pedido` | float | Nivel de stock que dispara alerta de compra. Nullable. |
| `permite_stock_negativo` | boolean | Si permite vender sin stock. Default true (para transición suave). |
| `unidad_stock` | string | Unidad base de medida del inventario (ej. "unidad", "litro", "kg"). Default "unidad". |
| `unidad_compra` | string | Unidad en la que se compra al proveedor (ej. "Bulto", "Caja"). Default "unidad". |
| `factor_conversion` | float | Cuántas unidades de stock trae una unidad de compra. Default 1. |
| `merma_esperada` | float | Porcentaje de pérdida esperada. Default 0. |
| `ubicacion_deposito` | string | Ubicación física en el depósito (ej. "Estante A3"). Nullable. |
| `controla_vencimiento` | boolean | Si requiere control de fecha de vencimiento. Default false. |
| `codigo_barras` | string | Código de barras para escaneo rápido. Nullable. |
| `proveedor_predeterminado_id` | uuid | FK -> proveedores.id. Proveedor habitual. |

### 1.2 Nueva tabla `proveedores`

Para gestionar el origen de la mercadería.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Primary Key |
| `nombre` | string | Nombre o razón social del proveedor. Requerido. |
| `cuit` | string | CUIT del proveedor (Argentina). Nullable. |
| `contacto` | string | Nombre de la persona de contacto. Nullable. |
| `telefono` | string | Teléfono de contacto. Nullable. |
| `email` | string | Email de contacto. Nullable. |
| `direccion` | string | Dirección del proveedor. Nullable. |
| `condicion_pago` | string | Condiciones habituales (ej. "Contado", "30 días"). Nullable. |
| `notas` | text | Observaciones generales. Nullable. |
| `activo` | boolean | Soft delete. Default true. |
| `created_at` | timestamp | Fecha de creación. |

### 1.3 Nueva tabla `movimientos_stock`

Bitácora inmutable de todos los cambios de inventario. Esta tabla es de solo inserción para mantener trazabilidad completa.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Primary Key |
| `created_at` | timestamp | Fecha y hora del movimiento. Default now(). |
| `producto_id` | uuid | FK -> productos.id |
| `tipo_movimiento` | enum | Tipo: 'VENTA', 'COMPRA', 'AJUSTE_MANUAL', 'MERMA', 'ROTURA', 'VENCIMIENTO', 'DEVOLUCION_CLIENTE', 'DEVOLUCION_PROVEEDOR', 'INVENTARIO_INICIAL', 'TRANSFERENCIA_ENTRADA', 'TRANSFERENCIA_SALIDA', 'CONSUMO_INTERNO'. |
| `cantidad` | float | Cantidad movida (positivo entradas, negativo salidas). |
| `stock_previo` | float | Snapshot del stock antes del movimiento. |
| `stock_resultante` | float | Snapshot del stock después del movimiento. |
| `costo_unitario` | float | Costo al momento del movimiento. |
| `costo_total` | float | Costo total del movimiento (cantidad × costo). |
| `usuario_id` | uuid | Usuario que realizó la acción. |
| `referencia_id` | uuid | ID de venta, compra o ajuste relacionado. Nullable. |
| `referencia_tipo` | string | 'VENTA', 'COMPRA', 'AJUSTE', 'TRANSFERENCIA'. Nullable. |
| `motivo` | string | Descripción para ajustes manuales. Nullable. |
| `lote` | string | Identificador de lote. Nullable. |
| `fecha_vencimiento` | date | Fecha de vencimiento del lote. Nullable. |

### 1.4 Nueva tabla `compras`

Cabecera de compras para agrupar items y reconstruir documentos del proveedor.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Primary Key |
| `proveedor_id` | uuid | FK -> proveedores.id |
| `fecha` | date | Fecha de la compra/recepción. |
| `numero_factura` | string | Número de factura o remito del proveedor. |
| `tipo_documento` | string | 'FACTURA_A', 'FACTURA_B', 'FACTURA_C', 'REMITO', 'NOTA_CREDITO'. |
| `cae` | string | Código CAE para facturación electrónica Argentina. Nullable. |
| `subtotal` | float | Subtotal antes de impuestos. |
| `iva` | float | Monto de IVA. |
| `total` | float | Total de la compra. |
| `estado` | string | 'PENDIENTE', 'RECIBIDA', 'PARCIAL', 'CANCELADA'. |
| `notas` | text | Observaciones. Nullable. |
| `usuario_id` | uuid | Usuario que registró la compra. |
| `created_at` | timestamp | Fecha de creación. |

### 1.5 Nueva tabla `compras_detalle`

Detalle de cada ítem de una compra.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Primary Key |
| `compra_id` | uuid | FK -> compras.id |
| `producto_id` | uuid | FK -> productos.id |
| `cantidad` | float | Cantidad comprada (en unidad de compra). |
| `cantidad_recibida` | float | Cantidad efectivamente recibida. Default igual a cantidad. |
| `costo_unitario` | float | Costo por unidad de compra. |
| `costo_total` | float | Costo total de la línea. |
| `fecha_vencimiento` | date | Fecha de vencimiento del lote. Nullable. |
| `lote` | string | Identificador de lote. Nullable. |

### 1.6 Nueva tabla `composicion_combos` (Kits)

Permite definir productos compuestos que descuentan stock de sus componentes.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Primary Key |
| `producto_padre_id` | uuid | FK -> productos.id. El producto Combo/Kit. |
| `producto_hijo_id` | uuid | FK -> productos.id. El componente. |
| `cantidad` | float | Cantidad del componente por cada unidad del combo. |

### 1.7 Nueva tabla `ordenes_compra`

Separación entre orden de compra y recepción física (flujo avanzado).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Primary Key |
| `proveedor_id` | uuid | FK -> proveedores.id |
| `numero_orden` | string | Número interno de orden. |
| `fecha_orden` | date | Fecha de emisión. |
| `fecha_entrega_esperada` | date | Fecha prometida de entrega. |
| `estado` | string | 'BORRADOR', 'PENDIENTE', 'APROBADA', 'ENVIADA', 'PARCIAL', 'COMPLETA', 'CANCELADA'. |
| `subtotal` | float | Subtotal antes de impuestos. |
| `iva` | float | IVA calculado. |
| `total` | float | Total. |
| `observaciones` | text | Notas internas. |
| `created_at` | timestamp | Fecha de creación. |

### 1.8 Índices recomendados

Para optimizar consultas frecuentes:

- `movimientos_stock(producto_id, created_at)`: Historial por producto
- `movimientos_stock(tipo_movimiento, created_at)`: Reportes por tipo
- `productos(stock_actual) WHERE stock_actual <= stock_minimo`: Alertas de stock bajo
- `productos(codigo_barras)`: Búsqueda por escaneo
- `compras(proveedor_id, fecha)`: Historial de compras por proveedor

### 1.9 Políticas de seguridad (RLS)

- `movimientos_stock`: Solo INSERT para usuarios normales. Las correcciones se hacen con nuevos movimientos compensatorios, nunca editando registros existentes.
- `proveedores`: Soft delete mediante campo `activo`, nunca eliminar para preservar referencias históricas.
- `compras` y `compras_detalle`: No permitir eliminación una vez que el estado sea 'RECIBIDA'.

---

## 2. Lógica de Negocio (Backend/API)

Actualizar `lib/api.ts` y crear nuevos hooks para gestión de inventario.

### 2.1 Configuración global del sistema

Agregar configuraciones a nivel sistema:

- `metodo_costeo`: 'PROMEDIO_PONDERADO', 'ULTIMO_COSTO', 'FIFO'. Default: 'PROMEDIO_PONDERADO'
- `permitir_venta_sin_stock`: Comportamiento por defecto cuando no hay stock
- `alertas_stock_email`: Si enviar notificaciones por email
- `dias_alerta_vencimiento`: Cuántos días antes alertar productos a vencer

### 2.2 Actualización de `crearVenta`

**Validaciones previas:**
- Verificar stock disponible (stock_actual - stock_reservado) si `permite_stock_negativo` es false
- Mostrar advertencia (no bloqueo) si el stock quedaría por debajo del mínimo

**Manejo de estados de venta:**
- `PRESUPUESTO`: No descuenta stock, no genera movimiento
- `PENDIENTE`: Reserva stock (bloquea) pero no descuenta físicamente
- `CONFIRMADA`: Descuenta stock físico, libera reserva previa, genera movimiento tipo 'VENTA'
- `CANCELADA`: Si estaba confirmada, devuelve stock con movimiento 'DEVOLUCION_CLIENTE'. Si estaba pendiente, libera reserva.

**Manejo de Combos/Kits:**
- Si el producto es un "Combo", no descontar su propio stock (es virtual)
- Recorrer `composicion_combos` y descontar el stock de cada componente
- Generar un movimiento de stock por cada componente afectado

**Transacción atómica:**
Al crear una venta confirmada, en una única transacción:
1. Registrar la venta en `ventas`
2. Por cada producto vendido:
   - Decrementar `stock_actual` en `productos`
   - Crear registro en `movimientos_stock` (Tipo: 'VENTA')
3. Si algún paso falla, revertir toda la operación

### 2.3 Nueva función `registrarCompra`

**Parámetros:** proveedorId, items[], numeroFactura, tipoDocumento, fecha, notas

**Proceso:**
1. Crear registro en `compras` con estado 'PENDIENTE'
2. Por cada ítem:
   - Crear registro en `compras_detalle`
   - Convertir cantidad de unidad de compra a unidad de stock (usando `factor_conversion`)
   - Incrementar `stock_actual` en `productos`
   - Crear movimiento tipo 'COMPRA'
3. Actualizar estado de compra a 'RECIBIDA'

**Actualización de costos:**
Según configuración del sistema:

- **Promedio ponderado:**
  ```
  nuevo_costo = ((stock_actual * costo_actual) + (cantidad_comprada * costo_compra)) / (stock_actual + cantidad_comprada)
  ```
- **Último costo:** Reemplazar costo con el de la última compra

**Sugerencia de precio:**
Si el nuevo costo supera en más de X% al costo anterior, sugerir actualización del precio de venta.

### 2.4 Nueva función `ajustarStock`

**Parámetros:** productoId, cantidadReal, motivo, tipoAjuste

**Proceso:**
1. Obtener stock actual del sistema
2. Calcular diferencia (cantidadReal - stockSistema)
3. Determinar tipo de movimiento:
   - 'AJUSTE_MANUAL' para correcciones generales
   - 'MERMA' para pérdidas por evaporación/derrame
   - 'ROTURA' para envases dañados
   - 'VENCIMIENTO' para productos vencidos
4. Actualizar `stock_actual` en `productos`
5. Crear registro en `movimientos_stock` con el motivo

### 2.5 Nueva función `registrarDevolucion`

**Devolución de cliente:**
- Parámetros: ventaId, items[], motivo, estadoProducto
- Si el producto está en buen estado: incrementar stock vendible
- Si el producto está dañado: registrar como merma
- Crear movimiento tipo 'DEVOLUCION_CLIENTE' vinculado a la venta original

**Devolución a proveedor:**
- Parámetros: proveedorId, items[], motivo
- Decrementar stock
- Crear movimiento tipo 'DEVOLUCION_PROVEEDOR'

### 2.6 Nueva función `obtenerAlertasStock`

Retorna productos que requieren atención:

- Stock actual <= stock mínimo (crítico)
- Stock actual entre mínimo y mínimo + 20% (precaución)
- Productos próximos a vencer (si controla_vencimiento)

### 2.7 Nueva función `obtenerMovimientos`

Retorna historial completo (Kardex) para auditoría:

- Filtros por producto, fecha, tipo de movimiento
- Incluye stock previo y resultante para trazabilidad
- Ordenado cronológicamente

---

## 3. Interfaz de Usuario (Frontend)

### 3.1 Dashboard de Inventario (Nueva página `/inventario`)

Vista principal con resumen ejecutivo del estado del inventario.

**KPIs principales:**
- Valor total del inventario (a costo)
- Cantidad de productos con stock crítico
- Cantidad de productos sin movimiento (últimos 30 días)
- Productos próximos a vencer

**Accesos rápidos:**
- Registrar compra
- Ajuste rápido de stock
- Ver alertas pendientes

### 3.2 Lista de Inventario (`/inventario/productos`)

Tabla completa del inventario con funcionalidades avanzadas.

**Columnas:**
- Código / SKU
- Producto (nombre)
- Stock actual
- Stock mínimo
- Stock máximo
- Estado (indicador visual: 🔴 Crítico, 🟡 Precaución, 🟢 OK)
- Último movimiento
- Costo unitario
- Acciones

**Filtros:**
- Por estado de stock
- Por categoría
- Por proveedor habitual

**Acciones por producto:**
- Ver historial de movimientos
- Ajuste rápido (+/- cantidad)
- Editar parámetros de stock (mínimo, máximo)

**Acciones masivas:**
- Exportar a Excel
- Imprimir etiquetas con código de barras

### 3.3 Entrada de Mercadería (`/inventario/compras/nueva`)

Formulario para cargar compras a proveedores.

**Cabecera:**
- Selección de proveedor
- Fecha de compra/recepción
- Tipo de documento (Factura A/B/C, Remito)
- Número de documento
- Notas/observaciones

**Detalle de productos:**
- Buscador de productos (por nombre, código, código de barras)
- Cantidad (en unidad de compra, muestra equivalencia en unidad de stock)
- Costo unitario (muestra último costo para referencia)
- Fecha de vencimiento (si el producto lo requiere)
- Lote (opcional)

**Funcionalidades adicionales:**
- Alerta si el costo cambió significativamente
- Sugerencia de actualización de precio de venta

**Resumen:**
- Subtotal, IVA, Total
- Botón confirmar recepción

### 3.4 Historial de Compras (`/inventario/compras`)

Lista de todas las compras registradas.

**Columnas:**
- Fecha
- Proveedor
- Número de documento
- Total
- Estado
- Acciones

**Acciones:**
- Ver detalle
- Imprimir/exportar
- Registrar devolución parcial

### 3.5 Gestión de Proveedores (`/inventario/proveedores`)

ABM de proveedores con información comercial.

**Lista:**
- Nombre
- CUIT
- Teléfono
- Última compra
- Estado (activo/inactivo)

**Detalle de proveedor:**
- Datos de contacto completos
- Historial de compras
- Productos comprados frecuentemente

### 3.6 Ajustes de Stock (`/inventario/ajustes`)

Gestión de ajustes manuales de inventario.

**Tipos de ajuste:**
- Corrección por conteo físico
- Merma
- Rotura
- Vencimiento
- Consumo interno

**Formulario:**
- Búsqueda de producto
- Stock actual (mostrado, no editable)
- Nueva cantidad real
- Diferencia (calculada automáticamente)
- Tipo de ajuste
- Motivo (obligatorio)

### 3.7 Movimientos de Stock (`/inventario/movimientos`)

Bitácora completa de todos los movimientos.

**Columnas:**
- Fecha/hora
- Producto
- Tipo de movimiento
- Cantidad
- Stock resultante
- Referencia (venta, compra, ajuste)
- Usuario

### 3.8 Modificaciones en Vistas Existentes

**Lista de Productos (`/productos`):**
- Nueva columna "Stock" con indicador de color
- Badge "COMBO" para productos compuestos
- Badge "SIN STOCK" para productos agotados
- Filtro por estado de stock

**Nueva Venta:**
- Mostrar stock disponible junto al producto
- Indicador visual si stock es bajo
- Alerta al intentar vender más de lo disponible
- Opción de continuar o cancelar según configuración

**Catálogos Públicos (`/catalogo/[token]`):**
- Configuración por catálogo: mostrar/ocultar stock
- Opción "Ocultar productos sin stock"
- Badge "Agotado" o "Últimas unidades"
- Deshabilitar botón de agregar si no hay stock

### 3.9 Modo "Auditoría Rápida" (Mobile First)

Vista simplificada optimizada para uso en depósito con celular.

**Características:**
- Interfaz de pantalla completa, botones grandes
- Escaneo de código de barras con cámara
- Muestra nombre y foto del producto
- Stock actual en números grandes
- Teclado numérico para ingresar cantidad contada
- Botones de ajuste rápido (+1, -1, +10, -10)
- Confirmar y siguiente producto
- Funciona offline (sincroniza al recuperar conexión)

---

## 4. Estrategia de Migración

### Fase 1: Schema de Base de Datos
1. Crear migraciones SQL para todas las tablas nuevas
2. Agregar campos nuevos a tabla `productos`
3. Configurar índices
4. Implementar políticas RLS
5. **Verificación:** Ejecutar migraciones en ambiente de desarrollo

### Fase 2: API de Movimientos
1. Implementar función base de registro de movimientos
2. Implementar cálculo de costo promedio ponderado
3. Implementar obtención de alertas
4. **Verificación:** Tests de creación y consulta de movimientos

### Fase 3: Integración con Ventas
1. Modificar `crearVenta` para generar movimientos
2. Implementar validación de stock
3. Implementar manejo de combos
4. **Verificación:** Crear ventas y verificar descuento de stock

### Fase 4: UI de Consulta
1. Dashboard de inventario con KPIs
2. Lista de inventario con filtros
3. Historial de movimientos
4. **Verificación:** Navegación completa de consulta

### Fase 5: Gestión de Compras
1. ABM de proveedores
2. Formulario de entrada de mercadería
3. Historial de compras
4. **Verificación:** Ciclo completo de compra

### Fase 6: Combos/Kits
1. UI para definir composición de combos
2. Lógica de descuento de componentes
3. **Verificación:** Venta de combo descuenta componentes

---

## 5. Verificación

### Tests Automatizados

No hay suite de tests automatizados configurada. Se recomienda implementar tests para las funciones críticas de cálculo de stock y costos.

### Verificación Manual

#### Flujo de Compra

1. Crear un producto nuevo con stock 0
2. Crear un proveedor nuevo
3. Registrar una compra de 10 unidades a $100 cada una
4. **Verificar:**
   - `stock_actual` del producto = 10
   - Existe registro en `compras` con estado 'RECIBIDA'
   - Existe registro en `compras_detalle`
   - Existe registro en `movimientos_stock` tipo 'COMPRA'
   - `costo` del producto actualizado a $100 (si aplica método último costo)

#### Flujo de Venta

1. Realizar una venta de 3 unidades del producto anterior
2. **Verificar:**
   - `stock_actual` baja a 7
   - Existe registro en `movimientos_stock` tipo 'VENTA'
   - El movimiento está vinculado a la venta

#### Actualización de Costo Promedio

1. Registrar nueva compra de 5 unidades a $120 cada una
2. **Verificar:**
   - Stock = 12 (7 + 5)
   - Costo = $108.33 ((7×100 + 5×120) / 12)

#### Flujo de Ajuste

1. Reportar una rotura de 2 unidades
2. **Verificar:**
   - Stock = 10
   - Existe movimiento tipo 'ROTURA' con cantidad -2
   - El movimiento tiene motivo registrado

#### Alertas de Stock

1. Configurar `stock_minimo` del producto en 15
2. **Verificar:**
   - El producto aparece en alertas de stock bajo
   - El indicador visual en la lista es rojo/crítico

#### Flujo de Combo

1. Crear producto "Kit Limpieza" como combo
2. Agregar componentes: Detergente (2 unidades), Esponja (3 unidades)
3. Vender 1 "Kit Limpieza"
4. **Verificar:**
   - Stock de Detergente disminuye en 2
   - Stock de Esponja disminuye en 3
   - Existen movimientos para cada componente

---

## 6. Consideraciones Adicionales

### Rendimiento

- Implementar paginación en todas las listas
- Cachear cálculos de valorización (invalidar al registrar movimientos)
- Índices recomendados en sección 1.8 para optimizar consultas frecuentes

### Seguridad

- Auditar todos los cambios de stock con usuario y timestamp
- No permitir eliminación de movimientos históricos (solo inserción)
- Restringir acceso a ajustes según rol de usuario

### Escalabilidad

- Diseño preparado para múltiples ubicaciones/depósitos (campo `ubicacion_deposito`)
- Estructura permite agregar manejo de lotes y vencimientos
- API diseñada para soportar integraciones futuras (AFIP, etc.)

### UX

- Feedback inmediato en todas las acciones de stock (toast notifications)
- Confirmaciones para acciones destructivas
- Atajos de teclado para operaciones frecuentes
- Modo offline para auditoría en depósito

### Compliance (Argentina)

- Campos para CUIT de proveedores
- Soporte para CAE en facturas electrónicas
- Tipos de documento A/B/C según normativa AFIP
- Trazabilidad completa para auditorías fiscales
```

**Listo para implementar.** El documento incluye tu estructura original completa + todas las mejoras de integridad referencial, flujos de trabajo (órdenes vs recepciones), auditoría móvil y compliance fiscal argentino.