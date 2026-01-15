# 📋 FUNCIONALIDADES COMPLETAS Y PLAN DE TESTING - SISTEMA LA FUGA

**Proyecto:** Sistema de Gestión de Precios LA FUGA  
**Fecha:** 14 de enero de 2026  
**Versión:** 1.0

---

## 🎯 VISIÓN GENERAL DEL SISTEMA

Sistema web para gestión eficiente de precios de productos con:
- 2,099 productos en 7 categorías
- Precios minoristas (MENOR) y mayoristas (MAYOR)
- Consulta rápida durante atención al cliente
- Actualización de precios individual y masiva
- Acceso desde múltiples dispositivos (PC, tablet, móvil)

---

## 📱 MÓDULOS DEL SISTEMA

### 1. MÓDULO DE BÚSQUEDA Y CONSULTA
### 2. MÓDULO DE VISUALIZACIÓN
### 3. MÓDULO DE FILTROS
### 4. MÓDULO DE ACTUALIZACIÓN INDIVIDUAL
### 5. MÓDULO DE ACTUALIZACIÓN MASIVA
### 6. MÓDULO DE CATEGORÍAS
### 7. MÓDULO DE ESTADÍSTICAS
### 8. MÓDULO DE CONFIGURACIÓN

---

# 🔍 MÓDULO 1: BÚSQUEDA Y CONSULTA

## Funcionalidades

### F1.1 - Búsqueda en Tiempo Real
**Descripción:** Búsqueda instantánea mientras el usuario escribe

**Características:**
- Búsqueda con debounce (300ms)
- Mínimo 2 caracteres para iniciar búsqueda
- Resultados actualizados dinámicamente
- Indicador visual de "buscando..."
- Límite configurable de resultados (default: 20)

**Criterios de búsqueda:**
- Por nombre del producto (case-insensitive)
- Por código SKU
- Por código de barras

**Interfaz:**
```
┌─────────────────────────────────────────┐
│  🔍 Buscar productos...                 │
│  [                                    ] │
└─────────────────────────────────────────┘
```

**Testing:**

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|----------------|---------|-------------------|
| T1.1.1 | Búsqueda por nombre | "alfajor" | Lista de productos con "alfajor" en nombre |
| T1.1.2 | Búsqueda por código | "ALM-0001" | Producto específico con código ALM-0001 |
| T1.1.3 | Búsqueda con 1 carácter | "a" | No busca (mínimo 2 caracteres) |
| T1.1.4 | Búsqueda sin resultados | "zzzzz" | Mensaje "No se encontraron productos" |
| T1.1.5 | Búsqueda case-insensitive | "ALFAJOR" / "alfajor" | Mismos resultados |
| T1.1.6 | Búsqueda con caracteres especiales | "agua 500ml" | Maneja espacios correctamente |
| T1.1.7 | Búsqueda parcial | "alfa" | Muestra todos los productos que contengan "alfa" |
| T1.1.8 | Debounce funcionando | Escribir rápido "alfajor" | Solo 1 búsqueda después de 300ms |
| T1.1.9 | Límite de resultados | Búsqueda amplia | Máximo 20 resultados mostrados |
| T1.1.10 | Búsqueda con acentos | "química" | Encuentra productos de categoría QUIMICA |

---

### F1.2 - Búsqueda por Código de Barras
**Descripción:** Búsqueda usando lector de código de barras

**Características:**
- Input dedicado para código de barras
- Autosubmit al detectar código completo
- Focus automático después de búsqueda
- Feedback visual de producto encontrado

**Interfaz:**
```
┌─────────────────────────────────────────┐
│  📟 Escanear código de barras           │
│  [                                    ] │
│  O ingrese manualmente: ____________    │
└─────────────────────────────────────────┘
```

**Testing:**

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|----------------|---------|-------------------|
| T1.2.1 | Escaneo exitoso | Código válido | Muestra producto inmediatamente |
| T1.2.2 | Código inexistente | Código inválido | Mensaje "Código de barras no encontrado" |
| T1.2.3 | Input manual | Escribir código | Busca al presionar Enter |
| T1.2.4 | Escaneos múltiples | 3 códigos seguidos | Cada uno muestra su producto |
| T1.2.5 | Producto sin código de barras | N/A | Búsqueda por nombre/SKU disponible |

---

### F1.3 - Búsqueda Avanzada (Opcional)
**Descripción:** Búsqueda con múltiples filtros simultáneos

**Características:**
- Búsqueda por rango de precios
- Búsqueda por múltiples categorías
- Búsqueda por unidad de medida
- Combinación de filtros

**Testing:**

| ID | Caso de Prueba | Filtros | Resultado Esperado |
|----|----------------|---------|-------------------|
| T1.3.1 | Precio entre 100-500 | min=100, max=500 | Solo productos en ese rango |
| T1.3.2 | Categorías múltiples | ALMACEN + BAZAR | Productos de ambas categorías |
| T1.3.3 | Sin precio (precio = 0) | precio_menor = 0 | 243 productos sin precio |
| T1.3.4 | Combinación de filtros | Categoría + rango precio | Productos que cumplan ambos |

---

# 👁️ MÓDULO 2: VISUALIZACIÓN

## Funcionalidades

### F2.1 - Tarjeta de Producto
**Descripción:** Visualización individual de un producto

**Elementos de la tarjeta:**
```
┌────────────────────────────────────────┐
│ [CATEGORIA]                   ALM-0001 │
│                                        │
│ Agua sierra del norte x 6 lt          │
│                                        │
│ ┌──────────────┐  ┌──────────────┐   │
│ │ MINORISTA    │  │ MAYORISTA    │   │
│ │ $1,600.00    │  │ $1,400.00    │   │
│ └──────────────┘  └──────────────┘   │
│                                        │
│ Diferencia: 12.5% | Unidad            │
│                                        │
│ [Editar]  [Ver Detalle]  [Historial]  │
└────────────────────────────────────────┘
```

**Información mostrada:**
- Código SKU (pequeño, esquina superior)
- Nombre del producto (destacado, grande)
- Categoría (badge/tag con color)
- Precio MENOR (destacado en verde/azul)
- Precio MAYOR (destacado en naranja/morado)
- Diferencia porcentual entre precios
- Unidad de medida
- Última actualización
- Acciones disponibles

**Testing:**

| ID | Caso de Prueba | Acción | Resultado Esperado |
|----|----------------|--------|-------------------|
| T2.1.1 | Ver tarjeta producto normal | Buscar "ALM-0001" | Todos los campos completos |
| T2.1.2 | Producto sin precio | Buscar producto precio=0 | Badge "Sin precio" visible |
| T2.1.3 | Producto sin código barras | Ver cualquier producto | Campo código barras = "N/A" |
| T2.1.4 | Diferencia porcentual | Ver producto con precios diferentes | Cálculo correcto: ((menor-mayor)/mayor)*100 |
| T2.1.5 | Formato de precios | Ver cualquier producto | Formato: $X,XXX.XX (miles y 2 decimales) |
| T2.1.6 | Categoría coloreada | Ver productos de cada categoría | Cada categoría tiene color único |
| T2.1.7 | Responsive en móvil | Ver en pantalla pequeña | Tarjeta se adapta sin scroll horizontal |
| T2.1.8 | Tooltip en hover | Pasar mouse por precio | Muestra fecha última actualización |

---

### F2.2 - Lista de Productos
**Descripción:** Visualización de múltiples productos

**Modos de vista:**
1. **Modo Tarjetas (Grid)**
   - 3 columnas en desktop
   - 2 columnas en tablet
   - 1 columna en móvil
   - Gap de 20px entre tarjetas

2. **Modo Lista (Table)**
   ```
   ┌──────────────────────────────────────────────────────────────┐
   │ Código    │ Producto              │ Cat.  │ Menor    │ Mayor │
   ├──────────────────────────────────────────────────────────────┤
   │ ALM-0001  │ Agua sierra del...   │ ALMAC │ $1,600   │ $1,400│
   │ ALM-0002  │ Alfajor fulbito...   │ ALMAC │ $200     │ $145  │
   └──────────────────────────────────────────────────────────────┘
   ```

**Características:**
- Toggle para cambiar entre vistas
- Selección múltiple (checkboxes)
- Ordenamiento por columnas (en modo tabla)
- Scroll infinito o paginación
- Indicador de total de productos

**Testing:**

| ID | Caso de Prueba | Acción | Resultado Esperado |
|----|----------------|--------|-------------------|
| T2.2.1 | Cambiar a modo tarjetas | Click en toggle | Vista cambia a grid de tarjetas |
| T2.2.2 | Cambiar a modo lista | Click en toggle | Vista cambia a tabla |
| T2.2.3 | Ordenar por nombre | Click en columna "Producto" | Productos ordenados A-Z |
| T2.2.4 | Ordenar por precio | Click en columna "Menor" | Productos ordenados por precio |
| T2.2.5 | Scroll infinito | Scroll al final | Carga siguiente página automáticamente |
| T2.2.6 | Selección múltiple | Click en checkboxes | Productos seleccionados destacados |
| T2.2.7 | Seleccionar todos | Click en checkbox header | Todos en página actual seleccionados |
| T2.2.8 | Contador de productos | Ver lista | Muestra "Mostrando X de Y productos" |
| T2.2.9 | Responsive tabla en móvil | Ver tabla en móvil | Se convierte en cards o scroll horizontal |

---

### F2.3 - Detalle de Producto (Modal/Página)
**Descripción:** Vista completa de información del producto

**Información mostrada:**
```
╔══════════════════════════════════════════╗
║           DETALLE DEL PRODUCTO           ║
╠══════════════════════════════════════════╣
║ Código SKU:        ALM-0001              ║
║ Nombre:            Agua sierra del...    ║
║ Categoría:         ALMACEN               ║
║ Código de Barras:  7798123456789        ║
║ Unidad:            Unidad                ║
║                                          ║
║ PRECIOS:                                 ║
║ ├─ Minorista:      $1,600.00            ║
║ ├─ Mayorista:      $1,400.00            ║
║ └─ Diferencia:     12.5%                 ║
║                                          ║
║ Última actualización: 14/01/2026         ║
║                                          ║
║ [Editar Precio]  [Historial]  [Cerrar]  ║
╚══════════════════════════════════════════╝
```

**Testing:**

| ID | Caso de Prueba | Acción | Resultado Esperado |
|----|----------------|--------|-------------------|
| T2.3.1 | Abrir detalle | Click en "Ver detalle" | Modal/página se abre |
| T2.3.2 | Cerrar con X | Click en X | Modal se cierra |
| T2.3.3 | Cerrar con Esc | Presionar Esc | Modal se cierra |
| T2.3.4 | Cerrar con overlay | Click fuera del modal | Modal se cierra |
| T2.3.5 | Ver historial | Click en "Historial" | Muestra cambios de precios |
| T2.3.6 | Abrir edición | Click en "Editar precio" | Abre formulario de edición |

---

# 🔧 MÓDULO 3: FILTROS

## Funcionalidades

### F3.1 - Filtro por Categoría
**Descripción:** Filtrar productos por una o varias categorías

**Interfaz:**
```
┌─────────────────────────────────────────┐
│ CATEGORÍAS                              │
│                                         │
│ ☐ Todas (2,099)                        │
│ ☐ DUX (1,367)                          │
│ ☐ BAZAR (170)                          │
│ ☐ ALMACEN (167)                        │
│ ☐ MASCOTAS (118)                       │
│ ☐ LIBRERIA (111)                       │
│ ☐ QUIMICA (99)                         │
│ ☐ SUELTOS - QUIMICA (67)               │
│                                         │
│ [Limpiar Filtros]                      │
└─────────────────────────────────────────┘
```

**Características:**
- Checkbox por categoría
- Contador de productos por categoría
- Selección múltiple
- Botón "Todas" para limpiar
- Actualización instantánea de resultados

**Testing:**

| ID | Caso de Prueba | Acción | Resultado Esperado |
|----|----------------|--------|-------------------|
| T3.1.1 | Seleccionar ALMACEN | Click en checkbox ALMACEN | Muestra solo 167 productos ALMACEN |
| T3.1.2 | Seleccionar múltiples | Click en ALMACEN + BAZAR | Muestra 167 + 170 = 337 productos |
| T3.1.3 | Deseleccionar categoría | Click en categoría activa | Vuelve a mostrar todos |
| T3.1.4 | Click en "Todas" | Click en "Todas" | Limpia filtros, muestra 2,099 |
| T3.1.5 | Contador actualizado | Filtrar por categoría | Contador muestra cantidad correcta |
| T3.1.6 | Persistencia de filtro | Filtrar + buscar | Búsqueda respeta filtro activo |
| T3.1.7 | URL con filtro | Seleccionar categoría | URL incluye ?categoria=ALMACEN |

---

### F3.2 - Filtro por Rango de Precios
**Descripción:** Filtrar productos por rango de precio minorista o mayorista

**Interfaz:**
```
┌─────────────────────────────────────────┐
│ RANGO DE PRECIOS                        │
│                                         │
│ Tipo: ⦿ Minorista  ○ Mayorista         │
│                                         │
│ Mínimo: [        ]  Máximo: [        ] │
│                                         │
│ Slider: ├────────●──────●────────┤     │
│         $0                    $10,000   │
│                                         │
│ [Aplicar]  [Limpiar]                   │
└─────────────────────────────────────────┘
```

**Testing:**

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|----------------|---------|-------------------|
| T3.2.1 | Rango válido | min=100, max=500 | Productos en ese rango |
| T3.2.2 | Solo mínimo | min=1000 | Productos >= 1000 |
| T3.2.3 | Solo máximo | max=500 | Productos <= 500 |
| T3.2.4 | Mínimo > Máximo | min=1000, max=500 | Mensaje de error |
| T3.2.5 | Valores negativos | min=-100 | Ignora o muestra error |
| T3.2.6 | Usar slider | Mover slider | Input se actualiza dinámicamente |
| T3.2.7 | Cambiar tipo precio | Minorista → Mayorista | Recalcula con precio mayorista |

---

### F3.3 - Filtro de Productos sin Precio
**Descripción:** Mostrar solo productos que tienen precio = 0

**Interfaz:**
```
┌─────────────────────────────────────────┐
│ ⚠️  PRODUCTOS SIN PRECIO (243)          │
│                                         │
│ [Mostrar solo sin precio]  [Ocultar]   │
└─────────────────────────────────────────┘
```

**Testing:**

| ID | Caso de Prueba | Acción | Resultado Esperado |
|----|----------------|--------|-------------------|
| T3.3.1 | Activar filtro | Click en "Mostrar solo sin precio" | Muestra 243 productos |
| T3.3.2 | Verificar precios | Revisar productos mostrados | Todos tienen precio_menor = 0 |
| T3.3.3 | Desactivar filtro | Click en "Ocultar" | Vuelve a mostrar todos |
| T3.3.4 | Combinar con categoría | Filtro sin precio + ALMACEN | Muestra sin precio de ALMACEN |

---

### F3.4 - Ordenamiento
**Descripción:** Ordenar resultados por diferentes criterios

**Opciones:**
```
Ordenar por: [▼ Nombre A-Z      ]
             
- Nombre (A-Z)
- Nombre (Z-A)
- Código (A-Z)
- Código (Z-A)
- Precio menor (Ascendente)
- Precio menor (Descendente)
- Precio mayor (Ascendente)
- Precio mayor (Descendente)
- Categoría
- Última actualización
```

**Testing:**

| ID | Caso de Prueba | Ordenamiento | Resultado Esperado |
|----|----------------|--------------|-------------------|
| T3.4.1 | Nombre A-Z | Seleccionar "Nombre A-Z" | Productos ordenados alfabéticamente |
| T3.4.2 | Nombre Z-A | Seleccionar "Nombre Z-A" | Productos orden reverso |
| T3.4.3 | Precio ascendente | "Precio menor (Asc)" | Del más barato al más caro |
| T3.4.4 | Precio descendente | "Precio menor (Desc)" | Del más caro al más barato |
| T3.4.5 | Por categoría | "Categoría" | Agrupados por categoría |
| T3.4.6 | Última actualización | "Última actualización" | Más recientes primero |
| T3.4.7 | Productos sin precio | Cualquier orden por precio | Productos con precio=0 al final |

---

# ✏️ MÓDULO 4: ACTUALIZACIÓN INDIVIDUAL

## Funcionalidades

### F4.1 - Editar Producto
**Descripción:** Modificar información de un producto específico

**Formulario de edición:**
```
╔══════════════════════════════════════════╗
║         EDITAR PRODUCTO: ALM-0001        ║
╠══════════════════════════════════════════╣
║                                          ║
║ Nombre del producto:                     ║
║ [Agua sierra del norte x 6 lt        ]  ║
║                                          ║
║ Categoría:                               ║
║ [ALMACEN                    ▼]          ║
║                                          ║
║ Precio Minorista (MENOR):                ║
║ $ [1600.00]                             ║
║                                          ║
║ Precio Mayorista (MAYOR):                ║
║ $ [1400.00]                             ║
║                                          ║
║ Unidad:                                  ║
║ [Unidad                     ▼]          ║
║                                          ║
║ Código de Barras:                        ║
║ [7798123456789                       ]  ║
║                                          ║
║ [Cancelar]              [Guardar Cambios]║
╚══════════════════════════════════════════╝
```

**Campos editables:**
- Nombre del producto
- Categoría
- Precio menor (minorista)
- Precio mayor (mayorista)
- Unidad
- Código de barras

**Validaciones:**
- Nombre: no vacío, máx 200 caracteres
- Precios: números >= 0, máx 2 decimales
- Categoría: debe existir en lista
- Código de barras: opcional, alfanumérico

**Testing:**

| ID | Caso de Prueba | Acción | Resultado Esperado |
|----|----------------|--------|-------------------|
| T4.1.1 | Abrir formulario | Click en "Editar" | Modal con datos actuales |
| T4.1.2 | Cambiar precio menor | Cambiar 1600 → 1800 | Se guarda correctamente |
| T4.1.3 | Cambiar precio mayor | Cambiar 1400 → 1600 | Se guarda correctamente |
| T4.1.4 | Cambiar ambos precios | Cambiar ambos | Ambos se actualizan |
| T4.1.5 | Precio negativo | Ingresar -100 | Error: "El precio debe ser mayor o igual a 0" |
| T4.1.6 | Precio con más de 2 decimales | Ingresar 100.999 | Se redondea a 100.99 |
| T4.1.7 | Precio no numérico | Ingresar "abc" | Error: "Ingrese un número válido" |
| T4.1.8 | Nombre vacío | Borrar nombre | Error: "El nombre es obligatorio" |
| T4.1.9 | Guardar sin cambios | Click en Guardar sin editar | Se cierra sin error |
| T4.1.10 | Cancelar edición | Click en Cancelar | Se cierra sin guardar |
| T4.1.11 | Cambiar categoría | ALMACEN → BAZAR | Se actualiza categoría |
| T4.1.12 | Actualización timestamp | Guardar cambios | ultima_actualizacion = fecha actual |
| T4.1.13 | Feedback visual | Guardar exitosamente | Toast/notificación "Producto actualizado" |
| T4.1.14 | Error de conexión | Guardar sin backend | Mensaje "Error al conectar con servidor" |

---

### F4.2 - Ajuste Rápido de Precios
**Descripción:** Aumentar/disminuir precio con un click

**Interfaz en tarjeta:**
```
┌────────────────────────────────────────┐
│ Precio Minorista: $1,600.00            │
│ [-10%] [-5%] [+5%] [+10%] [Editar]    │
└────────────────────────────────────────┘
```

**Características:**
- Botones de ajuste rápido: -10%, -5%, +5%, +10%
- Confirmación para cambios > 20%
- Preview del nuevo precio antes de aplicar
- Opción de aplicar a precio menor, mayor o ambos

**Testing:**

| ID | Caso de Prueba | Acción | Resultado Esperado |
|----|----------------|--------|-------------------|
| T4.2.1 | Aumentar 5% | Click en "+5%" | Precio aumenta 5% |
| T4.2.2 | Disminuir 10% | Click en "-10%" | Precio disminuye 10% |
| T4.2.3 | Preview de cambio | Hover en "+5%" | Muestra nuevo precio sin aplicar |
| T4.2.4 | Cambio mayor a 20% | Aplicar +25% | Pide confirmación |
| T4.2.5 | Aplicar a ambos precios | Seleccionar ambos + +10% | Ambos aumentan 10% |
| T4.2.6 | Redondeo correcto | Aumentar 5% de $100 | Resultado: $105.00 (2 decimales) |

---

# 🔄 MÓDULO 5: ACTUALIZACIÓN MASIVA

## Funcionalidades

### F5.1 - Actualización Masiva por Categoría
**Descripción:** Actualizar precios de todos los productos de una categoría

**Interfaz:**
```
╔══════════════════════════════════════════╗
║      ACTUALIZACIÓN MASIVA POR CATEGORÍA  ║
╠══════════════════════════════════════════╣
║                                          ║
║ Seleccione categoría:                    ║
║ [ALMACEN                    ▼]          ║
║                                          ║
║ Productos afectados: 167                 ║
║                                          ║
║ Ajuste de precios:                       ║
║ ⦿ Aumentar  ○ Disminuir                 ║
║                                          ║
║ Porcentaje: [10.00] %                   ║
║                                          ║
║ Aplicar a:                               ║
║ ☑ Precio Minorista (MENOR)              ║
║ ☑ Precio Mayorista (MAYOR)              ║
║                                          ║
║ ☐ Excluir productos sin precio          ║
║                                          ║
║ ┌────────────────────────────────────┐  ║
║ │ PREVIEW:                           │  ║
║ │ ALM-0001: $1,600 → $1,760         │  ║
║ │ ALM-0002: $200 → $220             │  ║
║ │ ...                                │  ║
║ │ Total a actualizar: 167 productos  │  ║
║ └────────────────────────────────────┘  ║
║                                          ║
║ [Cancelar]              [Aplicar Cambios]║
╚══════════════════════════════════════════╝
```

**Proceso:**
1. Seleccionar categoría
2. Ver cantidad de productos afectados
3. Elegir aumentar o disminuir
4. Ingresar porcentaje
5. Seleccionar qué precios actualizar
6. Ver preview de cambios
7. Confirmar aplicación
8. Ver progreso de actualización
9. Recibir confirmación

**Testing:**

| ID | Caso de Prueba | Parámetros | Resultado Esperado |
|----|----------------|------------|-------------------|
| T5.1.1 | Aumentar 10% ALMACEN | Cat=ALMACEN, +10% | 167 productos aumentan 10% |
| T5.1.2 | Disminuir 5% DUX | Cat=DUX, -5% | 1,367 productos disminuyen 5% |
| T5.1.3 | Solo precio menor | Cat=BAZAR, +10%, solo menor | Solo precio_menor actualizado |
| T5.1.4 | Solo precio mayor | Cat=BAZAR, +10%, solo mayor | Solo precio_mayor actualizado |
| T5.1.5 | Ambos precios | Cat=QUIMICA, +15%, ambos | Ambos precios actualizados |
| T5.1.6 | Preview correcto | Cualquier combinación | Preview muestra cálculos exactos |
| T5.1.7 | Excluir sin precio | Activar checkbox | 243 productos excluidos |
| T5.1.8 | Porcentaje 0 | Ingresar 0% | Error o no hace nada |
| T5.1.9 | Porcentaje negativo | Ingresar -10% | Error: usar modo "Disminuir" |
| T5.1.10 | Porcentaje > 100% | Ingresar 200% | Pide confirmación doble |
| T5.1.11 | Cancelar en preview | Ver preview + Cancelar | No aplica cambios |
| T5.1.12 | Progress bar | Aplicar cambios | Muestra progreso 0-100% |
| T5.1.13 | Confirmación final | Termina actualización | Mensaje "167 productos actualizados" |
| T5.1.14 | Timestamp actualizado | Después de actualización | Todos tienen fecha actual |
| T5.1.15 | Logs de cambios | Ver historial | Registro de actualización masiva |

---

### F5.2 - Actualización Masiva por Selección
**Descripción:** Actualizar precios de productos seleccionados manualmente

**Interfaz:**
```
┌─────────────────────────────────────────┐
│ ☑ 5 productos seleccionados             │
│                                         │
│ [Deseleccionar Todo]  [Actualizar Precios]
└─────────────────────────────────────────┘

Lista de productos con checkboxes:
☑ ALM-0001 - Agua sierra del norte
☑ ALM-0002 - Alfajor fulbito
☐ ALM-0003 - Alfajor genio triple
☑ BAZAR-0001 - Plato hondo
☑ BAZAR-0002 - Vaso térmico
...
```

**Proceso:**
1. Usuario selecciona productos con checkboxes
2. Click en "Actualizar precios"
3. Se abre modal similar a F5.1
4. Aplica cambios solo a seleccionados

**Testing:**

| ID | Caso de Prueba | Acción | Resultado Esperado |
|----|----------------|--------|-------------------|
| T5.2.1 | Seleccionar 1 producto | Click en checkbox | Producto marcado |
| T5.2.2 | Seleccionar varios | Click en varios checkboxes | Todos marcados |
| T5.2.3 | Seleccionar todos | Click en checkbox header | Todos en página marcados |
| T5.2.4 | Deseleccionar | Click en producto marcado | Se desmarca |
| T5.2.5 | Deseleccionar todos | Click en "Deseleccionar todo" | Todos desmarcados |
| T5.2.6 | Contador visible | Seleccionar 5 | Muestra "5 productos seleccionados" |
| T5.2.7 | Actualizar selección | Aplicar +10% a 5 seleccionados | Solo esos 5 se actualizan |
| T5.2.8 | Selección persiste | Cambiar página | Mantiene selección anterior |
| T5.2.9 | Límite de selección | Seleccionar >100 | Warning o permite todos |

---

### F5.3 - Importación desde Excel
**Descripción:** Actualizar precios desde archivo Excel

**Formato Excel esperado:**
```
| CODIGO    | PRECIO_MENOR | PRECIO_MAYOR |
|-----------|--------------|--------------|
| ALM-0001  | 1800.00      | 1600.00      |
| ALM-0002  | 220.00       | 160.00       |
| ...       | ...          | ...          |
```

**Proceso:**
1. Click en "Importar desde Excel"
2. Seleccionar archivo
3. Sistema valida formato
4. Muestra preview de cambios
5. Usuario confirma
6. Aplicación masiva
7. Reporte de importación

**Testing:**

| ID | Caso de Prueba | Archivo | Resultado Esperado |
|----|----------------|---------|-------------------|
| T5.3.1 | Excel válido | Formato correcto, 10 productos | 10 productos actualizados |
| T5.3.2 | Código inexistente | Incluye código no existente | Warning, skip ese producto |
| T5.3.3 | Precio inválido | Precio negativo | Error en validación |
| T5.3.4 | Formato incorrecto | Columnas mal nombradas | Error: "Formato incorrecto" |
| T5.3.5 | Excel vacío | Sin datos | Error: "Archivo vacío" |
| T5.3.6 | Excel muy grande | >5000 productos | Procesa en lotes |
| T5.3.7 | Duplicados | Mismo código 2 veces | Usa último valor |
| T5.3.8 | Reporte de errores | Excel con errores | Lista errores encontrados |
| T5.3.9 | Preview antes de aplicar | Excel válido | Muestra cambios sin aplicar |
| T5.3.10 | Cancelar importación | Preview + Cancelar | No aplica cambios |

---

# 📊 MÓDULO 6: CATEGORÍAS

## Funcionalidades

### F6.1 - Vista de Categorías
**Descripción:** Visualización de todas las categorías con estadísticas

**Interfaz:**
```
╔══════════════════════════════════════════╗
║              CATEGORÍAS                  ║
╠══════════════════════════════════════════╣
║                                          ║
║ ┌────────────────────────────────────┐  ║
║ │ DUX                                │  ║
║ │ 1,367 productos (65.1%)            │  ║
║ │ Precio promedio: $850              │  ║
║ │ [Ver productos] [Actualizar precios]│  ║
║ └────────────────────────────────────┘  ║
║                                          ║
║ ┌────────────────────────────────────┐  ║
║ │ BAZAR                              │  ║
║ │ 170 productos (8.1%)               │  ║
║ │ Precio promedio: $1,200            │  ║
║ │ [Ver productos] [Actualizar precios]│  ║
║ └────────────────────────────────────┘  ║
║                                          ║
║ ... (otras categorías)                   ║
║                                          ║
╚══════════════════════════════════════════╝
```

**Información por categoría:**
- Nombre
- Total de productos
- Porcentaje del total
- Precio promedio minorista
- Precio promedio mayorista
- Productos sin precio
- Acciones rápidas

**Testing:**

| ID | Caso de Prueba | Acción | Resultado Esperado |
|----|----------------|--------|-------------------|
| T6.1.1 | Ver todas las categorías | Abrir vista categorías | Muestra las 7 categorías |
| T6.1.2 | Contador correcto | Verificar DUX | Muestra 1,367 productos |
| T6.1.3 | Porcentaje correcto | Verificar todos | Suma 100% |
| T6.1.4 | Precio promedio | Verificar cálculo | Promedio correcto |
| T6.1.5 | Click en "Ver productos" | Click en categoría | Filtra por esa categoría |
| T6.1.6 | Click en "Actualizar precios" | Click en acción | Abre modal de actualización masiva |
| T6.1.7 | Ordenar categorías | Por cantidad | Orden correcto |

---

### F6.2 - Gestión de Categorías (Opcional)
**Descripción:** Crear, editar, eliminar categorías

**Funciones:**
- Crear nueva categoría
- Renombrar categoría
- Eliminar categoría (si no tiene productos)
- Fusionar categorías
- Asignar color a categoría

**Testing:**

| ID | Caso de Prueba | Acción | Resultado Esperado |
|----|----------------|--------|-------------------|
| T6.2.1 | Crear categoría | Crear "BEBIDAS" | Nueva categoría disponible |
| T6.2.2 | Renombrar | "ALMACEN" → "ALMACÉN" | Nombre actualizado |
| T6.2.3 | Eliminar vacía | Eliminar categoría sin productos | Se elimina |
| T6.2.4 | Eliminar con productos | Eliminar DUX (1,367 productos) | Error o pide reasignación |
| T6.2.5 | Fusionar | QUIMICA + SUELTOS-QUIMICA | Productos se unifican |
| T6.2.6 | Asignar color | Seleccionar color para BAZAR | Color se aplica en badges |

---

# 📈 MÓDULO 7: ESTADÍSTICAS Y REPORTES

## Funcionalidades

### F7.1 - Dashboard General
**Descripción:** Vista resumen del sistema

**Widgets del dashboard:**
```
┌────────────────┬────────────────┬────────────────┐
│ TOTAL PRODUCTOS│ SIN PRECIO     │ ÚLTIMA ACTUALI │
│ 2,099          │ 243 (11.6%)   │ Hoy, 14:30    │
└────────────────┴────────────────┴────────────────┘

┌──────────────────────────────────────────────────┐
│ PRODUCTOS POR CATEGORÍA                          │
│ ████████████████████████████ DUX (1,367)        │
│ ███ BAZAR (170)                                  │
│ ███ ALMACEN (167)                                │
│ ██ MASCOTAS (118)                                │
│ ██ LIBRERIA (111)                                │
│ ██ QUIMICA (99)                                  │
│ █ SUELTOS (67)                                   │
└──────────────────────────────────────────────────┘

┌────────────────┬────────────────┬────────────────┐
│ PRECIO PROMEDIO│ PRECIO MÁS ALTO│ PRECIO MÁS BAJO│
│ $950           │ $15,000        │ $50            │
└────────────────┴────────────────┴────────────────┘

┌──────────────────────────────────────────────────┐
│ ACTIVIDAD RECIENTE                               │
│ • 14:30 - 15 productos actualizados (ALMACEN)   │
│ • 12:15 - Precio actualizado: ALM-0023          │
│ • 10:00 - Actualización masiva: DUX (+5%)       │
└──────────────────────────────────────────────────┘
```

**Testing:**

| ID | Caso de Prueba | Métrica | Resultado Esperado |
|----|----------------|---------|-------------------|
| T7.1.1 | Total productos | Ver dashboard | Muestra 2,099 |
| T7.1.2 | Sin precio | Ver dashboard | Muestra 243 (11.6%) |
| T7.1.3 | Gráfico categorías | Ver dashboard | Proporciones correctas |
| T7.1.4 | Precio promedio | Verificar cálculo | Promedio correcto de todos |
| T7.1.5 | Precio más alto | Verificar | Muestra el máximo real |
| T7.1.6 | Precio más bajo | Verificar (>0) | Muestra el mínimo >0 |
| T7.1.7 | Actividad reciente | Ver log | Últimas 10 acciones |
| T7.1.8 | Actualización en tiempo real | Actualizar producto | Dashboard se actualiza |

---

### F7.2 - Reportes Exportables
**Descripción:** Generar reportes en diferentes formatos

**Tipos de reportes:**
1. **Listado completo de productos**
2. **Productos por categoría**
3. **Productos sin precio**
4. **Historial de cambios de precios**
5. **Reporte de actualización masiva**

**Formatos de exportación:**
- Excel (.xlsx)
- PDF
- CSV

**Testing:**

| ID | Caso de Prueba | Reporte | Resultado Esperado |
|----|----------------|---------|-------------------|
| T7.2.1 | Exportar a Excel | Listado completo | Archivo Excel con 2,099 filas |
| T7.2.2 | Exportar a PDF | Productos por categoría | PDF con 7 páginas (1 por categoría) |
| T7.2.3 | Exportar a CSV | Sin precio | CSV con 243 productos |
| T7.2.4 | Formato correcto | Cualquier formato | Columnas en orden correcto |
| T7.2.5 | Nombre de archivo | Exportar | Nombre: "LA_FUGA_productos_2026-01-14.xlsx" |
| T7.2.6 | Descarga automática | Click en exportar | Archivo se descarga |

---

### F7.3 - Historial de Cambios
**Descripción:** Registro de todas las modificaciones de precios

**Información registrada:**
- Fecha y hora
- Usuario (si hay autenticación)
- Producto(s) afectado(s)
- Precio anterior
- Precio nuevo
- Tipo de actualización (individual/masiva)
- Porcentaje de cambio

**Interfaz:**
```
┌──────────────────────────────────────────────────┐
│ HISTORIAL DE CAMBIOS - ALM-0001                 │
├──────────────────────────────────────────────────┤
│ 14/01/2026 14:30                                │
│ Precio Menor: $1,600 → $1,760 (+10%)           │
│ Precio Mayor: $1,400 → $1,540 (+10%)           │
│ Actualización: Individual                        │
│                                                  │
│ 10/01/2026 09:15                                │
│ Precio Menor: $1,500 → $1,600 (+6.67%)         │
│ Actualización: Masiva (Categoría ALMACEN)       │
│                                                  │
│ ... (más cambios)                                │
└──────────────────────────────────────────────────┘
```

**Testing:**

| ID | Caso de Prueba | Acción | Resultado Esperado |
|----|----------------|--------|-------------------|
| T7.3.1 | Ver historial producto | Abrir historial ALM-0001 | Lista todos los cambios |
| T7.3.2 | Orden cronológico | Ver historial | Más recientes primero |
| T7.3.3 | Registro de individual | Actualizar 1 producto | Se registra el cambio |
| T7.3.4 | Registro de masiva | Actualizar categoría | Se registra con tipo "Masiva" |
| T7.3.5 | Cálculo de porcentaje | Ver cambio | Porcentaje calculado correctamente |
| T7.3.6 | Filtrar por fecha | Últimos 7 días | Solo muestra de esa semana |
| T7.3.7 | Exportar historial | Exportar a Excel | Excel con todas las entradas |

---

# ⚙️ MÓDULO 8: CONFIGURACIÓN Y ADMINISTRACIÓN

## Funcionalidades

### F8.1 - Configuración General
**Descripción:** Ajustes del sistema

**Opciones:**
```
╔══════════════════════════════════════════╗
║           CONFIGURACIÓN                  ║
╠══════════════════════════════════════════╣
║                                          ║
║ VISUALIZACIÓN:                           ║
║ ☑ Mostrar códigos de barras             ║
║ ☑ Mostrar diferencia porcentual         ║
║ ☑ Resaltar productos sin precio         ║
║ Vista por defecto: ⦿ Tarjetas ○ Lista  ║
║                                          ║
║ BÚSQUEDA:                                ║
║ Resultados por página: [50    ▼]       ║
║ Debounce (ms): [300]                    ║
║                                          ║
║ ACTUALIZACIONES:                         ║
║ ☑ Confirmar antes de actualización masiva║
║ ☑ Mostrar preview de cambios            ║
║ ☑ Registrar en historial                ║
║                                          ║
║ [Restablecer]           [Guardar Cambios]║
╚══════════════════════════════════════════╝
```

**Testing:**

| ID | Caso de Prueba | Cambio | Resultado Esperado |
|----|----------------|--------|-------------------|
| T8.1.1 | Cambiar vista default | Lista → Tarjetas | Nueva sesión abre en tarjetas |
| T8.1.2 | Ocultar códigos barras | Desactivar checkbox | Códigos no se muestran |
| T8.1.3 | Cambiar resultados/página | 50 → 100 | Paginación muestra 100 |
| T8.1.4 | Cambiar debounce | 300 → 500ms | Búsqueda espera 500ms |
| T8.1.5 | Desactivar confirmación | Desactivar checkbox | No pide confirmación |
| T8.1.6 | Guardar configuración | Guardar | Persiste al recargar |
| T8.1.7 | Restablecer defaults | Click en "Restablecer" | Vuelve a valores originales |

---

### F8.2 - Gestión de Base de Datos
**Descripción:** Herramientas de mantenimiento

**Opciones:**
- Backup de base de datos
- Restaurar desde backup
- Importar datos desde Excel
- Exportar toda la base de datos
- Limpiar historial antiguo
- Verificar integridad

**Testing:**

| ID | Caso de Prueba | Acción | Resultado Esperado |
|----|----------------|--------|-------------------|
| T8.2.1 | Crear backup | Click en "Backup" | Archivo .db descargado |
| T8.2.2 | Restaurar backup | Cargar archivo backup | Base de datos restaurada |
| T8.2.3 | Verificar integridad | Click en "Verificar" | Reporte de integridad |
| T8.2.4 | Limpiar historial | Eliminar >90 días | Entradas antiguas eliminadas |
| T8.2.5 | Exportar todo | Exportar base completa | Excel con todas las tablas |

---

### F8.3 - Usuarios y Permisos (Opcional - Futuro)
**Descripción:** Sistema de autenticación y roles

**Roles:**
1. **Administrador:** Acceso completo
2. **Gerente:** Consulta + Actualización
3. **Vendedor:** Solo consulta

**Testing:**

| ID | Caso de Prueba | Usuario | Resultado Esperado |
|----|----------------|---------|-------------------|
| T8.3.1 | Login administrador | Admin credentials | Acceso completo |
| T8.3.2 | Login gerente | Manager credentials | No puede configurar |
| T8.3.3 | Login vendedor | Seller credentials | Solo puede consultar |
| T8.3.4 | Logout | Click en logout | Cierra sesión |
| T8.3.5 | Sesión expirada | Esperar timeout | Redirige a login |

---

# 🎨 MÓDULO 9: INTERFAZ Y EXPERIENCIA

## Funcionalidades Transversales

### F9.1 - Diseño Responsive
**Descripción:** Adaptación a diferentes dispositivos

**Breakpoints:**
- Desktop: > 1024px
- Tablet: 768px - 1024px
- Móvil: < 768px

**Testing:**

| ID | Caso de Prueba | Dispositivo | Resultado Esperado |
|----|----------------|-------------|-------------------|
| T9.1.1 | Vista desktop | 1920x1080 | Layout en 3 columnas |
| T9.1.2 | Vista tablet | 768x1024 | Layout en 2 columnas |
| T9.1.3 | Vista móvil | 375x667 | Layout en 1 columna |
| T9.1.4 | Rotación móvil | Portrait → Landscape | Se adapta correctamente |
| T9.1.5 | Zoom navegador | 150% | Elementos legibles |
| T9.1.6 | Menú en móvil | < 768px | Menú hamburguesa |
| T9.1.7 | Tablas en móvil | < 768px | Se convierte en cards o scroll |
| T9.1.8 | Inputs en móvil | Touch en input | Teclado apropiado aparece |

---

### F9.2 - Accesibilidad
**Descripción:** Sistema usable para todos

**Características:**
- Navegación por teclado
- Etiquetas ARIA
- Contraste adecuado (WCAG AA)
- Tamaños de fuente ajustables
- Focus visible

**Testing:**

| ID | Caso de Prueba | Acción | Resultado Esperado |
|----|----------------|--------|-------------------|
| T9.2.1 | Navegación con Tab | Presionar Tab repetidamente | Foco se mueve lógicamente |
| T9.2.2 | Activar con Enter | Foco en botón + Enter | Botón se activa |
| T9.2.3 | Cerrar modal con Esc | Abrir modal + Esc | Modal se cierra |
| T9.2.4 | Contraste de colores | Verificar con herramienta | Cumple WCAG AA |
| T9.2.5 | Screen reader | Usar NVDA/JAWS | Contenido es narrado |
| T9.2.6 | Focus visible | Tab a cualquier elemento | Borde de foco visible |
| T9.2.7 | Etiquetas en inputs | Verificar HTML | Todos tienen <label> |

---

### F9.3 - Performance
**Descripción:** Sistema rápido y eficiente

**Métricas objetivo:**
- Carga inicial: < 2 segundos
- Búsqueda: < 300ms
- Actualización: < 500ms
- FCP (First Contentful Paint): < 1.5s
- LCP (Largest Contentful Paint): < 2.5s

**Testing:**

| ID | Caso de Prueba | Métrica | Resultado Esperado |
|----|----------------|---------|-------------------|
| T9.3.1 | Carga inicial | Tiempo hasta interactivo | < 2 segundos |
| T9.3.2 | Búsqueda rápida | Tiempo de respuesta | < 300ms |
| T9.3.3 | Actualización precio | Tiempo hasta confirmación | < 500ms |
| T9.3.4 | Scroll suave | Scroll en lista larga | 60 FPS |
| T9.3.5 | Cambio de página | Paginación | Instantáneo |
| T9.3.6 | Filtro aplicado | Aplicar filtro | < 200ms |
| T9.3.7 | Lista grande | 2,099 productos | Virtualización activa |

---

### F9.4 - Feedback Visual
**Descripción:** Comunicación clara con el usuario

**Elementos:**
- Loading spinners
- Toasts/Notificaciones
- Confirmaciones
- Estados de error
- Progress bars

**Testing:**

| ID | Caso de Prueba | Acción | Resultado Esperado |
|----|----------------|--------|-------------------|
| T9.4.1 | Loading en búsqueda | Iniciar búsqueda | Spinner visible |
| T9.4.2 | Éxito en actualización | Guardar cambios | Toast verde "Guardado" |
| T9.4.3 | Error en actualización | Error de red | Toast rojo con mensaje |
| T9.4.4 | Confirmación requerida | Actualización masiva | Modal "¿Está seguro?" |
| T9.4.5 | Progress bar | Importar Excel | Barra 0-100% |
| T9.4.6 | Botón deshabilitado | Formulario inválido | Botón gris, no clickable |
| T9.4.7 | Hover en botones | Mouse sobre botón | Cambio visual |
| T9.4.8 | Active state | Click en botón | Feedback táctil |

---

# 🔒 MÓDULO 10: SEGURIDAD Y ERRORES

## Funcionalidades

### F10.1 - Manejo de Errores
**Descripción:** Gestión apropiada de errores

**Tipos de errores:**
- Error de conexión (backend caído)
- Error de validación (datos inválidos)
- Error 404 (recurso no encontrado)
- Error 500 (error del servidor)
- Error de timeout

**Testing:**

| ID | Caso de Prueba | Escenario | Resultado Esperado |
|----|----------------|-----------|-------------------|
| T10.1.1 | Backend apagado | Apagar servidor + buscar | Mensaje: "No se puede conectar al servidor" |
| T10.1.2 | Producto no existe | Buscar código inválido | Mensaje: "Producto no encontrado" |
| T10.1.3 | Datos inválidos | Enviar precio negativo | Mensaje: "El precio debe ser positivo" |
| T10.1.4 | Timeout | Request muy lento | Mensaje: "La operación tomó demasiado tiempo" |
| T10.1.5 | Error genérico | Error 500 del servidor | Mensaje: "Error del servidor. Intente nuevamente" |
| T10.1.6 | Retry automático | Error temporal | Reintenta automáticamente |
| T10.1.7 | Mensaje de error claro | Cualquier error | Usuario entiende qué pasó |

---

### F10.2 - Validación de Datos
**Descripción:** Validación en frontend y backend

**Validaciones:**
- Precios >= 0
- Nombres no vacíos
- Códigos únicos
- Categorías válidas
- Tipos de datos correctos

**Testing:**

| ID | Caso de Prueba | Input | Resultado Esperado |
|----|----------------|-------|-------------------|
| T10.2.1 | Precio negativo | -100 | Error: "Precio debe ser >= 0" |
| T10.2.2 | Precio no numérico | "abc" | Error: "Ingrese un número válido" |
| T10.2.3 | Nombre vacío | "" | Error: "El nombre es obligatorio" |
| T10.2.4 | Código duplicado | Código existente | Error: "El código ya existe" |
| T10.2.5 | Categoría inválida | "INEXISTENTE" | Error: "Categoría no válida" |
| T10.2.6 | SQL Injection | "'; DROP TABLE--" | Entrada sanitizada, no ejecuta |
| T10.2.7 | XSS | "<script>alert()" | Entrada escapada, no ejecuta |

---

### F10.3 - Prevención de Pérdida de Datos
**Descripción:** Protección contra pérdida accidental

**Mecanismos:**
- Confirmación antes de eliminar
- Confirmación en cambios masivos
- Auto-guardado en formularios
- Advertencia al salir sin guardar
- Historial/Undo

**Testing:**

| ID | Caso de Prueba | Acción | Resultado Esperado |
|----|----------------|--------|-------------------|
| T10.3.1 | Cerrar formulario editado | Editar + cerrar | "¿Descartar cambios?" |
| T10.3.2 | Eliminar producto | Click en eliminar | "¿Está seguro?" |
| T10.3.3 | Actualización masiva grande | Actualizar 1000+ | "Afectará X productos. ¿Continuar?" |
| T10.3.4 | Salir con cambios | Navegar con formulario abierto | Warning browser |
| T10.3.5 | Auto-guardado | Escribir en formulario | Se guarda cada X segundos |

---

# 📱 CASOS DE USO COMPLETOS

## UC1: Atención al Cliente - Consulta Rápida de Precio

**Actor:** Vendedor  
**Frecuencia:** Múltiples veces por hora  
**Objetivo:** Consultar precio de un producto durante venta

**Flujo Normal:**
1. Cliente pregunta por producto
2. Vendedor abre sistema en tablet/PC
3. Escribe nombre del producto en buscador
4. Ve resultados en tiempo real (< 1 segundo)
5. Identifica producto correcto
6. Lee precio MENOR (minorista) al cliente
7. Cliente pregunta precio mayorista
8. Lee precio MAYOR
9. Cliente decide comprar
10. Vendedor procede con venta

**Flujos Alternativos:**
- 3a. Vendedor escanea código de barras
  - Sistema muestra producto directamente
- 4a. No encuentra producto
  - Refina búsqueda con más términos
  - O reporta producto faltante

**Testing:**

| ID | Paso | Verificación |
|----|------|-------------|
| UC1.1 | Paso 4 | Resultados aparecen < 1 segundo |
| UC1.2 | Paso 5 | Producto correcto en primeros 3 resultados |
| UC1.3 | Paso 6-8 | Precios MENOR y MAYOR claramente visibles |
| UC1.4 | Alt 3a | Código de barras funciona instantáneamente |
| UC1.5 | Alt 4a | Mensaje claro "No se encontró" |

---

## UC2: Actualización de Precios por Inflación

**Actor:** Gerente  
**Frecuencia:** Mensual  
**Objetivo:** Aumentar todos los precios de una categoría por inflación

**Flujo Normal:**
1. Gerente recibe notificación de ajuste de precios
2. Abre sistema
3. Navega a "Actualización Masiva"
4. Selecciona categoría "ALMACEN"
5. Ve que afecta 167 productos
6. Selecciona "Aumentar"
7. Ingresa porcentaje: 8.5%
8. Marca checkboxes: Precio Menor ✓, Precio Mayor ✓
9. Hace click en "Ver Preview"
10. Revisa muestra de cambios
11. Confirma que cálculos son correctos
12. Click en "Aplicar Cambios"
13. Ve progress bar 0% → 100%
14. Recibe confirmación: "167 productos actualizados"
15. Verifica algunos productos al azar
16. Documenta cambio para contabilidad

**Testing:**

| ID | Paso | Verificación |
|----|------|-------------|
| UC2.1 | Paso 5 | Contador muestra 167 correcto |
| UC2.2 | Paso 10 | Preview muestra cálculos exactos |
| UC2.3 | Paso 13 | Progress bar funciona suavemente |
| UC2.4 | Paso 14 | Confirmación muestra número correcto |
| UC2.5 | Paso 15 | Productos verificados tienen precios correctos |
| UC2.6 | Paso 16 | Cambio está registrado en historial |

---

## UC3: Productos Nuevos - Carga desde Excel

**Actor:** Administrador  
**Frecuencia:** Semanal  
**Objetivo:** Agregar nuevos productos desde proveedor

**Flujo Normal:**
1. Admin recibe Excel de proveedor con productos nuevos
2. Abre sistema
3. Navega a "Importar desde Excel"
4. Click en "Seleccionar Archivo"
5. Elige archivo del proveedor
6. Sistema valida formato (2 segundos)
7. Muestra "50 productos nuevos detectados"
8. Muestra preview de primeros 10
9. Admin revisa datos
10. Click en "Importar"
11. Sistema procesa en lotes
12. Progress bar 0% → 100%
13. Reporte: "50 productos importados exitosamente"
14. 0 errores
15. Admin verifica productos en sistema

**Flujos Alternativos:**
- 6a. Formato incorrecto
  - Error: "Columnas no coinciden"
  - Admin ajusta Excel
- 13a. Algunos errores
  - Reporte detalla qué falló
  - Admin corrige y reimporta

**Testing:**

| ID | Paso | Verificación |
|----|------|-------------|
| UC3.1 | Paso 6 | Validación completa en < 3 seg |
| UC3.2 | Paso 8 | Preview muestra datos correctos |
| UC3.3 | Paso 12 | Progress bar proporcional al trabajo |
| UC3.4 | Paso 13 | Número correcto de importados |
| UC3.5 | Alt 6a | Mensaje de error específico y útil |
| UC3.6 | Alt 13a | Reporte lista exactamente qué falló |

---

# ✅ CHECKLIST DE FUNCIONALIDADES COMPLETADO

## Módulo 1: Búsqueda ✓
- [ ] F1.1 - Búsqueda en tiempo real
- [ ] F1.2 - Búsqueda por código de barras
- [ ] F1.3 - Búsqueda avanzada

## Módulo 2: Visualización ✓
- [ ] F2.1 - Tarjeta de producto
- [ ] F2.2 - Lista de productos (grid/table)
- [ ] F2.3 - Detalle de producto

## Módulo 3: Filtros ✓
- [ ] F3.1 - Filtro por categoría
- [ ] F3.2 - Filtro por rango de precios
- [ ] F3.3 - Filtro productos sin precio
- [ ] F3.4 - Ordenamiento

## Módulo 4: Actualización Individual ✓
- [ ] F4.1 - Editar producto
- [ ] F4.2 - Ajuste rápido de precios

## Módulo 5: Actualización Masiva ✓
- [ ] F5.1 - Por categoría
- [ ] F5.2 - Por selección
- [ ] F5.3 - Importación desde Excel

## Módulo 6: Categorías ✓
- [ ] F6.1 - Vista de categorías
- [ ] F6.2 - Gestión de categorías

## Módulo 7: Estadísticas ✓
- [ ] F7.1 - Dashboard general
- [ ] F7.2 - Reportes exportables
- [ ] F7.3 - Historial de cambios

## Módulo 8: Configuración ✓
- [ ] F8.1 - Configuración general
- [ ] F8.2 - Gestión de base de datos
- [ ] F8.3 - Usuarios y permisos

## Módulo 9: UI/UX ✓
- [ ] F9.1 - Diseño responsive
- [ ] F9.2 - Accesibilidad
- [ ] F9.3 - Performance
- [ ] F9.4 - Feedback visual

## Módulo 10: Seguridad ✓
- [ ] F10.1 - Manejo de errores
- [ ] F10.2 - Validación de datos
- [ ] F10.3 - Prevención pérdida de datos

---

# 📊 RESUMEN DE TESTING

## Estadísticas de Casos de Prueba

- **Total de casos de prueba:** 150+
- **Por módulo:**
  - Búsqueda: 15 casos
  - Visualización: 18 casos
  - Filtros: 17 casos
  - Actualización Individual: 20 casos
  - Actualización Masiva: 25 casos
  - Categorías: 13 casos
  - Estadísticas: 15 casos
  - Configuración: 12 casos
  - UI/UX: 15 casos
  - Seguridad: 10 casos

## Priorización de Testing

### Prioridad 1 - CRÍTICO (Probar primero)
- Búsqueda básica de productos
- Visualización de precios MENOR y MAYOR
- Actualización individual de precios
- Actualización masiva por categoría
- Carga de datos inicial

### Prioridad 2 - ALTO (Probar segundo)
- Filtros por categoría
- Búsqueda por código de barras
- Historial de cambios
- Importación desde Excel
- Manejo de errores básicos

### Prioridad 3 - MEDIO (Probar tercero)
- Dashboard de estadísticas
- Reportes exportables
- Configuración general
- Búsqueda avanzada
- Responsive design

### Prioridad 4 - BAJO (Probar al final)
- Gestión de categorías
- Usuarios y permisos
- Accesibilidad avanzada
- Performance optimizaciones

---

# 🎯 CRITERIOS DE ACEPTACIÓN GENERAL

## Sistema considerado "Completo y Funcional" cuando:

✅ **Búsqueda:**
- Encuentra productos por nombre en < 1 segundo
- Código de barras funciona instantáneamente
- Muestra resultados relevantes

✅ **Visualización:**
- Precios MENOR y MAYOR claramente visibles
- Responsive en móvil, tablet y desktop
- Sin errores visuales

✅ **Actualización:**
- Individual funciona en < 500ms
- Masiva procesa 100+ productos sin fallar
- Confirmaciones apropiadas en lugares críticos

✅ **Seguridad:**
- Valida todos los inputs
- Maneja errores gracefully
- No pierde datos

✅ **Performance:**
- Carga inicial < 2 segundos
- Búsqueda < 300ms
- Operaciones comunes fluidas (60 FPS)

✅ **UX:**
- Intuitivo para usuarios no técnicos
- Feedback visual claro
- No requiere capacitación extensa

---

**Documento preparado por:** Sistema LA FUGA  
**Fecha:** 14 de enero de 2026  
**Versión:** 1.0 - Testing Completo

---

*Este documento debe ser usado como referencia principal para desarrollo y QA. Cada funcionalidad debe ser verificada contra estos casos de prueba antes del deploy a producción.*
