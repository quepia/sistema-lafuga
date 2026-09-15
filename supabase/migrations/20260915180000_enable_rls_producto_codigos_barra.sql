-- ============================================================================
-- SISTEMA LA FUGA - Migration: Enable RLS on producto_codigos_barra
-- Resuelve el lint 0013_rls_disabled_in_public.
-- Misma regla de acceso que productos: solo usuarios autorizados.
-- Los triggers de productos y buscar_productos_paginados son SECURITY INVOKER,
-- por lo que siguen funcionando para usuarios autorizados. El servidor MCP usa
-- service_role y no se ve afectado por RLS.
-- ============================================================================

ALTER TABLE producto_codigos_barra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authorized users can view barcodes" ON producto_codigos_barra;
CREATE POLICY "Authorized users can view barcodes" ON producto_codigos_barra
  FOR SELECT USING (is_authorized());

DROP POLICY IF EXISTS "Authorized users can modify barcodes" ON producto_codigos_barra;
CREATE POLICY "Authorized users can modify barcodes" ON producto_codigos_barra
  FOR ALL USING (is_authorized()) WITH CHECK (is_authorized());
