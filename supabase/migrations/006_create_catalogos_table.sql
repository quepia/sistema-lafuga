-- Migration 006: Create catalogos table for wholesale price lists
-- Sistema de Gestión de Precios - LA FUGA

-- Create catalogos table
CREATE TABLE IF NOT EXISTS catalogos (
  -- Primary key: UUID generated automatically
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Client name (text only, no relation to DB)
  cliente_nombre TEXT NOT NULL,

  -- Custom title for the catalog
  titulo TEXT DEFAULT 'Catálogo de Precios',

  -- Unique token for public temporary access
  public_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),

  -- Expiration date for the public link (7 days by default)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  -- Global discount percentage (0-100)
  descuento_global NUMERIC(5,2) DEFAULT 0,

  -- Visible fields configuration (JSONB)
  campos_visibles JSONB DEFAULT '{
    "foto": true,
    "nombre": true,
    "precio": true,
    "codigo": false,
    "descripcion": false,
    "unidad": true
  }'::jsonb,

  -- Catalog products with individual adjustments (JSONB array)
  -- Structure: [{ "producto_id": "ABC-001", "descuento_individual": 5, "precio_personalizado": null }]
  productos JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Catalog status
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'expirado', 'eliminado')),

  -- User who created the catalog
  creado_por TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_catalogos_public_token ON catalogos(public_token);
CREATE INDEX IF NOT EXISTS idx_catalogos_expires_at ON catalogos(expires_at);
CREATE INDEX IF NOT EXISTS idx_catalogos_cliente ON catalogos(cliente_nombre);
CREATE INDEX IF NOT EXISTS idx_catalogos_estado ON catalogos(estado);

-- Trigger function for updated_at (reuse if exists, create if not)
CREATE OR REPLACE FUNCTION update_catalogos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_catalogos_updated_at ON catalogos;
CREATE TRIGGER set_catalogos_updated_at
  BEFORE UPDATE ON catalogos
  FOR EACH ROW
  EXECUTE FUNCTION update_catalogos_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE catalogos ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users (full CRUD)
DROP POLICY IF EXISTS "Usuarios autenticados pueden gestionar catalogos" ON catalogos;
CREATE POLICY "Usuarios autenticados pueden gestionar catalogos" ON catalogos
  FOR ALL USING (true) WITH CHECK (true);

-- Policy for public access by valid token (read only, not expired)
DROP POLICY IF EXISTS "Acceso publico por token valido" ON catalogos;
CREATE POLICY "Acceso publico por token valido" ON catalogos
  FOR SELECT USING (
    public_token IS NOT NULL
    AND expires_at > NOW()
    AND estado = 'activo'
  );

-- Comment on table
COMMENT ON TABLE catalogos IS 'Catálogos de precios mayoristas personalizados para clientes';
COMMENT ON COLUMN catalogos.public_token IS 'Token único de 32 caracteres para acceso público temporal';
COMMENT ON COLUMN catalogos.campos_visibles IS 'Configuración JSON de qué campos mostrar en el catálogo';
COMMENT ON COLUMN catalogos.productos IS 'Array JSON de productos con descuentos individuales';
