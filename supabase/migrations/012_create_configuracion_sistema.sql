-- Migration 012: Create configuracion_sistema table
-- Sistema de Gestión de Precios - LA FUGA

CREATE TABLE IF NOT EXISTS configuracion_sistema (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  descripcion TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default values
INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
  ('metodo_costeo', 'PROMEDIO_PONDERADO', 'Método de costeo: PROMEDIO_PONDERADO, ULTIMO_COSTO, FIFO'),
  ('permitir_venta_sin_stock', 'true', 'Permitir crear ventas sin stock disponible'),
  ('alertas_stock_email', 'false', 'Enviar alertas de stock bajo por email'),
  ('dias_alerta_vencimiento', '30', 'Días antes de vencimiento para alertar')
ON CONFLICT (clave) DO NOTHING;

-- RLS
ALTER TABLE configuracion_sistema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados full CRUD" ON configuracion_sistema
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
-- Assuming logic to update updated_at if it's not handled by an extension
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_configuracion_sistema_updated_at ON configuracion_sistema;

CREATE TRIGGER update_configuracion_sistema_updated_at
BEFORE UPDATE ON configuracion_sistema
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
