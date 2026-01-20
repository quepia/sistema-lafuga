-- =============================================
-- MIGRACIÓN 005: Campos de Imagen para Productos
-- Sistema La Fuga - v2.5
-- =============================================
-- Ejecutar en: Supabase Dashboard > SQL Editor

-- Agregar campos de imagen a la tabla productos
ALTER TABLE productos
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_source TEXT CHECK (image_source IN ('openfoodfacts', 'google', 'manual', 'not_found')),
ADD COLUMN IF NOT EXISTS image_fetched_at TIMESTAMPTZ;

-- Índice para búsquedas de productos sin imagen
CREATE INDEX IF NOT EXISTS idx_productos_sin_imagen 
ON productos (id) 
WHERE image_url IS NULL AND (estado IS NULL OR estado != 'eliminado');

-- Comentarios descriptivos
COMMENT ON COLUMN productos.image_url IS 'URL de la imagen del producto obtenida via API o cargada manualmente';
COMMENT ON COLUMN productos.image_source IS 'Origen de la imagen: openfoodfacts, google, manual, not_found';
COMMENT ON COLUMN productos.image_fetched_at IS 'Timestamp de cuando se obtuvo/actualizó la imagen';

-- Función para registrar cuando se actualiza una imagen
CREATE OR REPLACE FUNCTION update_image_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.image_url IS DISTINCT FROM OLD.image_url THEN
        NEW.image_fetched_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar timestamp automáticamente
DROP TRIGGER IF EXISTS trigger_update_image_timestamp ON productos;
CREATE TRIGGER trigger_update_image_timestamp
    BEFORE UPDATE ON productos
    FOR EACH ROW
    EXECUTE FUNCTION update_image_timestamp();
