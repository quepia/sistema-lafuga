-- ============================================================================
-- SISTEMA LA FUGA - Migration 017: MCP OAuth + Audit
-- ============================================================================
-- Soporte para servidor MCP remoto con OAuth 2.1 (PKCE + DCR).
-- Las tablas son administradas por el servidor (service role) y no son
-- consultadas desde el cliente, por eso RLS queda activo y sin policies
-- públicas: solo el service role puede leer/escribir.
-- ============================================================================

-- Clientes OAuth registrados dinámicamente (RFC 7591).
-- Claude móvil registra automáticamente su client_id la primera vez.
CREATE TABLE IF NOT EXISTS mcp_oauth_clients (
    client_id TEXT PRIMARY KEY,
    client_secret_hash TEXT,                -- NULL para clientes públicos (PKCE)
    client_name TEXT,
    redirect_uris TEXT[] NOT NULL,
    grant_types TEXT[] NOT NULL DEFAULT ARRAY['authorization_code'],
    token_endpoint_auth_method TEXT NOT NULL DEFAULT 'none',
    scope TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Authorization codes efímeros con PKCE.
CREATE TABLE IF NOT EXISTS mcp_oauth_codes (
    code TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES mcp_oauth_clients(client_id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    code_challenge TEXT NOT NULL,
    code_challenge_method TEXT NOT NULL DEFAULT 'S256',
    scope TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_oauth_codes_expires ON mcp_oauth_codes(expires_at);

-- Access tokens activos. El token enviado por el cliente se guarda hasheado
-- (SHA-256) para que un dump de la tabla no exponga credenciales válidas.
CREATE TABLE IF NOT EXISTS mcp_access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT UNIQUE NOT NULL,
    client_id TEXT NOT NULL REFERENCES mcp_oauth_clients(client_id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    scope TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_access_tokens_hash ON mcp_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_mcp_access_tokens_user ON mcp_access_tokens(user_email);
CREATE INDEX IF NOT EXISTS idx_mcp_access_tokens_expires ON mcp_access_tokens(expires_at);

-- Auditoría de cada llamada a tool del MCP. Pensada para el caso de
-- precios — guarda input, output (truncado) y status.
CREATE TABLE IF NOT EXISTS mcp_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    client_id TEXT,
    tool_name TEXT NOT NULL,
    arguments JSONB,
    status TEXT NOT NULL CHECK (status IN ('ok', 'error', 'denied')),
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_audit_log_user ON mcp_audit_log(user_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_log_tool ON mcp_audit_log(tool_name, created_at DESC);

-- RLS: estas tablas solo las toca el service role del MCP.
ALTER TABLE mcp_oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_oauth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_audit_log ENABLE ROW LEVEL SECURITY;

-- (Sin policies = nadie puede leer/escribir vía anon/authenticated.
--  El service role bypassa RLS y es el único que las usa.)

-- Cleanup helper: borra codes y tokens vencidos. Llamarla periódicamente
-- (cron de Supabase o desde el server al iniciar).
CREATE OR REPLACE FUNCTION mcp_cleanup_expired()
RETURNS void AS $$
BEGIN
    DELETE FROM mcp_oauth_codes WHERE expires_at < NOW() - INTERVAL '1 day';
    DELETE FROM mcp_access_tokens WHERE expires_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
