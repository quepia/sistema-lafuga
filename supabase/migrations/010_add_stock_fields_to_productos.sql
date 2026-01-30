-- Migration 010: Add stock and inventory fields to productos table
-- Sistema de Gestión de Precios - LA FUGA

-- Stock quantities
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock_actual DOUBLE PRECISION DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock_minimo DOUBLE PRECISION DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock_maximo DOUBLE PRECISION;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock_reservado DOUBLE PRECISION DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS punto_pedido DOUBLE PRECISION;

-- Stock behavior
ALTER TABLE productos ADD COLUMN IF NOT EXISTS permite_stock_negativo BOOLEAN DEFAULT true;

-- Units and conversion
ALTER TABLE productos ADD COLUMN IF NOT EXISTS unidad_stock TEXT DEFAULT 'unidad';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS unidad_compra TEXT DEFAULT 'unidad';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS factor_conversion DOUBLE PRECISION DEFAULT 1;

-- Waste and location
ALTER TABLE productos ADD COLUMN IF NOT EXISTS merma_esperada DOUBLE PRECISION DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS ubicacion_deposito TEXT;

-- Expiration control
ALTER TABLE productos ADD COLUMN IF NOT EXISTS controla_vencimiento BOOLEAN DEFAULT false;

-- Supplier
ALTER TABLE productos ADD COLUMN IF NOT EXISTS proveedor_predeterminado_id UUID;

-- Combo/Kit flag
ALTER TABLE productos ADD COLUMN IF NOT EXISTS es_combo BOOLEAN DEFAULT false;

-- Índices:
-- Index for low stock alerts
CREATE INDEX IF NOT EXISTS idx_productos_stock_bajo ON productos(stock_actual) WHERE stock_actual <= stock_minimo;

-- Index for combo products
CREATE INDEX IF NOT EXISTS idx_productos_combos ON productos(es_combo) WHERE es_combo = true;

COMMENT ON COLUMN productos.stock_actual IS 'Stock actual disponible';
COMMENT ON COLUMN productos.stock_minimo IS 'Stock mínimo antes de alerta';
COMMENT ON COLUMN productos.es_combo IS 'Indica si el producto es un combo/kit compuesto por otros';
