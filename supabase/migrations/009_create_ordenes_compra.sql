-- Migration 009: Create ordenes_compra table
-- Sistema de Gestión de Precios - LA FUGA

CREATE TABLE IF NOT EXISTS ordenes_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL, -- FK logic handled by app or subsequent migration if table doesn't exist yet in this context
  numero_orden TEXT,
  fecha_orden DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega_esperada DATE,
  estado TEXT DEFAULT 'BORRADOR' CHECK (estado IN (
    'BORRADOR', 'PENDIENTE', 'APROBADA', 'ENVIADA',
    'PARCIAL', 'COMPLETA', 'CANCELADA'
  )),
  subtotal DOUBLE PRECISION DEFAULT 0,
  iva DOUBLE PRECISION DEFAULT 0,
  total DOUBLE PRECISION DEFAULT 0,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_proveedor ON ordenes_compra(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_fecha ON ordenes_compra(fecha_orden);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_estado ON ordenes_compra(estado);

-- Enable RLS
ALTER TABLE ordenes_compra ENABLE ROW LEVEL SECURITY;

-- Policies
-- Authenticated users have full CRUD access
DROP POLICY IF EXISTS "Authenticated users full access to ordenes_compra" ON ordenes_compra;
CREATE POLICY "Authenticated users full access to ordenes_compra" ON ordenes_compra
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Comments
COMMENT ON TABLE ordenes_compra IS 'Tabla maestra de órdenes de compra a proveedores';
