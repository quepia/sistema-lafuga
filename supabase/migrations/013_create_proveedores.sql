-- Migration 007: Create proveedores table for supplier management
-- Sistema de Gestión de Precios - LA FUGA

-- Proveedores: gestión del origen de la mercadería
CREATE TABLE IF NOT EXISTS proveedores (
  -- Primary key: UUID generated automatically
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Supplier information
  nombre TEXT NOT NULL,
  cuit TEXT,
  contacto TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  condicion_pago TEXT,
  notas TEXT,

  -- Soft delete
  activo BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(nombre);
CREATE INDEX IF NOT EXISTS idx_proveedores_cuit ON proveedores(cuit);
CREATE INDEX IF NOT EXISTS idx_proveedores_activo ON proveedores(activo);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_proveedores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_proveedores_updated_at ON proveedores;
CREATE TRIGGER set_proveedores_updated_at
  BEFORE UPDATE ON proveedores
  FOR EACH ROW
  EXECUTE FUNCTION update_proveedores_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users (full CRUD)
DROP POLICY IF EXISTS "Usuarios autenticados pueden gestionar proveedores" ON proveedores;
CREATE POLICY "Usuarios autenticados pueden gestionar proveedores" ON proveedores
  FOR ALL USING (true) WITH CHECK (true);

-- Comments
COMMENT ON TABLE proveedores IS 'Proveedores de mercadería para gestión de compras e inventario';
COMMENT ON COLUMN proveedores.nombre IS 'Nombre o razón social del proveedor';
COMMENT ON COLUMN proveedores.cuit IS 'CUIT del proveedor (formato argentino)';
COMMENT ON COLUMN proveedores.condicion_pago IS 'Condiciones habituales: Contado, 30 días, etc.';
COMMENT ON COLUMN proveedores.activo IS 'Soft delete: false = desactivado, nunca eliminar para preservar referencias';
