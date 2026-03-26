-- ============================================================================
-- SISTEMA LA FUGA - Migration: Multiple barcodes per product
-- ============================================================================

CREATE TABLE IF NOT EXISTS producto_codigos_barra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id TEXT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  codigo_barra TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_producto_codigos_barra_codigo UNIQUE (codigo_barra)
);

CREATE INDEX IF NOT EXISTS idx_producto_codigos_barra_producto_id
  ON producto_codigos_barra(producto_id);

CREATE INDEX IF NOT EXISTS idx_producto_codigos_barra_codigo
  ON producto_codigos_barra(codigo_barra);

INSERT INTO producto_codigos_barra (producto_id, codigo_barra)
SELECT id, BTRIM(codigo_barra)
FROM productos
WHERE codigo_barra IS NOT NULL
  AND BTRIM(codigo_barra) <> ''
ON CONFLICT (codigo_barra) DO NOTHING;

CREATE OR REPLACE FUNCTION validar_y_normalizar_codigo_barra_principal()
RETURNS TRIGGER AS $$
BEGIN
  NEW.codigo_barra := NULLIF(BTRIM(COALESCE(NEW.codigo_barra, '')), '');

  IF NEW.codigo_barra IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM producto_codigos_barra pcb
      WHERE pcb.codigo_barra = NEW.codigo_barra
        AND pcb.producto_id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'El código de barras % ya está asociado a otro producto', NEW.codigo_barra;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sincronizar_codigo_barra_principal_en_relacion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo_barra IS NOT NULL THEN
    INSERT INTO producto_codigos_barra (producto_id, codigo_barra)
    VALUES (NEW.id, NEW.codigo_barra)
    ON CONFLICT (codigo_barra) DO UPDATE
      SET producto_id = EXCLUDED.producto_id
      WHERE producto_codigos_barra.producto_id = EXCLUDED.producto_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_codigo_barra_principal ON productos;
CREATE TRIGGER trg_validar_codigo_barra_principal
  BEFORE INSERT OR UPDATE OF codigo_barra ON productos
  FOR EACH ROW
  EXECUTE FUNCTION validar_y_normalizar_codigo_barra_principal();

DROP TRIGGER IF EXISTS trg_sync_codigo_barra_principal ON productos;
CREATE TRIGGER trg_sync_codigo_barra_principal
  AFTER INSERT OR UPDATE OF codigo_barra ON productos
  FOR EACH ROW
  EXECUTE FUNCTION sincronizar_codigo_barra_principal_en_relacion();
