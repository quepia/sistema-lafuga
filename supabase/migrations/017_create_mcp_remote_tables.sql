-- Migration 017: MCP remoto, tokens de acceso y previews persistentes
-- Sistema de Gestión de Precios - La Fuga

CREATE TABLE IF NOT EXISTS mcp_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email TEXT NOT NULL REFERENCES authorized_users(email) ON UPDATE CASCADE,
  label TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['mcp:tools']::TEXT[],
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_mcp_access_tokens_owner_email
  ON mcp_access_tokens(owner_email);

CREATE INDEX IF NOT EXISTS idx_mcp_access_tokens_active
  ON mcp_access_tokens(active);

CREATE TABLE IF NOT EXISTS mcp_bulk_previews (
  id UUID PRIMARY KEY,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('admin', 'editor', 'vendedor', 'supervisor', 'gerente')),
  categoria TEXT,
  codigos TEXT[],
  porcentaje NUMERIC(10,2) NOT NULL,
  aplicar_a TEXT NOT NULL CHECK (aplicar_a IN ('menor', 'mayor', 'costo', 'ambos', 'todos')),
  redondeo TEXT NOT NULL CHECK (redondeo IN ('2_decimales', 'entero', 'multiplo_5', 'multiplo_10', 'multiplo_50', 'multiplo_100')),
  permitir_bajo_costo BOOLEAN NOT NULL DEFAULT false,
  total_productos INTEGER NOT NULL,
  productos_con_cambios INTEGER NOT NULL,
  productos_bajo_costo INTEGER NOT NULL,
  muestra JSONB NOT NULL,
  entries JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mcp_bulk_previews_actor_email
  ON mcp_bulk_previews(actor_email);

CREATE INDEX IF NOT EXISTS idx_mcp_bulk_previews_expires_at
  ON mcp_bulk_previews(expires_at);

ALTER TABLE mcp_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_bulk_previews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage MCP access tokens" ON mcp_access_tokens;
CREATE POLICY "Admins can manage MCP access tokens" ON mcp_access_tokens
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can manage MCP bulk previews" ON mcp_bulk_previews;
CREATE POLICY "Admins can manage MCP bulk previews" ON mcp_bulk_previews
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

COMMENT ON TABLE mcp_access_tokens IS 'Tokens Bearer para conexiones remotas al servidor MCP de La Fuga';
COMMENT ON TABLE mcp_bulk_previews IS 'Previsualizaciones persistentes para aplicar cambios masivos desde MCP remoto';
