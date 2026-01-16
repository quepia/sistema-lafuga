-- Tabla de ventas para el historial de ventas del POS
-- Sistema de Gestión de Precios - LA FUGA

CREATE TABLE IF NOT EXISTS ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo_venta TEXT NOT NULL CHECK (tipo_venta IN ('MAYOR', 'MENOR')),
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  metodo_pago TEXT NOT NULL DEFAULT 'Efectivo',
  cliente_nombre TEXT DEFAULT 'Cliente General',
  productos JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_ventas_created_at ON ventas (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_tipo_venta ON ventas (tipo_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_metodo_pago ON ventas (metodo_pago);

-- Índice para buscar ventas por fecha (día) - usando cast que es IMMUTABLE
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas ((created_at::date));

-- Comentarios descriptivos
COMMENT ON TABLE ventas IS 'Historial de ventas realizadas en el POS';
COMMENT ON COLUMN ventas.id IS 'Identificador único de la venta (UUID)';
COMMENT ON COLUMN ventas.created_at IS 'Fecha y hora de la venta';
COMMENT ON COLUMN ventas.tipo_venta IS 'Tipo de venta: MAYOR (mayorista) o MENOR (minorista)';
COMMENT ON COLUMN ventas.total IS 'Total de la venta en pesos';
COMMENT ON COLUMN ventas.metodo_pago IS 'Método de pago: Efectivo, Transferencia, Tarjeta';
COMMENT ON COLUMN ventas.cliente_nombre IS 'Nombre del cliente (opcional)';
COMMENT ON COLUMN ventas.productos IS 'Array JSON con los productos vendidos: [{producto_id, nombre_producto, cantidad, precio_unitario, subtotal}]';

-- Habilitar RLS (Row Level Security) si está configurado en el proyecto
-- ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura y escritura (ajustar según necesidades de autenticación)
-- CREATE POLICY "Permitir acceso a ventas para usuarios autenticados" ON ventas
--   FOR ALL USING (auth.role() = 'authenticated');
