-- Migration 014: Catalog types and configurable expiration defaults
-- Sistema de Gestion de Precios - LA FUGA

ALTER TABLE catalogos
  ADD COLUMN IF NOT EXISTS tipo_precio TEXT;

UPDATE catalogos
SET tipo_precio = 'mayor'
WHERE tipo_precio IS NULL;

ALTER TABLE catalogos
  ALTER COLUMN tipo_precio SET DEFAULT 'mayor';

ALTER TABLE catalogos
  ALTER COLUMN tipo_precio SET NOT NULL;

ALTER TABLE catalogos
  DROP CONSTRAINT IF EXISTS catalogos_tipo_precio_check;

ALTER TABLE catalogos
  ADD CONSTRAINT catalogos_tipo_precio_check
  CHECK (tipo_precio IN ('mayor', 'menor'));

ALTER TABLE catalogos
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '10 days');

COMMENT ON COLUMN catalogos.tipo_precio IS 'Lista base usada para el catalogo: mayorista o minorista';
