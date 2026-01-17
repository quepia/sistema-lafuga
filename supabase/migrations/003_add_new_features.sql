-- ============================================================================
-- SISTEMA LA FUGA - Migration 003: Add New Features
-- ============================================================================
-- New Features:
-- 1. Product descriptions (descripcion)
-- 2. Unit-based pricing (peso_neto, volumen_neto)
-- 3. Fractional sales support (permite_venta_fraccionada)
-- 4. Soft delete for products (estado, motivo_eliminacion)
-- 5. Product change history (historial_productos table)
-- 6. Enhanced sales with discounts and custom pricing
-- ============================================================================

-- ============================================================================
-- PART 1: PRODUCTOS TABLE MODIFICATIONS
-- ============================================================================

-- Add new columns to existing productos table
ALTER TABLE productos ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS peso_neto NUMERIC(10,3);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS volumen_neto NUMERIC(10,3);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS permite_venta_fraccionada BOOLEAN DEFAULT FALSE;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'activo';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS motivo_eliminacion TEXT;

-- Add estado constraint (activo, inactivo, eliminado)
-- First check if constraint exists and drop it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'productos_estado_check') THEN
        ALTER TABLE productos DROP CONSTRAINT productos_estado_check;
    END IF;
END $$;

ALTER TABLE productos ADD CONSTRAINT productos_estado_check
  CHECK (estado IN ('activo', 'inactivo', 'eliminado'));

-- Add index for estado column for filtering
CREATE INDEX IF NOT EXISTS idx_productos_estado ON productos(estado);

-- Add comments to new columns
COMMENT ON COLUMN productos.descripcion IS 'Descripcion detallada del producto, aclaraciones, ingredientes, instrucciones de uso, etc.';
COMMENT ON COLUMN productos.peso_neto IS 'Peso neto en kilogramos (para productos de MASCOTAS que se venden por peso)';
COMMENT ON COLUMN productos.volumen_neto IS 'Volumen neto en litros (para productos SUELTOS/QUIMICA que se venden por volumen)';
COMMENT ON COLUMN productos.permite_venta_fraccionada IS 'Permite vender en cantidades fraccionadas (ej: 2.5kg, 1.5L)';
COMMENT ON COLUMN productos.estado IS 'Estado del producto: activo, inactivo o eliminado';
COMMENT ON COLUMN productos.motivo_eliminacion IS 'Razon por la cual el producto fue eliminado o inactivado';

-- ============================================================================
-- PART 2: HISTORIAL_PRODUCTOS TABLE (Product Change History)
-- ============================================================================

-- Table to track all product changes
CREATE TABLE IF NOT EXISTS historial_productos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_producto TEXT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    codigo_sku TEXT NOT NULL,
    campo_modificado VARCHAR(100) NOT NULL,
    valor_anterior TEXT,
    valor_nuevo TEXT,
    motivo TEXT,
    id_usuario UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_historial_producto ON historial_productos(id_producto);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_productos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_historial_campo ON historial_productos(campo_modificado);

-- Comments
COMMENT ON TABLE historial_productos IS 'Registro de todos los cambios realizados en productos';
COMMENT ON COLUMN historial_productos.id_producto IS 'Referencia al producto modificado';
COMMENT ON COLUMN historial_productos.codigo_sku IS 'Codigo SKU del producto al momento del cambio';
COMMENT ON COLUMN historial_productos.campo_modificado IS 'Nombre del campo que fue modificado';
COMMENT ON COLUMN historial_productos.valor_anterior IS 'Valor antes del cambio';
COMMENT ON COLUMN historial_productos.valor_nuevo IS 'Valor despues del cambio';
COMMENT ON COLUMN historial_productos.motivo IS 'Razon del cambio (opcional)';
COMMENT ON COLUMN historial_productos.id_usuario IS 'Usuario que realizo el cambio';

-- ============================================================================
-- PART 3: VENTAS TABLE MODIFICATIONS
-- ============================================================================

-- Add columns for global discounts
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS descuento_global NUMERIC(10,2) DEFAULT 0;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS descuento_global_porcentaje NUMERIC(5,2) DEFAULT 0;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS descuento_global_motivo TEXT;

-- Add authorization tracking
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS requirio_autorizacion BOOLEAN DEFAULT FALSE;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS autorizado_por UUID;

-- Add subtotal column (before discounts)
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2);

-- Comments for ventas new columns
COMMENT ON COLUMN ventas.descuento_global IS 'Monto total de descuento aplicado a toda la venta';
COMMENT ON COLUMN ventas.descuento_global_porcentaje IS 'Porcentaje de descuento global aplicado';
COMMENT ON COLUMN ventas.descuento_global_motivo IS 'Razon del descuento (cliente frecuente, promocion, etc.)';
COMMENT ON COLUMN ventas.requirio_autorizacion IS 'Indica si la venta requirio autorizacion de supervisor';
COMMENT ON COLUMN ventas.autorizado_por IS 'Usuario que autorizo el descuento';
COMMENT ON COLUMN ventas.subtotal IS 'Subtotal antes de aplicar descuento global';

-- Update comment for productos column to document the extended structure
COMMENT ON COLUMN ventas.productos IS 'Array JSON de productos vendidos. Estructura extendida: [{
  producto_id: string,
  nombre_producto: string,
  cantidad: number,
  precio_lista_menor: number,
  precio_lista_mayor: number,
  costo_unitario: number,
  tipo_precio: "menor" | "mayor" | "custom",
  precio_unitario: number (PRECIO REAL DE VENTA),
  descuento_linea: number,
  descuento_linea_porcentaje: number,
  motivo_descuento: string,
  subtotal: number
}]';

-- ============================================================================
-- PART 4: DATABASE FUNCTIONS
-- ============================================================================

-- Function to calculate price per kg
CREATE OR REPLACE FUNCTION calcular_precio_por_kg(
    p_precio NUMERIC(10,2),
    p_peso_neto NUMERIC(10,3)
)
RETURNS NUMERIC(10,2) AS $$
BEGIN
    IF p_peso_neto IS NULL OR p_peso_neto <= 0 THEN
        RETURN NULL;
    END IF;
    RETURN ROUND(p_precio / p_peso_neto, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate price per liter
CREATE OR REPLACE FUNCTION calcular_precio_por_litro(
    p_precio NUMERIC(10,2),
    p_volumen_neto NUMERIC(10,3)
)
RETURNS NUMERIC(10,2) AS $$
BEGIN
    IF p_volumen_neto IS NULL OR p_volumen_neto <= 0 THEN
        RETURN NULL;
    END IF;
    RETURN ROUND(p_precio / p_volumen_neto, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calcular_precio_por_kg IS 'Calcula el precio por kilogramo para productos que se venden por peso';
COMMENT ON FUNCTION calcular_precio_por_litro IS 'Calcula el precio por litro para productos que se venden por volumen';

-- ============================================================================
-- PART 5: RLS POLICIES (Optional - Disable if not using auth)
-- ============================================================================

-- For historial_productos - currently disabled to match productos table behavior
-- Uncomment if using Supabase Auth:

/*
ALTER TABLE historial_productos ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can view history
CREATE POLICY "Usuarios pueden ver historial de productos" ON historial_productos
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: authenticated users can insert history
CREATE POLICY "Usuarios pueden insertar historial" ON historial_productos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
*/

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify the migration)
-- ============================================================================
/*
-- Check productos table columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'productos'
ORDER BY ordinal_position;

-- Check historial_productos table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'historial_productos'
ORDER BY ordinal_position;

-- Check ventas table new columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'ventas'
  AND column_name IN ('descuento_global', 'descuento_global_porcentaje', 'descuento_global_motivo', 'requirio_autorizacion', 'autorizado_por', 'subtotal')
ORDER BY ordinal_position;

-- Check functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('calcular_precio_por_kg', 'calcular_precio_por_litro');
*/
