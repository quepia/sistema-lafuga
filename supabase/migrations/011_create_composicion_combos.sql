-- Migration 011: Create composicion_combos table for product kits
-- Sistema de Gestión de Precios - LA FUGA

CREATE TABLE IF NOT EXISTS composicion_combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_padre_id TEXT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  producto_hijo_id TEXT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad DOUBLE PRECISION NOT NULL DEFAULT 1,
  UNIQUE(producto_padre_id, producto_hijo_id)
);

-- Índices:
-- (producto_padre_id) — componentes de un combo
CREATE INDEX IF NOT EXISTS idx_combos_padre ON composicion_combos(producto_padre_id);
-- (producto_hijo_id) — combos que usan un producto
CREATE INDEX IF NOT EXISTS idx_combos_hijo ON composicion_combos(producto_hijo_id);

-- RLS
ALTER TABLE composicion_combos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados full CRUD" ON composicion_combos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE composicion_combos IS 'Tabla de relación para productos tipo combo/kit';
