-- Migration 008: Create compras and compras_detalle tables for purchase management
-- Sistema de Gestión de Precios - LA FUGA

-- Tabla cabecera de compras
CREATE TABLE IF NOT EXISTS compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  numero_factura TEXT,
  tipo_documento TEXT DEFAULT 'FACTURA_A' CHECK (
    tipo_documento IN (
      'FACTURA_A', 'FACTURA_B', 'FACTURA_C', 'REMITO', 'NOTA_CREDITO'
    )
  ),
  cae TEXT,
  subtotal DOUBLE PRECISION DEFAULT 0,
  iva DOUBLE PRECISION DEFAULT 0,
  total DOUBLE PRECISION DEFAULT 0,
  estado TEXT DEFAULT 'PENDIENTE' CHECK (
    estado IN (
      'PENDIENTE', 'RECIBIDA', 'PARCIAL', 'CANCELADA'
    )
  ),
  notas TEXT,
  usuario_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla detalle de compras
CREATE TABLE IF NOT EXISTS compras_detalle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  producto_id TEXT NOT NULL REFERENCES productos(id),
  cantidad DOUBLE PRECISION NOT NULL,
  cantidad_recibida DOUBLE PRECISION,
  costo_unitario DOUBLE PRECISION NOT NULL,
  costo_total DOUBLE PRECISION NOT NULL,
  fecha_vencimiento DATE,
  lote TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_compras_proveedor_fecha ON compras(proveedor_id, fecha);
CREATE INDEX IF NOT EXISTS idx_compras_estado ON compras(estado);
CREATE INDEX IF NOT EXISTS idx_compras_detalle_compra_id ON compras_detalle(compra_id);
CREATE INDEX IF NOT EXISTS idx_compras_detalle_producto_id ON compras_detalle(producto_id);

-- Trigger function para establecer cantidad_recibida igual a cantidad por defecto
CREATE OR REPLACE FUNCTION set_cantidad_recibida_default()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cantidad_recibida IS NULL THEN
    NEW.cantidad_recibida = NEW.cantidad;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para cantidad_recibida default
DROP TRIGGER IF EXISTS set_compras_detalle_cantidad_recibida ON compras_detalle;
CREATE TRIGGER set_compras_detalle_cantidad_recibida
  BEFORE INSERT OR UPDATE ON compras_detalle
  FOR EACH ROW
  EXECUTE FUNCTION set_cantidad_recibida_default();

-- Enable RLS (Row Level Security)
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras_detalle ENABLE ROW LEVEL SECURITY;

-- Policy para usuarios autenticados (full CRUD)
DROP POLICY IF EXISTS "Usuarios autenticados pueden gestionar compras" ON compras;
CREATE POLICY "Usuarios autenticados pueden gestionar compras" ON compras
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden gestionar compras_detalle" ON compras_detalle;
CREATE POLICY "Usuarios autenticados pueden gestionar compras_detalle" ON compras_detalle
  FOR ALL USING (true) WITH CHECK (true);

-- Policy para prevenir borrado de compras RECIBIDAS
CREATE OR REPLACE FUNCTION prevent_delete_received_compra()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado = 'RECIBIDA' THEN
    RAISE EXCEPTION 'No se puede eliminar una compra con estado RECIBIDA';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_delete_compra_recibida ON compras;
CREATE TRIGGER prevent_delete_compra_recibida
  BEFORE DELETE ON compras
  FOR EACH ROW
  EXECUTE FUNCTION prevent_delete_received_compra();

-- Comments
COMMENT ON TABLE compras IS 'Cabecera de compras de mercadería a proveedores';
COMMENT ON TABLE compras_detalle IS 'Detalle de items incluidos en cada compra';
COMMENT ON COLUMN compras.proveedor_id IS 'ID del proveedor (referencia a tabla proveedores)';
COMMENT ON COLUMN compras.tipo_documento IS 'Tipo de documento: FACTURA_A, FACTURA_B, FACTURA_C, REMITO, NOTA_CREDITO';
COMMENT ON COLUMN compras.estado IS 'Estado: PENDIENTE, RECIBIDA, PARCIAL, CANCELADA';
COMMENT ON COLUMN compras_detalle.cantidad_recibida IS 'Cantidad realmente recibida (para control de recepción parcial)';
COMMENT ON COLUMN compras_detalle.lote IS 'Número de lote del producto recibido';
COMMENT ON COLUMN compras_detalle.fecha_vencimiento IS 'Fecha de vencimiento del lote';
