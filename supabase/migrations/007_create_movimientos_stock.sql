-- Migration 007: Create movimientos_stock table for inventory tracking
-- Sistema de Gestión de Precios - LA FUGA

CREATE TABLE IF NOT EXISTS movimientos_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  producto_id TEXT NOT NULL REFERENCES productos(id),
  tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN (
    'VENTA', 'COMPRA', 'AJUSTE_MANUAL', 'MERMA', 'ROTURA',
    'VENCIMIENTO', 'DEVOLUCION_CLIENTE', 'DEVOLUCION_PROVEEDOR',
    'INVENTARIO_INICIAL', 'TRANSFERENCIA_ENTRADA',
    'TRANSFERENCIA_SALIDA', 'CONSUMO_INTERNO'
  )),
  cantidad DOUBLE PRECISION NOT NULL,
  stock_previo DOUBLE PRECISION NOT NULL,
  stock_resultante DOUBLE PRECISION NOT NULL,
  costo_unitario DOUBLE PRECISION DEFAULT 0,
  costo_total DOUBLE PRECISION DEFAULT 0,
  usuario_id TEXT,
  referencia_id UUID,
  referencia_tipo TEXT CHECK (referencia_tipo IN ('VENTA', 'COMPRA', 'AJUSTE', 'TRANSFERENCIA')),
  motivo TEXT,
  lote TEXT,
  fecha_vencimiento DATE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_movimientos_producto_fecha ON movimientos_stock(producto_id, created_at);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo_fecha ON movimientos_stock(tipo_movimiento, created_at);

-- Enable RLS
ALTER TABLE movimientos_stock ENABLE ROW LEVEL SECURITY;

-- Policies
-- Authenticated users can read movements
DROP POLICY IF EXISTS "Authenticated users can read movements" ON movimientos_stock;
CREATE POLICY "Authenticated users can read movements" ON movimientos_stock
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Authenticated users can insert movements (immutable log, no update/delete for standard users)
DROP POLICY IF EXISTS "Authenticated users can insert movements" ON movimientos_stock;
CREATE POLICY "Authenticated users can insert movements" ON movimientos_stock
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Comments
COMMENT ON TABLE movimientos_stock IS 'Bitácora inmutable de movimientos de inventario';
COMMENT ON COLUMN movimientos_stock.tipo_movimiento IS 'Tipo de operación que generó el movimiento';
COMMENT ON COLUMN movimientos_stock.stock_previo IS 'Stock antes de la operación';
COMMENT ON COLUMN movimientos_stock.stock_resultante IS 'Stock después de la operación';
