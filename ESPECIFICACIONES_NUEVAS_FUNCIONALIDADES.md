# ESPECIFICACIONES DE NUEVAS FUNCIONALIDADES - SISTEMA LA FUGA

**Documento:** Requerimientos para Expansión del Sistema  
**Versión:** 2.0  
**Fecha:** 14 de enero de 2026  
**Estado:** Pendiente de implementación

---

## 📋 TABLA DE CONTENIDOS

1. [Mejoras en Gestión de Productos](#1-mejoras-en-gestión-de-productos)
2. [Visualización de Precios por Unidad de Medida](#2-visualización-de-precios-por-unidad-de-medida)
3. [Sistema de Punto de Venta (POS)](#3-sistema-de-punto-de-venta-pos)
4. [Gestión de Precios en Boletas](#4-gestión-de-precios-en-boletas)
5. [Modelo de Datos Actualizado](#5-modelo-de-datos-actualizado)
6. [Flujos de Trabajo](#6-flujos-de-trabajo)
7. [Validaciones y Reglas de Negocio](#7-validaciones-y-reglas-de-negocio)

---

## 1. MEJORAS EN GESTIÓN DE PRODUCTOS

### 1.1 Agregar Descripción de Productos

#### Objetivo
Permitir agregar información detallada sobre cada producto para facilitar la identificación, aclaraciones importantes, y descripción de características.

#### Requisitos Funcionales

**Campo DESCRIPCION:**
- Debe ser un campo de texto largo (hasta 2000 caracteres)
- Opcional - puede estar vacío
- Debe permitir múltiples líneas de texto
- Se debe poder editar en cualquier momento

**Casos de Uso:**
- Especificar contenido del producto (ejemplo: "Contiene 12 unidades")
- Agregar instrucciones de uso (ejemplo: "Diluir en 5 litros de agua")
- Aclaraciones importantes (ejemplo: "No apto para menores de 3 años")
- Información de composición (ejemplo: "Ingredientes: harina, azúcar, sal")
- Notas internas (ejemplo: "Proveedor exclusivo - no cambiar")

**Dónde se debe mostrar:**
- En la pantalla de detalle del producto (expandible)
- En la ventana de edición de producto
- Opcionalmente en el POS al seleccionar el producto (tooltip o panel lateral)
- En las etiquetas impresas (si aplica)

**Interfaz de Usuario:**
```
┌─────────────────────────────────────────────────┐
│  EDITAR PRODUCTO - DUX-0001                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  Código SKU: [DUX-0001        ]                 │
│  Nombre:     [Accesorio Invisible X 12      ]   │
│  Categoría:  [DUX            ▼]                 │
│                                                  │
│  Descripción:                                   │
│  ┌────────────────────────────────────────┐    │
│  │ Pack de 12 accesorios invisibles       │    │
│  │ Material: Plástico resistente          │    │
│  │ Uso: Baño y cocina                     │    │
│  │ Instalación: Autoadhesivo              │    │
│  │                                         │    │
│  │ [500/2000 caracteres]                   │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  [Guardar]  [Cancelar]                          │
└─────────────────────────────────────────────────┘
```

---

### 1.2 Borrar Productos

#### Objetivo
Permitir eliminar productos del sistema de manera segura y controlada.

#### Requisitos Funcionales

**Tipos de Eliminación:**

**A) Eliminación Lógica (RECOMENDADO):**
- No borrar físicamente del sistema
- Cambiar estado del producto a "INACTIVO" o "ELIMINADO"
- El producto desaparece de las búsquedas normales
- Se mantiene el historial de ventas
- Se puede restaurar si es necesario

**B) Eliminación Física (SOLO CASOS ESPECIALES):**
- Borrar completamente de la base de datos
- Solo permitir si el producto NO tiene:
  - Ventas registradas
  - Movimientos de stock
  - Referencias en boletas
- Requerir confirmación especial del administrador

**Validaciones Antes de Borrar:**
1. Verificar que el producto no esté en ninguna boleta pendiente
2. Verificar que no tenga stock actual > 0
3. Mostrar advertencia si tiene historial de ventas
4. Requiere confirmación doble

**Proceso de Eliminación:**

```
Usuario hace clic en "Eliminar Producto"
  ↓
Sistema verifica condiciones:
  - ¿Tiene ventas registradas? → Advertencia
  - ¿Tiene stock actual? → Advertencia
  - ¿Está en boletas pendientes? → Bloquear
  ↓
Mostrar modal de confirmación:
  "¿Está seguro de eliminar este producto?"
  "Producto: [Nombre]"
  "Código: [SKU]"
  
  ⚠️ Advertencias:
  - Este producto tiene 45 ventas registradas
  - Stock actual: 12 unidades
  
  Opciones:
  [ ] Marcar como inactivo (recomendado)
  [ ] Eliminar permanentemente
  
  [Cancelar]  [Confirmar Eliminación]
  ↓
Si confirma:
  - Eliminación lógica: UPDATE estado = 'ELIMINADO'
  - Eliminación física: DELETE FROM productos
  ↓
Mostrar mensaje de confirmación
Registrar en log de auditoría
```

**Permisos:**
- Vendedor: NO puede eliminar productos
- Administrador: Puede marcar como inactivo
- Gerente: Puede eliminar físicamente (con restricciones)

**Interfaz de Confirmación:**
```
┌─────────────────────────────────────────────────┐
│  ⚠️  CONFIRMAR ELIMINACIÓN DE PRODUCTO           │
├─────────────────────────────────────────────────┤
│                                                  │
│  Producto: Accesorio Invisible X 12             │
│  Código: DUX-0001                               │
│                                                  │
│  ⚠️ ADVERTENCIAS:                                │
│  • Este producto tiene 127 ventas registradas   │
│  • Stock actual: 45 unidades                    │
│  • Última venta: hace 2 días                    │
│                                                  │
│  ¿Qué desea hacer?                              │
│                                                  │
│  ○ Marcar como INACTIVO (recomendado)          │
│     El producto se ocultará pero se mantendrá   │
│     el historial de ventas                      │
│                                                  │
│  ○ ELIMINAR PERMANENTEMENTE                     │
│     ⚠️ Esta acción NO se puede deshacer         │
│     Se perderá el historial                     │
│                                                  │
│  Motivo (opcional):                             │
│  [Producto descontinuado                    ]   │
│                                                  │
│            [Cancelar]  [Confirmar]              │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Restaurar Productos Eliminados:**
```
Menú: Administración → Productos Eliminados
  ↓
Lista de productos con estado = 'ELIMINADO'
  ↓
Botón "Restaurar" en cada producto
  ↓
Cambiar estado a 'ACTIVO'
```

---

### 1.3 Agregar Nuevos Productos

#### Objetivo
Permitir dar de alta productos nuevos en el sistema de forma rápida y completa.

#### Requisitos Funcionales

**Información Mínima Requerida:**
- Código SKU (único, autogenerado o manual)
- Nombre del producto
- Categoría

**Información Opcional pero Recomendada:**
- Descripción
- Costo
- Precio Mayor
- Precio Menor
- Unidad de medida
- Código de barras
- Stock inicial

**Generación Automática de Código SKU:**
```
Sistema sugiere código basado en categoría:
- Usuario selecciona categoría "ALMACEN"
  ↓
- Sistema busca el último SKU de esa categoría: ALM-0167
  ↓
- Sistema sugiere: ALM-0168
  ↓
- Usuario puede aceptar o modificar manualmente
```

**Proceso de Alta de Producto:**

```
Usuario hace clic en "Nuevo Producto"
  ↓
Formulario de alta con 2 modos:
  
  MODO 1: Alta Rápida (solo campos esenciales)
  - Código SKU [autogenerado]
  - Nombre
  - Categoría
  - Precio Menor
  [Guardar y Cerrar] [Guardar y Editar Completo]
  
  MODO 2: Alta Completa (todos los campos)
  - Todos los campos del producto
  [Guardar]
  ↓
Validaciones:
  - SKU único (no existe en BD)
  - Nombre no vacío
  - Precios válidos (>= 0)
  - Precio Mayor <= Precio Menor (advertencia)
  ↓
Si validaciones OK:
  - INSERT INTO productos
  - Calcular márgenes automáticamente
  - Mostrar confirmación
  - Opción: "Agregar otro producto" o "Ver producto creado"
```

**Formulario de Alta:**
```
┌─────────────────────────────────────────────────┐
│  NUEVO PRODUCTO                [Modo: Completo▼]│
├─────────────────────────────────────────────────┤
│                                                  │
│  Código SKU: [ALM-0168  ] 🔄 [Autogenerar]     │
│  Nombre:     [                              ] * │
│  Categoría:  [ALMACEN                       ▼]* │
│                                                  │
│  Descripción:                                   │
│  ┌────────────────────────────────────────┐    │
│  │                                         │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  ┌─ COSTOS Y PRECIOS ────────────────────┐    │
│  │ Costo:         [$          ]           │    │
│  │ Precio Mayor:  [$          ]           │    │
│  │ Margen Mayor:  [auto] %                │    │
│  │ Precio Menor:  [$          ]           │    │
│  │ Margen Menor:  [auto] %                │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  ┌─ OTROS DATOS ─────────────────────────┐    │
│  │ Unidad:        [Unidad            ▼]   │    │
│  │ Código Barra:  [                   ]   │    │
│  │ Stock Inicial: [0                  ]   │    │
│  │ Stock Mínimo:  [0                  ]   │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  * Campos obligatorios                          │
│                                                  │
│     [Cancelar]  [Guardar]  [Guardar y Nuevo]   │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Cálculo Automático de Márgenes:**
Cuando el usuario ingresa COSTO y PRECIO, el sistema debe:
1. Calcular margen automáticamente: `(Precio - Costo) / Costo × 100`
2. Mostrar el margen en tiempo real mientras escribe
3. Colorear según rentabilidad (verde/amarillo/rojo)

**Validación en Tiempo Real:**
```
Usuario escribe en campo "Código SKU": ALM-0050
  ↓
Sistema verifica (después de 500ms):
  - ¿Ya existe? → Mostrar mensaje: "⚠️ Este código ya existe"
  - ¿Formato correcto? → Validar patrón
  ↓
Mostrar ✓ o ✗ junto al campo
```

**Importación Masiva de Productos:**
Permitir agregar múltiples productos desde Excel:
```
Menú: Productos → Importar desde Excel
  ↓
Subir archivo con columnas:
  - CODIGO (obligatorio)
  - NOMBRE (obligatorio)
  - CATEGORIA (obligatorio)
  - DESCRIPCION
  - COSTO
  - PRECIO_MAYOR
  - PRECIO_MENOR
  - etc.
  ↓
Vista previa de importación:
  - Mostrar productos a importar
  - Marcar conflictos (SKU duplicado)
  - Permitir editar antes de confirmar
  ↓
Importar en batch
  ↓
Reporte: X productos importados, Y errores
```

---

### 1.4 Edición Completa de Productos

#### Objetivo
Permitir modificar cualquier campo de un producto existente.

#### Requisitos Funcionales

**Campos Editables:**
- ✅ Nombre del producto
- ✅ Descripción
- ✅ Categoría
- ✅ Costo
- ✅ Precio Mayor
- ✅ Precio Menor
- ✅ Unidad de medida
- ✅ Código de barras
- ✅ Estado (activo/inactivo)
- ❌ Código SKU (NO editable - es clave primaria)
- ❌ ID interno (NO editable)

**Cambio de Código SKU:**
Si es absolutamente necesario cambiar el SKU:
1. Crear nuevo producto con nuevo SKU
2. Marcar producto antiguo como inactivo
3. Transferir historial (opcional)
4. Documentar el cambio

**Historial de Cambios:**
Cada vez que se edita un producto, registrar:
- ¿Qué campo cambió?
- Valor anterior
- Valor nuevo
- ¿Quién lo cambió?
- ¿Cuándo?
- Motivo del cambio (opcional)

**Formulario de Edición:**
Debe ser idéntico al formulario de alta, pero:
- Campos pre-llenados con valores actuales
- Código SKU deshabilitado (solo lectura)
- Mostrar fecha de última actualización
- Botón "Ver Historial de Cambios"

**Edición Rápida desde Lista:**
```
En la lista de productos:
  ↓
Doble clic en una celda (ej: Precio Menor)
  ↓
Se habilita edición inline
  ↓
Usuario modifica valor
  ↓
Al salir del campo o presionar Enter:
  - Validar
  - Guardar automáticamente
  - Mostrar confirmación visual
```

**Edición Masiva:**
Permitir seleccionar múltiples productos y:
- Cambiar categoría a todos
- Aplicar mismo descuento
- Actualizar estado (activar/desactivar varios)
- Cambiar unidad de medida

---

## 2. VISUALIZACIÓN DE PRECIOS POR UNIDAD DE MEDIDA

### 2.1 Alimentos para Mascotas - Precio por Kilogramo

#### Objetivo
Mostrar automáticamente el precio por kilogramo en productos de la categoría MASCOTAS que se venden por peso.

#### Requisitos Funcionales

**Detección Automática:**
- Si producto pertenece a categoría "MASCOTAS"
- Y la unidad de medida contiene "kg" o "kilogramo"
- Entonces mostrar precio por kilo

**Cálculo del Precio por Kilo:**
```
Ejemplo:
Producto: KONGO GOLD ADULTO 21kg
Precio Menor: $59,000
Peso: 21 kg

Precio por kilo = $59,000 / 21 = $2,809.52 por kg
```

**Datos Necesarios:**
- Campo adicional: `peso_neto` (decimal, en kg)
- O parsearlo de la unidad de medida: "21 kg" → extraer 21

**Visualización en Interfaz:**

**En Lista de Productos:**
```
┌────────────────────────────────────────────────┐
│ KONGO GOLD ADULTO                              │
│ Código: KOGO-0001                              │
│                                                 │
│ 💵 Bolsa (21kg): $59,000                       │
│ 📊 Precio x kg: $2,809.52                      │
│                                                 │
│ En stock: 15 bolsas                            │
└────────────────────────────────────────────────┘
```

**En POS:**
```
Producto escaneado: KONGO GOLD ADULTO
  
Precio bolsa (21kg): $59,000
Precio por kg: $2,809.52
  
¿Vender bolsa completa o fraccionado?
  [ Bolsa Completa (21kg) - $59,000 ]
  [ Fraccionado ]
    Cantidad en kg: [___] kg
    Total: $____
```

**Venta Fraccionada:**
Si el negocio vende alimento suelto por kilo:
```
Cliente quiere 5kg de KONGO GOLD ADULTO
  
Cálculo:
5 kg × $2,809.52/kg = $14,047.60

Agregar a boleta:
KONGO GOLD ADULTO - 5kg
$14,047.60
```

**En Etiqueta de Precio:**
```
┌─────────────────────┐
│  KONGO GOLD ADULTO  │
│                      │
│  Bolsa 21kg          │
│  $ 59,000            │
│                      │
│  $ 2,810 x kg        │
│                      │
│  7891234567890       │
└─────────────────────┘
```

**Configuración:**
```
Permitir configurar en:
  Administración → Configuración → Precios
  
  ☑ Mostrar precio por kg en alimentos mascotas
  ☑ Permitir venta fraccionada
  ☐ Redondear precio por kg a: [10] pesos
```

---

### 2.2 Productos Sueltos - Precio por Litro

#### Objetivo
Mostrar el precio por litro en productos de categorías QUIMICA, SUELTOS que se venden a granel o fraccionados.

#### Requisitos Funcionales

**Detección Automática:**
- Si producto pertenece a categorías "SUELTOS", "QUIMICA", "SUELTOS - QUIMICA"
- Y la unidad de medida contiene "L", "lt", "litro"
- Entonces mostrar precio por litro

**Cálculo del Precio por Litro:**
```
Ejemplo:
Producto: ALCOHOL EN GEL 5L
Precio Menor: $12,500
Volumen: 5 litros

Precio por litro = $12,500 / 5 = $2,500 por litro
```

**Venta por Litro:**
```
Cliente trae su propio envase y quiere 2 litros

Cálculo:
2 L × $2,500/L = $5,000

Agregar a boleta:
ALCOHOL EN GEL - 2L (suelto)
$5,000
```

**Visualización Similar a Mascotas:**
```
┌────────────────────────────────────────────────┐
│ ALCOHOL EN GEL                                 │
│ Código: ALEN-0001                              │
│                                                 │
│ 💵 Bidón 5L: $12,500                           │
│ 📊 Precio x litro: $2,500                      │
│                                                 │
│ ☑ Venta fraccionada disponible                │
└────────────────────────────────────────────────┘
```

**En POS para Producto Suelto:**
```
┌─────────────────────────────────────────────┐
│  ALCOHOL EN GEL                             │
├─────────────────────────────────────────────┤
│                                              │
│  Opciones de venta:                         │
│                                              │
│  ○ Bidón completo (5L) -------- $12,500    │
│  ○ Litro (1L) ----------------- $2,500     │
│  ● Fraccionado                              │
│                                              │
│    Cantidad: [2.5  ] litros                 │
│    Total: $6,250                            │
│                                              │
│         [Cancelar]  [Agregar a Boleta]      │
│                                              │
└─────────────────────────────────────────────┘
```

**Manejo de Stock para Productos Sueltos:**
```
Si se venden 2.5 litros de un bidón de 5L:
  
  Stock ANTES: 3 bidones (15L totales)
  Venta: 2.5L
  Stock DESPUÉS: 2.5 bidones (12.5L totales)
  
Mostrar stock como:
  "2 bidones + 2.5L sueltos"
  o
  "12.5 litros disponibles (2 bidones + suelto)"
```

---

### 2.3 Configuración General de Unidades

#### Objetivo
Permitir configurar cómo se muestran y calculan los precios según la unidad de medida.

#### Unidades de Medida Soportadas

**Peso:**
- Kilogramo (kg)
- Gramo (g)
- Tonelada (ton)

**Volumen:**
- Litro (L)
- Mililitro (ml)
- Galón

**Cantidad:**
- Unidad
- Pack (especificar cantidad)
- Caja (especificar cantidad)
- Docena
- Metro
- Metro cuadrado
- Metro cúbico

**Configuración por Unidad:**
```
┌─────────────────────────────────────────────┐
│  CONFIGURACIÓN DE UNIDADES DE MEDIDA        │
├─────────────────────────────────────────────┤
│                                              │
│  Kilogramo (kg)                             │
│  ☑ Mostrar precio unitario ($/kg)           │
│  ☑ Permitir venta fraccionada               │
│  Decimales: [2 ▼]                           │
│  Aplicar a categorías: [MASCOTAS ▼]         │
│                                              │
│  Litro (L)                                  │
│  ☑ Mostrar precio unitario ($/L)            │
│  ☑ Permitir venta fraccionada               │
│  Decimales: [2 ▼]                           │
│  Aplicar a categorías: [QUIMICA, SUELTOS ▼] │
│                                              │
│  Unidad                                     │
│  ☐ Mostrar precio unitario                  │
│  ☐ Permitir venta fraccionada               │
│                                              │
│  [Guardar Configuración]                    │
│                                              │
└─────────────────────────────────────────────┘
```

---

## 3. SISTEMA DE PUNTO DE VENTA (POS)

### 3.1 Gestión de Productos desde POS

#### Objetivo
Permitir que desde la pantalla de POS se puedan realizar acciones sobre productos sin salir del flujo de venta.

#### Requisitos Funcionales

**Acciones Disponibles desde POS:**

**1. Consulta Rápida de Producto:**
```
Durante una venta, vendedor escanea/busca producto
  ↓
Se muestra información completa:
  - Nombre
  - Código SKU
  - Precios (Mayor/Menor)
  - Stock disponible
  - Descripción (expandible)
  - Última actualización
  
Botones de acción rápida:
  [Ver Detalle Completo]
  [Editar Producto]
  [Ajustar Stock]
```

**2. Editar Producto desde POS:**
```
Vendedor está en POS → busca producto → clic "Editar"
  ↓
Abre modal/panel lateral con formulario de edición
  ↓
Campos editables:
  - Nombre
  - Descripción
  - Precios (Mayor/Menor/Costo)
  - Stock
  - Estado
  ↓
Guardar cambios SIN salir del POS
  ↓
Volver a la venta con información actualizada
```

**Interfaz de Edición Rápida en POS:**
```
┌─────────────────────────────────────────────────────┐
│  EDICIÓN RÁPIDA - Durante Venta         [Minimizar]│
├─────────────────────────────────────────────────────┤
│                                                      │
│  Producto: ACCESORIO INVISIBLE X 12                 │
│  Código: DUX-0001 (no editable)                     │
│                                                      │
│  ┌─ PRECIOS ──────────────────────────────────┐    │
│  │ Costo:         $ [   610.00  ]             │    │
│  │ Precio Mayor:  $ [   750.00  ] (23% ⬆)    │    │
│  │ Precio Menor:  $ [ 1,000.00  ] (64% ⬆)    │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  ┌─ STOCK ───────────────────────────────────┐    │
│  │ Disponible: [45  ] unidades                │    │
│  │ Mínimo:     [10  ] unidades                │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  Descripción:                                       │
│  [Pack de 12 accesorios autoadhesivos...       ]   │
│                                                      │
│  ☑ Aplicar cambios inmediatamente                   │
│                                                      │
│       [Cancelar]  [Guardar]  [Guardar y Cerrar]    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**3. Crear Producto sobre la Marcha:**
```
Vendedor escanea código de barras nuevo (no existe en BD)
  ↓
Sistema: "Producto no encontrado. ¿Desea crearlo?"
  [Cancelar]  [Crear Producto]
  ↓
Modal de creación rápida:
  - Código de barras (prellenado)
  - Nombre *
  - Categoría *
  - Precio Menor *
  [Crear y Agregar a Venta]
  ↓
Producto creado y agregado a boleta actual
```

**4. Ajuste de Stock desde POS:**
```
Vendedor nota que el stock es incorrecto
  ↓
En detalle del producto: botón "Ajustar Stock"
  ↓
Modal:
  Stock actual: 45 unidades
  Nuevo stock: [___] unidades
  Motivo: [Inventario ▼]
    - Inventario
    - Pérdida
    - Devolución
    - Corrección
  [Guardar]
  ↓
Actualizar stock
Registrar movimiento en historial
```

**Permisos desde POS:**
- **Vendedor:**
  - Ver productos: ✅
  - Editar precios: ❌
  - Ajustar stock: ❌
  - Crear productos: ❌

- **Administrador:**
  - Ver productos: ✅
  - Editar precios: ✅
  - Ajustar stock: ✅
  - Crear productos: ✅

- **Gerente:**
  - Todas las acciones: ✅

**Validaciones:**
- No permitir editar productos que estén en boletas abiertas de otros vendedores
- Confirmar cambios de precio mayores al 20%
- Alertar si se baja precio por debajo del costo

---

### 3.2 Pantalla Principal de POS

#### Estructura General

```
┌─────────────────────────────────────────────────────────────┐
│  LA FUGA - PUNTO DE VENTA          Usuario: Juan  [Cerrar] │
├────────────────────┬────────────────────────────────────────┤
│                    │                                         │
│  BÚSQUEDA          │         BOLETA ACTUAL                  │
│                    │                                         │
│  🔍 [          ]   │  Cliente: Público General         [📝] │
│                    │  ───────────────────────────────────── │
│  Resultados:       │                                         │
│  ┌──────────────┐ │  1. Accesorio Invisible X 12           │
│  │ DUX-0001     │ │     1 un. × $1,000 ........ $1,000    │
│  │ Accesorio... │ │     [×] [✏️] [+] [-]                   │
│  │ $1,000       │ │                                         │
│  └──────────────┘ │  2. Alcohol en Gel 5L                  │
│                    │     2.5 L × $2,500 ...... $6,250      │
│  [+ Nuevo]         │     [×] [✏️] [+] [-]                   │
│                    │                                         │
│  CATEGORÍAS:       │  ───────────────────────────────────── │
│  • DUX             │  Subtotal:        $7,250               │
│  • Mascotas        │  Descuento:       -$250 (3.4%)        │
│  • Almacén         │                                         │
│  • Librería        │  TOTAL:           $7,000               │
│  • Química         │  ═══════════════════════════════════  │
│  • Bazar           │                                         │
│                    │  [Aplicar Desc.] [💵 Cobrar]          │
│                    │  [Guardar]       [❌ Cancelar]         │
├────────────────────┴────────────────────────────────────────┤
│  F2: Buscar  F3: Cliente  F4: Descuento  F5: Cobrar       │
└─────────────────────────────────────────────────────────────┘
```

#### Funcionalidades del POS

**Búsqueda de Productos:**
- Por código SKU (exacto)
- Por nombre (parcial, búsqueda difusa)
- Por código de barras (con escáner)
- Por categoría (filtro lateral)

**Agregar Producto a Boleta:**
```
Usuario selecciona producto
  ↓
Opciones:
  - Cantidad: [___]
  - Precio: [$___] (editable si tiene permiso)
  - ¿Mayor o Menor? [Menor ▼]
  ↓
[Agregar]
  ↓
Producto agregado a la boleta
Actualizar totales automáticamente
```

**Modificar Línea de Boleta:**
- **+/-:** Aumentar/disminuir cantidad
- **✏️:** Editar cantidad o precio específico de esta línea
- **×:** Eliminar línea de la boleta

---

## 4. GESTIÓN DE PRECIOS EN BOLETAS

### 4.1 Modificación de Precios por Boleta

#### Objetivo
Permitir aplicar precios especiales, descuentos o promociones a nivel de boleta individual sin afectar los precios maestros en la base de datos.

#### Requisitos Funcionales

**Principio Fundamental:**
> Los precios modificados en una boleta son **específicos de esa venta** y **NO modifican** los precios en la base de datos de productos.

**Tipos de Modificación de Precio:**

**A) Descuento a Nivel de Producto:**
```
Vendedor agrega producto a boleta:
  Producto: Accesorio Invisible X 12
  Precio original: $1,000
  
Vendedor hace clic en "Editar Precio" en esa línea:
  ↓
Modal:
  Precio original:    $1,000
  Nuevo precio:       [$ 850   ]
  Descuento:          $150 (15%)
  
  Motivo (opcional):  [Cliente frecuente         ]
  
  [Cancelar] [Aplicar a esta línea]
  ↓
Boleta muestra:
  Accesorio Invisible X 12
  $1,000 → $850 (-15%)
  1 × $850 = $850
```

**B) Descuento Porcentual a Toda la Boleta:**
```
Vendedor hace clic en "Aplicar Descuento" 
  ↓
Modal:
  Subtotal actual: $7,250
  
  Tipo de descuento:
  ● Porcentaje: [10  ] %
  ○ Monto fijo: $[___]
  
  Nuevo total: $6,525
  Ahorro: $725
  
  Aplicar a:
  ● Todos los productos
  ○ Solo productos seleccionados
  
  Motivo: [Promoción del día ▼]
  
  [Cancelar] [Aplicar]
  ↓
Cada línea de la boleta muestra descuento prorrateado:
  Producto A: $1,000 → $900
  Producto B: $6,250 → $5,625
  Total: $7,250 → $6,525
```

**C) Precio Especial para Cliente Específico:**
```
Vendedor selecciona cliente:
  Cliente: Ferretería González (mayorista)
  ↓
Sistema detecta: "Este cliente tiene precios especiales"
  ↓
Al agregar productos:
  - Aplicar automáticamente precio MAYOR
  - O precio especial guardado para ese cliente
  ↓
Boleta muestra:
  Accesorio Invisible X 12
  Precio Menor: $1,000
  Precio para este cliente: $750 (Mayor)
```

**D) Promoción 2×1, 3×2, etc:**
```
Vendedor agrega 3 unidades de un producto en promoción
  ↓
Sistema detecta promoción activa
  ↓
Modal:
  "Promoción 3×2 activa para este producto"
  Cantidad: 3 unidades
  Pagas: 2 unidades
  Ahorras: $1,000
  
  [Aplicar Promoción]
  ↓
Boleta muestra:
  Accesorio Invisible X 12 - 3 unidades
  3 × $1,000 = $3,000
  Promo 3×2: -$1,000
  Total línea: $2,000
```

---

### 4.2 Interfaz de Modificación de Precios

#### Modal de Edición de Precio por Línea

```
┌─────────────────────────────────────────────────┐
│  EDITAR PRECIO - Línea #1                       │
├─────────────────────────────────────────────────┤
│                                                  │
│  Producto: Accesorio Invisible X 12             │
│  Código: DUX-0001                               │
│                                                  │
│  ┌─ PRECIO ORIGINAL ──────────────────────┐    │
│  │ Precio Menor (lista): $1,000.00        │    │
│  │ Precio Mayor (lista): $750.00          │    │
│  │ Costo: $610.00                         │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  ┌─ NUEVO PRECIO PARA ESTA VENTA ────────┐    │
│  │                                         │    │
│  │ Tipo de ajuste:                        │    │
│  │ ○ Precio fijo: $[850.00  ]            │    │
│  │ ● Descuento %: [15      ] %           │    │
│  │ ○ Descuento $: $[       ]             │    │
│  │                                         │    │
│  │ Precio final: $850.00                  │    │
│  │ Descuento: -$150.00 (15%)              │    │
│  │                                         │    │
│  │ ⚠️ Margen: 39.3% (antes: 63.9%)        │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  Motivo (obligatorio para desc. >10%):          │
│  [Cliente frecuente - compra volumen        ]   │
│                                                  │
│  Autorizado por: [Admin ▼] (si desc. >20%)     │
│                                                  │
│         [Cancelar]  [Aplicar a Esta Línea]      │
│                                                  │
└─────────────────────────────────────────────────┘
```

#### Modal de Descuento Global

```
┌─────────────────────────────────────────────────┐
│  APLICAR DESCUENTO A LA BOLETA                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  Subtotal actual: $7,250.00                     │
│                                                  │
│  ┌─ TIPO DE DESCUENTO ────────────────────┐    │
│  │                                          │    │
│  │ ● Porcentaje                            │    │
│  │   [10  ] % → Descuento: $725.00        │    │
│  │                                          │    │
│  │ ○ Monto fijo                            │    │
│  │   $[___] → Descuento: $____            │    │
│  │                                          │    │
│  │ ○ Precio final deseado                  │    │
│  │   Total final: $[___]                   │    │
│  │   Calcular descuento automáticamente    │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌─ APLICAR A ─────────────────────────────┐    │
│  │ ● Toda la boleta                        │    │
│  │ ○ Solo productos seleccionados:         │    │
│  │   [_] Línea 1: Accesorio Invisible      │    │
│  │   [_] Línea 2: Alcohol en Gel           │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Motivo:                                        │
│  [Promoción del mes                         ▼] │
│    - Promoción del mes                          │
│    - Cliente frecuente                          │
│    - Compra por volumen                         │
│    - Liquidación                                │
│    - Cortesía                                   │
│    - Otro (especificar)                         │
│                                                  │
│  ═══════════════════════════════════════════   │
│  Total antes:    $7,250.00                      │
│  Descuento:      -$725.00                       │
│  TOTAL FINAL:    $6,525.00                      │
│  ═══════════════════════════════════════════   │
│                                                  │
│              [Cancelar]  [Aplicar]              │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

### 4.3 Reglas de Negocio para Descuentos

#### Límites y Autorizaciones

**Niveles de Autorización según Descuento:**

```
Descuento      | Puede Aplicar         | Requiere
─────────────────────────────────────────────────
0% - 10%       | Vendedor              | Motivo
10% - 20%      | Vendedor              | Motivo + Supervisor
20% - 30%      | Administrador         | Motivo + Autorización
30% - 50%      | Gerente               | Motivo + Justificación
> 50%          | Gerente + Aprobación  | Motivo + Caso especial
```

**Validaciones Automáticas:**

**1. Precio por Debajo del Costo:**
```
Vendedor intenta aplicar precio de $500
Costo del producto: $610
  ↓
Sistema alerta:
  "⚠️ ADVERTENCIA: Precio por debajo del costo"
  "Precio propuesto: $500"
  "Costo: $610"
  "Pérdida: -$110 (18%)"
  
  "¿Desea continuar?"
  [No] [Sí, continuar] (solo gerente puede confirmar)
```

**2. Descuento Excesivo:**
```
Vendedor aplica 35% de descuento
Su nivel de autorización: hasta 20%
  ↓
Sistema:
  "⚠️ Requiere autorización de Gerente"
  
  Notificación a gerente:
    "Juan solicita autorizar descuento de 35%"
    Cliente: Ferretería González
    Total venta: $6,525
    Motivo: Compra por volumen
    
    [Rechazar] [Autorizar]
```

**3. Descuento sobre Producto en Promoción:**
```
Producto ya tiene promoción activa (3×2)
Vendedor intenta aplicar descuento adicional
  ↓
Sistema:
  "Este producto ya tiene promoción 3×2"
  "¿Desea reemplazar la promoción con el descuento?"
  
  Opción A: Mantener 3×2 (descuento $1,000)
  Opción B: Aplicar 15% (descuento $450)
  
  [Mantener Promoción] [Aplicar Descuento]
```

---

### 4.4 Visualización de Precios Modificados

#### En la Boleta (Pantalla)

```
┌─────────────────────────────────────────────┐
│  BOLETA #1234                              │
│  Cliente: Ferretería González              │
├─────────────────────────────────────────────┤
│                                              │
│ 1. Accesorio Invisible X 12                 │
│    Precio lista: $1,000                     │
│    Precio especial: $850 (-15%) 💰         │
│    1 × $850 = $850                          │
│    Motivo: Cliente frecuente                │
│    [×] [✏️] [+] [-]                         │
│                                              │
│ 2. Alcohol en Gel 5L                        │
│    Precio lista: $12,500                    │
│    Promo 3×2: Llevas 3, pagas 2 🎁         │
│    3 × $12,500 = $37,500                    │
│    Descuento promo: -$12,500                │
│    Subtotal: $25,000                        │
│    [×] [✏️] [+] [-]                         │
│                                              │
│─────────────────────────────────────────────│
│ Subtotal:              $25,850              │
│ Desc. global (10%):    -$2,585 💰          │
│ ─────────────────────────────────────────  │
│ TOTAL:                 $23,265              │
│ ═════════════════════════════════════════  │
│                                              │
│ Ahorro total: $15,085 (39.3%)               │
│                                              │
│ [Aplicar Desc.] [💵 Cobrar]                │
└─────────────────────────────────────────────┘
```

#### En el Ticket Impreso

```
════════════════════════════════════════
         LA FUGA
    Av. Principal 123
    Tel: 123-4567
════════════════════════════════════════

Fecha: 14/01/2026  15:30
Boleta: #1234
Vendedor: Juan
Cliente: Ferretería González

────────────────────────────────────────
1. Accesorio Invisible X 12
   1 × $850.00 ................ $850.00
   (Precio lista: $1,000.00)
   Desc. cliente frecuente: -15%

2. Alcohol en Gel 5L
   3 × $12,500.00 ........... $37,500.00
   Promo 3×2 ................-$12,500.00
   Subtotal: ................. $25,000.00

────────────────────────────────────────
Subtotal:                     $25,850.00
Descuento adicional (10%):     -$2,585.00
────────────────────────────────────────
TOTAL A PAGAR:                $23,265.00
════════════════════════════════════════

AHORRO TOTAL: $15,085.00 (39.3%)

¡Gracias por su compra!
════════════════════════════════════════
```

---

### 4.5 Almacenamiento y Trazabilidad

#### Estructura de Datos para Boletas

**Tabla: boletas**
```sql
CREATE TABLE boletas (
    id_boleta INTEGER PRIMARY KEY,
    numero_boleta VARCHAR(20) UNIQUE,
    fecha_hora TIMESTAMP,
    id_vendedor INTEGER,
    id_cliente INTEGER,
    subtotal DECIMAL(10,2),
    descuento_global DECIMAL(10,2),
    descuento_global_porcentaje DECIMAL(5,2),
    descuento_global_motivo VARCHAR(255),
    total DECIMAL(10,2),
    estado ENUM('pendiente', 'pagada', 'anulada'),
    metodo_pago VARCHAR(50),
    observaciones TEXT
);
```

**Tabla: lineas_boleta**
```sql
CREATE TABLE lineas_boleta (
    id_linea INTEGER PRIMARY KEY,
    id_boleta INTEGER,
    id_producto INTEGER,
    codigo_sku VARCHAR(20),
    nombre_producto VARCHAR(255),
    cantidad DECIMAL(10,3),
    unidad VARCHAR(50),
    
    -- PRECIOS ORIGINALES (de la BD)
    precio_lista_menor DECIMAL(10,2),
    precio_lista_mayor DECIMAL(10,2),
    costo_unitario DECIMAL(10,2),
    
    -- PRECIO APLICADO EN ESTA VENTA
    precio_unitario_venta DECIMAL(10,2),
    descuento_linea DECIMAL(10,2),
    descuento_linea_porcentaje DECIMAL(5,2),
    motivo_descuento VARCHAR(255),
    
    -- TOTALES
    subtotal_linea DECIMAL(10,2),
    
    -- PROMOCIONES
    id_promocion INTEGER,
    descripcion_promocion VARCHAR(255),
    
    FOREIGN KEY (id_boleta) REFERENCES boletas(id_boleta),
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
);
```

**Ejemplo de Registro:**
```json
{
  "boleta": {
    "id_boleta": 1234,
    "numero_boleta": "B-2026-001234",
    "fecha_hora": "2026-01-14 15:30:00",
    "vendedor": "Juan Pérez",
    "cliente": "Ferretería González",
    "subtotal": 25850.00,
    "descuento_global": 2585.00,
    "descuento_global_porcentaje": 10,
    "descuento_global_motivo": "Compra por volumen",
    "total": 23265.00,
    "estado": "pagada"
  },
  "lineas": [
    {
      "producto": "Accesorio Invisible X 12",
      "codigo_sku": "DUX-0001",
      "cantidad": 1,
      "precio_lista_menor": 1000.00,
      "precio_unitario_venta": 850.00,
      "descuento_linea": 150.00,
      "descuento_linea_porcentaje": 15,
      "motivo_descuento": "Cliente frecuente",
      "subtotal_linea": 850.00
    },
    {
      "producto": "Alcohol en Gel 5L",
      "codigo_sku": "ALEN-0001",
      "cantidad": 3,
      "precio_lista_menor": 12500.00,
      "precio_unitario_venta": 8333.33,
      "id_promocion": 5,
      "descripcion_promocion": "3x2 en productos de limpieza",
      "subtotal_linea": 25000.00
    }
  ]
}
```

#### Consultas de Auditoría

**Historial de descuentos por vendedor:**
```sql
SELECT 
    vendedor,
    COUNT(*) as cantidad_boletas,
    SUM(descuento_global) as total_descuentos,
    AVG(descuento_global_porcentaje) as promedio_descuento
FROM boletas
WHERE fecha_hora >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY vendedor;
```

**Productos con más descuentos aplicados:**
```sql
SELECT 
    p.codigo_sku,
    p.nombre_producto,
    COUNT(*) as veces_con_descuento,
    AVG(lb.descuento_linea_porcentaje) as descuento_promedio,
    SUM(lb.descuento_linea) as total_descuentos
FROM lineas_boleta lb
JOIN productos p ON lb.id_producto = p.id_producto
WHERE lb.descuento_linea > 0
GROUP BY p.codigo_sku, p.nombre_producto
ORDER BY veces_con_descuento DESC
LIMIT 20;
```

**Ventas por debajo del costo:**
```sql
SELECT 
    b.numero_boleta,
    b.fecha_hora,
    lb.codigo_sku,
    lb.nombre_producto,
    lb.costo_unitario,
    lb.precio_unitario_venta,
    (lb.precio_unitario_venta - lb.costo_unitario) as margen,
    lb.motivo_descuento
FROM lineas_boleta lb
JOIN boletas b ON lb.id_boleta = b.id_boleta
WHERE lb.precio_unitario_venta < lb.costo_unitario
ORDER BY b.fecha_hora DESC;
```

---

## 5. MODELO DE DATOS ACTUALIZADO

### 5.1 Tabla PRODUCTOS Extendida

```sql
CREATE TABLE productos (
    -- Campos existentes
    id_producto INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_sku VARCHAR(20) UNIQUE NOT NULL,
    nombre_producto VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    costo DECIMAL(10,2) DEFAULT 0.00,
    precio_mayor DECIMAL(10,2) DEFAULT 0.00,
    precio_menor DECIMAL(10,2) DEFAULT 0.00,
    codigo_barra VARCHAR(50),
    
    -- NUEVOS CAMPOS
    descripcion TEXT,                           -- Descripción detallada
    unidad VARCHAR(50) DEFAULT 'Unidad',        -- Unidad de medida
    peso_neto DECIMAL(10,3),                    -- Para productos por peso (kg)
    volumen_neto DECIMAL(10,3),                 -- Para productos por volumen (L)
    cantidad_por_paquete INTEGER,               -- Si es pack/caja
    permite_venta_fraccionada BOOLEAN DEFAULT FALSE,  -- Si se vende suelto
    
    stock_actual DECIMAL(10,3) DEFAULT 0,       -- Stock (permite decimales para sueltos)
    stock_minimo DECIMAL(10,3) DEFAULT 0,
    
    estado ENUM('activo', 'inactivo', 'eliminado') DEFAULT 'activo',
    motivo_eliminacion VARCHAR(255),            -- Si fue eliminado
    
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_creacion INTEGER,
    usuario_ultima_modificacion INTEGER,
    
    -- Índices
    INDEX idx_codigo_sku (codigo_sku),
    INDEX idx_nombre_producto (nombre_producto),
    INDEX idx_categoria (categoria),
    INDEX idx_codigo_barra (codigo_barra),
    INDEX idx_estado (estado),
    
    FOREIGN KEY (usuario_creacion) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (usuario_ultima_modificacion) REFERENCES usuarios(id_usuario)
);
```

### 5.2 Tablas de Auditoría

**Historial de Cambios de Productos:**
```sql
CREATE TABLE historial_productos (
    id_historial INTEGER PRIMARY KEY AUTOINCREMENT,
    id_producto INTEGER NOT NULL,
    codigo_sku VARCHAR(20) NOT NULL,
    campo_modificado VARCHAR(50),
    valor_anterior TEXT,
    valor_nuevo TEXT,
    motivo VARCHAR(255),
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario INTEGER,
    
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
    FOREIGN KEY (usuario) REFERENCES usuarios(id_usuario),
    INDEX idx_producto (id_producto),
    INDEX idx_fecha (fecha_cambio)
);
```

**Registro de Acciones:**
```sql
CREATE TABLE log_acciones (
    id_log INTEGER PRIMARY KEY AUTOINCREMENT,
    accion VARCHAR(50),  -- 'crear', 'editar', 'eliminar', 'restaurar'
    entidad VARCHAR(50), -- 'producto', 'boleta', 'cliente'
    id_entidad INTEGER,
    detalles TEXT,       -- JSON con información adicional
    usuario INTEGER,
    ip_address VARCHAR(45),
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario) REFERENCES usuarios(id_usuario),
    INDEX idx_accion (accion),
    INDEX idx_fecha (fecha_hora),
    INDEX idx_usuario (usuario)
);
```

---

## 6. FLUJOS DE TRABAJO

### 6.1 Flujo: Venta con Descuento Especial

```
1. Vendedor inicia nueva venta en POS

2. Agrega productos a la boleta
   - Escanea o busca productos
   - Especifica cantidades
   - Productos se agregan con precio de lista

3. Cliente solicita descuento
   
4. Vendedor evalúa si puede aplicar descuento:
   
   SI descuento <= 10%:
     → Aplicar directamente
     → Ingresar motivo
     → Continuar
   
   SI descuento 10-20%:
     → Solicitar supervisión
     → Supervisor ingresa credenciales
     → Autoriza con motivo
     → Aplicar descuento
   
   SI descuento > 20%:
     → Sistema bloquea
     → Notificar a gerente
     → Gerente revisa y autoriza remotamente
     → Sistema desbloquea
     → Aplicar descuento

5. Aplicar descuento:
   - Seleccionar tipo (% o monto fijo)
   - Elegir si es por línea o global
   - Ingresar motivo
   - Confirmar
   
6. Boleta actualizada muestra:
   - Precios originales
   - Descuentos aplicados
   - Totales
   - Ahorro para el cliente

7. Proceder al cobro

8. Sistema registra:
   - Boleta con precios modificados
   - Historial de descuentos
   - Log de auditoría
   - IMPORTANTE: NO modifica precios en productos
```

### 6.2 Flujo: Edición de Producto desde POS

```
1. Vendedor está atendiendo en POS

2. Busca producto (ej: para agregarlo a venta)

3. Nota error en precio o información

4. Clic derecho en producto → "Editar Producto"
   
5. Verificar permisos:
   
   SI es vendedor:
     → Solo puede ver información
     → Mostrar mensaje: "Solicitar a administrador"
   
   SI es administrador o superior:
     → Abrir modal de edición
     → Mostrar todos los campos editables

6. Administrador modifica campos necesarios:
   - Precio
   - Descripción
   - Stock
   - etc.

7. Guardar cambios:
   - Validar datos
   - Actualizar en base de datos
   - Registrar en historial
   - Actualizar timestamp

8. Cerrar modal

9. POS se actualiza con nueva información
   
10. Vendedor puede continuar la venta
    con información actualizada
```

### 6.3 Flujo: Producto Nuevo Creado en POS

```
1. Vendedor escanea código de barras desconocido
   
2. Sistema: "Producto no encontrado"
   
   Opciones:
   [Ignorar] [Buscar Manualmente] [Crear Producto]

3. Vendedor selecciona "Crear Producto"

4. Verificar permisos:
   
   SI no tiene permiso:
     → Mostrar mensaje
     → Notificar a supervisor
     → Esperar autorización
   
   SI tiene permiso:
     → Abrir formulario de creación rápida

5. Formulario pre-llenado:
   - Código de barras (ya escaneado)
   - Código SKU (sugerido automáticamente)
   - Categoría (la última usada)

6. Usuario completa:
   - Nombre del producto *
   - Precio Menor *
   - (Opcional) Otros campos

7. Validaciones:
   - Nombre no vacío
   - SKU único
   - Precio válido

8. Guardar producto:
   - INSERT en base de datos
   - Registrar en log
   - Asignar ID

9. Producto creado aparece en búsqueda

10. Opción: ¿Agregar a esta venta?
    
    [No] [Sí, agregar]
    
11. Si selecciona "Sí":
    → Producto agregado a boleta actual
    → Continuar venta normal
```

---

## 7. VALIDACIONES Y REGLAS DE NEGOCIO

### 7.1 Validaciones de Productos

**Al Crear/Editar Producto:**

1. **Código SKU:**
   - ✅ Único en toda la base de datos
   - ✅ Formato válido (letras, números, guiones)
   - ✅ Longitud: 3-20 caracteres
   - ❌ No puede contener espacios
   - ❌ No puede estar vacío

2. **Nombre:**
   - ✅ Mínimo 3 caracteres
   - ✅ Máximo 255 caracteres
   - ❌ No puede estar vacío
   - ⚠️ Advertir si ya existe nombre similar

3. **Precios:**
   - ✅ Deben ser números >= 0
   - ⚠️ Advertir si Precio Mayor > Precio Menor
   - ⚠️ Advertir si Precio < Costo
   - ⚠️ Advertir si margen < 10%

4. **Descripción:**
   - ✅ Opcional
   - ✅ Máximo 2000 caracteres
   - ✅ Permite saltos de línea

5. **Código de Barras:**
   - ✅ Opcional
   - ✅ Si se ingresa, debe ser válido (13 dígitos para EAN-13)
   - ⚠️ Advertir si ya existe en otro producto

6. **Stock:**
   - ✅ Debe ser número >= 0
   - ✅ Permite decimales si el producto lo requiere
   - ⚠️ Advertir si stock < stock_minimo

**Al Eliminar Producto:**

1. **Producto con Ventas:**
   - ⚠️ Advertencia: "Tiene X ventas registradas"
   - ✅ Permitir solo eliminación lógica
   - ❌ Bloquear eliminación física

2. **Producto con Stock:**
   - ⚠️ Advertencia: "Stock actual: X unidades"
   - ⚠️ Sugerencia: "Ajustar stock a 0 primero"
   - ✅ Permitir eliminación con confirmación

3. **Producto en Boletas Pendientes:**
   - ❌ Bloquear eliminación
   - 🛑 Mensaje: "Producto en boletas sin cerrar"
   - Sugerencia: "Finalizar boletas primero"

---

### 7.2 Validaciones de Boletas y Descuentos

**Al Aplicar Descuentos:**

1. **Descuento por Línea:**
   - ✅ Descuento puede ser % o monto fijo
   - ✅ Descuento máximo: 100% (producto gratis)
   - ⚠️ Si descuento > 10%, requerir motivo
   - ⚠️ Si precio final < costo, advertir

2. **Descuento Global:**
   - ✅ Se aplica proporcionalmente a todas las líneas
   - ✅ Se calcula sobre subtotal
   - ⚠️ Si descuento > límite del usuario, requerir autorización

3. **Descuentos Acumulados:**
   - ✅ Permitir descuento por línea + descuento global
   - ⚠️ Advertir si descuento total > 50%
   - ⚠️ Mostrar precio final vs costo

**Al Modificar Precios en Boleta:**

1. **Precio Unitario:**
   - ✅ Puede ser diferente al precio de lista
   - ⚠️ Advertir si < costo
   - ⚠️ Requiere motivo si diferencia > 10%

2. **Autorización por Nivel:**
   ```
   Vendedor:      hasta -10%
   Supervisor:    hasta -20%
   Administrador: hasta -30%
   Gerente:       sin límite
   ```

3. **Motivos Obligatorios:**
   - Descuento > 10%: requiere motivo
   - Precio < costo: requiere motivo + autorización
   - Producto gratis: requiere motivo + aprobación gerente

---

### 7.3 Reglas de Stock

**Para Productos Fraccionados:**

1. **Alimentos por Peso:**
   ```
   Venta: 2.5 kg de alimento (bolsa de 21kg)
   
   Stock antes: 3 bolsas = 63kg
   Stock después: 2 bolsas + 18.5kg suelto
   
   Mostrar: "2 bolsas (42kg) + 18.5kg suelto"
   ```

2. **Líquidos a Granel:**
   ```
   Venta: 1.5L de alcohol (bidón de 5L)
   
   Stock antes: 2 bidones = 10L
   Stock después: 1 bidón + 3.5L suelto
   
   Mostrar: "1 bidón (5L) + 3.5L suelto"
   ```

**Ajuste de Stock:**

1. **Motivos Válidos:**
   - Venta
   - Compra/ingreso
   - Devolución
   - Inventario (ajuste)
   - Pérdida/rotura
   - Consumo interno

2. **Registro:**
   - Cada movimiento se registra
   - Fecha/hora
   - Usuario responsable
   - Cantidad
   - Motivo
   - Stock anterior/nuevo

---

## 8. CONSIDERACIONES TÉCNICAS

### 8.1 Performance

**Optimizaciones Necesarias:**

1. **Búsqueda de Productos en POS:**
   - Usar índices en nombre, SKU, código de barras
   - Implementar debounce (300ms)
   - Limitar resultados a 50
   - Cache de productos más vendidos

2. **Cálculo de Precios:**
   - Calcular márgenes en tiempo real
   - Optimizar queries con JOINs
   - Usar transacciones para actualizaciones

3. **Historial:**
   - Particionar tabla por fecha
   - Archivar registros antiguos (> 2 años)
   - Índices en fechas y usuarios

### 8.2 Seguridad

**Protecciones Necesarias:**

1. **Autorización:**
   - Validar permisos en backend, no solo frontend
   - Tokens de sesión con expiración
   - Registro de intentos no autorizados

2. **Auditoría:**
   - Todas las modificaciones de precios se registran
   - Todas las eliminaciones se registran
   - IP y usuario en cada acción

3. **Integridad de Datos:**
   - Transacciones para operaciones críticas
   - Validaciones en BD (constraints)
   - Backups automáticos

### 8.3 Experiencia de Usuario

**Principios:**

1. **Velocidad:**
   - POS debe responder < 300ms
   - Búsquedas instantáneas
   - Sin bloqueos innecesarios

2. **Claridad:**
   - Mostrar siempre precio original y modificado
   - Colores para identificar descuentos
   - Confirmaciones claras

3. **Prevención de Errores:**
   - Validaciones en tiempo real
   - Mensajes de advertencia claros
   - Confirmaciones para acciones críticas
   - Deshacer disponible cuando sea posible

---

## RESUMEN DE PRIORIDADES

### CRÍTICO (Implementar Primero)

1. ✅ Campo descripción en productos
2. ✅ Precios por kg/litro en productos aplicables
3. ✅ Eliminación lógica de productos
4. ✅ Creación de productos
5. ✅ Modificación de precios en boleta (sin afectar BD)
6. ✅ Sistema de permisos para descuentos

### IMPORTANTE (Implementar Segundo)

7. ✅ Edición de productos desde POS
8. ✅ Historial de cambios
9. ✅ Venta fraccionada (kg/litro)
10. ✅ Descuentos globales en boleta
11. ✅ Autorización por niveles

### OPCIONAL (Implementar Después)

12. ⏳ Eliminación física de productos
13. ⏳ Importación masiva de productos
14. ⏳ Edición inline en listas
15. ⏳ Promociones automáticas (3×2)
16. ⏳ Precios especiales por cliente

---

**Fin del Documento**

*Este documento contiene todas las especificaciones funcionales necesarias para implementar las nuevas características del sistema LA FUGA. Debe usarse como referencia durante el desarrollo y como checklist de requerimientos.*

---

**Versión:** 2.0  
**Fecha:** 14 de enero de 2026  
**Autor:** Especificaciones de QUEPIA  
**Próxima revisión:** Después de implementación de funcionalidades críticas
