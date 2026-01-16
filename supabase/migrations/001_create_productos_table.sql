-- ============================================================================
-- SISTEMA LA FUGA - Migration: Create productos table
-- ============================================================================
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
--
-- IMPORTANT: After running this migration, you MUST disable RLS or create
-- a policy to allow public inserts. See the RLS section at the bottom.
-- ============================================================================

-- Drop table if exists (CAUTION: removes all data!)
-- Uncomment the next line only if you want to start fresh
-- DROP TABLE IF EXISTS productos;

-- Create the productos table with snake_case column names
CREATE TABLE IF NOT EXISTS productos (
  -- Primary key: matches CSV column 'CODIGO'
  id TEXT PRIMARY KEY,

  -- Product name: matches CSV column 'PRODUCTO'
  nombre TEXT NOT NULL,

  -- Category: matches CSV column 'CATEGORIA'
  categoria TEXT,

  -- Cost price: matches CSV column 'COSTO'
  costo NUMERIC(12, 2) DEFAULT 0,

  -- Wholesale price (precio mayorista): matches CSV column 'PRECIO_MAYOR'
  precio_mayor NUMERIC(12, 2) DEFAULT 0,

  -- Retail price (precio minorista): matches CSV column 'PRECIO_MENOR'
  precio_menor NUMERIC(12, 2) DEFAULT 0,

  -- Unit of measurement: matches CSV column 'UNIDAD'
  unidad TEXT,

  -- Barcode: matches CSV column 'CODIGO_BARRA'
  codigo_barra TEXT,

  -- Last update from CSV: matches CSV column 'ULTIMA_ACTUALIZACION'
  ultima_actualizacion TEXT,

  -- Metadata (system timestamps)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_productos_codigo_barra ON productos(codigo_barra);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to productos table
DROP TRIGGER IF EXISTS set_updated_at ON productos;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) OPTIONS
-- ============================================================================
-- Choose ONE of the following options:

-- OPTION 1: Disable RLS completely (quick start, less secure)
-- Use this for initial testing and development
ALTER TABLE productos DISABLE ROW LEVEL SECURITY;

-- OPTION 2: Enable RLS with public access policy (more controlled)
-- Uncomment these lines if you want RLS enabled but with public access:
/*
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON productos
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON productos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON productos
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete access" ON productos
  FOR DELETE USING (true);
*/

-- ============================================================================
-- MIGRATION: Add missing columns to existing table
-- ============================================================================
-- If your table already exists and is missing columns, run these:
/*
ALTER TABLE productos ADD COLUMN IF NOT EXISTS costo NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS ultima_actualizacion TEXT;
*/

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this query to verify the table was created correctly:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'productos';
