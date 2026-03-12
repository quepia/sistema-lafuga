-- Migration 015: Public catalog RPC that bypasses productos RLS safely by token

DROP FUNCTION IF EXISTS public.obtener_catalogo_publico(TEXT);

CREATE OR REPLACE FUNCTION public.obtener_catalogo_publico(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_catalogo catalogos%ROWTYPE;
  v_productos JSONB;
BEGIN
  SELECT *
  INTO v_catalogo
  FROM catalogos
  WHERE public_token = p_token
    AND estado = 'activo'
    AND expires_at > NOW()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    jsonb_agg(to_jsonb(p) ORDER BY cp.ordinality),
    '[]'::jsonb
  )
  INTO v_productos
  FROM jsonb_array_elements(v_catalogo.productos) WITH ORDINALITY AS cp(item, ordinality)
  JOIN productos p
    ON p.id = cp.item ->> 'producto_id'
  WHERE COALESCE(p.estado, 'activo') <> 'eliminado';

  RETURN jsonb_build_object(
    'catalogo', to_jsonb(v_catalogo),
    'productos', v_productos
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obtener_catalogo_publico(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.obtener_catalogo_publico(TEXT) TO authenticated;
