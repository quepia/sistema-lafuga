# Pasos Manuales - Módulo de Inventario y Stock

Este documento describe los pasos manuales necesarios para que el módulo de inventario funcione correctamente.

---

## 1. Ejecutar las migraciones en Supabase

Las migraciones deben ejecutarse **en orden** en el SQL Editor de Supabase (https://supabase.com/dashboard → tu proyecto → SQL Editor).

Ejecutar cada archivo SQL de la carpeta `supabase/migrations/` en este orden:

| # | Archivo | Qué hace |
|---|---------|----------|
| 007 | `007_create_movimientos_stock.sql` | Tabla de movimientos de stock (entradas, salidas, ajustes) |
| 008 | `008_create_compras_tables.sql` | Tablas de compras y detalle de compras |
| 009 | `009_create_ordenes_compra.sql` | Tabla de órdenes de compra |
| 010 | `010_add_stock_fields_to_productos.sql` | Agrega campos de stock a la tabla productos (stock_actual, stock_minimo, etc.) |
| 011 | `011_create_composicion_combos.sql` | Tabla para composición de combos |
| 012 | `012_create_configuracion_sistema.sql` | Tabla de configuración del sistema |
| 013 | `013_create_proveedores.sql` | Tabla de proveedores |

**Importante:** Las migraciones 001-006 ya estaban aplicadas. Solo hay que ejecutar las nuevas (007-013).

### Cómo ejecutar cada migración:
1. Ir a Supabase Dashboard → SQL Editor
2. Abrir cada archivo `.sql` de la carpeta `supabase/migrations/`
3. Copiar el contenido y pegarlo en el SQL Editor
4. Hacer clic en "Run"
5. Verificar que no haya errores antes de pasar a la siguiente

---

## 2. Verificar las políticas RLS (Row Level Security)

Las migraciones incluyen políticas RLS. Después de ejecutarlas, verificar en Supabase Dashboard → Authentication → Policies que las siguientes tablas tengan políticas habilitadas:

- `movimientos_stock`
- `compras`
- `compra_detalles`
- `ordenes_compra` (si existe)
- `composicion_combos`
- `configuracion_sistema`
- `proveedores`

---

## 3. Verificar que las tablas se crearon correctamente

En Supabase Dashboard → Table Editor, verificar que existan estas tablas nuevas:

- [x] `movimientos_stock`
- [x] `compras`
- [x] `compra_detalles`
- [x] `composicion_combos`
- [x] `configuracion_sistema`
- [x] `proveedores`

Y que la tabla `productos` tenga los nuevos campos:
- `stock_actual` (numeric, default 0)
- `stock_minimo` (numeric, default 0)
- `stock_maximo` (numeric, nullable)
- `stock_reservado` (numeric, default 0)
- `punto_pedido` (numeric, nullable)
- `permite_stock_negativo` (boolean, default false)
- `unidad_stock` (text, default 'unidad')
- `unidad_compra` (text, default 'unidad')
- `factor_conversion` (numeric, default 1)
- `merma_esperada` (numeric, default 0)
- `ubicacion_deposito` (text, nullable)
- `controla_vencimiento` (boolean, default false)
- `proveedor_predeterminado_id` (uuid, nullable, FK a proveedores)
- `es_combo` (boolean, default false)

---

## 4. Inicializar stock de productos existentes (opcional)

Si querés arrancar el inventario con stock para los productos existentes, podés ejecutar un UPDATE masivo en SQL:

```sql
-- Ejemplo: poner stock inicial de 10 a todos los productos activos
UPDATE productos
SET stock_actual = 10, stock_minimo = 2
WHERE estado = 'activo';
```

O hacerlo producto por producto desde la UI de ajustes de stock (`/inventario/ajustes`).

---

## 5. Configurar stock mínimo por producto

Para que las alertas de stock funcionen correctamente, cada producto debe tener un `stock_minimo` configurado mayor a 0. Esto se puede hacer:

- Desde la UI de edición de producto (si Agent D agregó los campos al ProductFormDialog)
- O con un UPDATE en SQL:

```sql
-- Ejemplo: stock mínimo de 5 para todos los productos
UPDATE productos SET stock_minimo = 5 WHERE estado = 'activo';
```

---

## 6. Método `obtenerAlertasStock` - Nota importante

El método `obtenerAlertasStock` en `lib/api.ts` usa `.filter('stock_actual', 'lte', 'stock_minimo')` para comparar dos columnas. Supabase JS client v2 puede interpretar `'stock_minimo'` como un string literal en vez de una columna.

**Si las alertas no funcionan correctamente**, crear una función RPC en Supabase:

```sql
CREATE OR REPLACE FUNCTION obtener_alertas_stock()
RETURNS TABLE (
  id TEXT,
  nombre TEXT,
  stock_actual NUMERIC,
  stock_minimo NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.nombre, p.stock_actual, p.stock_minimo
  FROM productos p
  WHERE p.estado = 'activo'
    AND p.stock_minimo IS NOT NULL
    AND p.stock_minimo > 0
    AND p.stock_actual <= p.stock_minimo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Y luego modificar el método en `lib/api.ts` para usar:
```typescript
const { data, error } = await supabase.rpc('obtener_alertas_stock');
```

---

## 7. Desplegar la aplicación

Una vez ejecutadas las migraciones y verificadas las tablas:

```bash
npm run build   # Verificar que compila sin errores
npm run dev     # Probar localmente
```

Si todo funciona, desplegar normalmente a tu plataforma (Vercel, etc.).

---

## 8. Archivos que se pueden limpiar

Estos archivos son residuos del proceso de desarrollo y se pueden eliminar:

- `app/auth/callback/page.tsx.bak` — Backup del archivo que generaba conflicto con `route.ts`
- `app/auth/callback/page.tsx.disabled` — Otro backup del mismo
- `MODULO DE INVENTARIO Y STOCK.md` — Especificación del módulo (ya implementado)
- `backup-la-fuga-spec.md` — Si es un backup de la spec

---

## Resumen de rutas nuevas del módulo

| Ruta | Descripción |
|------|-------------|
| `/inventario` | Dashboard de inventario (KPIs + alertas) |
| `/inventario/productos` | Listado de productos con stock |
| `/inventario/compras` | Historial de compras |
| `/inventario/compras/nueva` | Registrar nueva compra |
| `/inventario/proveedores` | Gestión de proveedores |
| `/inventario/ajustes` | Ajustes manuales de stock |
| `/inventario/movimientos` | Historial de movimientos de stock |
