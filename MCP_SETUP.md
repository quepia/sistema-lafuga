# MCP Server — Sistema La Fuga

Servidor MCP remoto integrado en la propia app Next.js. Permite conectar
Claude (móvil o desktop) al sistema para gestionar productos y precios.

## Arquitectura

- **Endpoint MCP**: `POST https://sistema-lafuga.vercel.app/api/mcp`
- **OAuth 2.1 con PKCE + Dynamic Client Registration** (RFC 7591/7636/8414/9728).
- **Discovery**:
  - `/.well-known/oauth-protected-resource`
  - `/.well-known/oauth-authorization-server`
- **Endpoints OAuth**:
  - `POST /api/oauth/register` — registro dinámico de clientes.
  - `GET/POST /api/oauth/authorize` — login + consentimiento.
  - `POST /api/oauth/token` — intercambio code → access_token.
- **Tokens**: opacos (32 bytes hex), guardados hasheados (SHA-256) en
  `mcp_access_tokens`. TTL: 1 año.
- **Identidad**: el usuario se autentica con su sesión existente de Supabase
  (cookies). El email se mapea contra `authorized_users` para resolver rol.
- **Auditoría**: cada llamada a tool se registra en `mcp_audit_log`.

## Tools expuestas (v1)

Todas validan el rol del usuario en `authorized_users`.

| Tool | Rol mínimo | Descripción |
|---|---|---|
| `buscar_producto` | cualquier autorizado | Búsqueda parcial por nombre/categoría/código de barras |
| `obtener_producto` | cualquier autorizado | Lectura por id exacto |
| `listar_productos` | cualquier autorizado | Listado paginado con filtro opcional por categoría |
| `actualizar_precio` | admin / editor / gerente | Cambia `precio_menor` y/o `precio_mayor` |
| `actualizar_producto` | admin / editor / gerente | Cambia campos generales (nombre, categoría, costo, unidad, código de barras, descripción) |

Cada actualización escribe entradas en `historial_productos` con el id del
usuario MCP y el motivo (si se envió).

## Setup en Supabase

1. Aplicar la migración `017_create_mcp_oauth_tables.sql` en el SQL Editor del
   dashboard. Crea: `mcp_oauth_clients`, `mcp_oauth_codes`, `mcp_access_tokens`,
   `mcp_audit_log` y la función `mcp_cleanup_expired()`.
2. (Opcional) Programar un cron diario que llame a `mcp_cleanup_expired()`
   para borrar codes y tokens vencidos.

## Setup en Vercel

Variables de entorno necesarias (Project Settings → Environment Variables):

| Variable | Tipo | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Ya configurada |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Ya configurada |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | **Crítica**. Nunca exponer al cliente |
| `NEXT_PUBLIC_APP_URL` | Public | `https://sistema-lafuga.vercel.app` |

Después de setear las vars, hacer un nuevo deploy.

## Conectar Claude (móvil)

1. Abrí Claude móvil → **Settings** → **Connectors** → **Add custom connector**.
2. URL: `https://sistema-lafuga.vercel.app/api/mcp`
3. Claude detecta automáticamente el OAuth y abre tu navegador.
4. Si no estás logueado en el sistema → te pide loguearte primero.
5. Una vez logueado, recargás la página de autorización y aparece el botón
   **Autorizar**. Tocás → Claude queda conectado.
6. El access token vive 1 año. Si lo querés revocar antes, hacés en Supabase:
   ```sql
   UPDATE mcp_access_tokens SET revoked_at = NOW() WHERE user_email = 'tu@email';
   ```

## Conectar Claude Desktop

Mismo flujo: Settings → Connectors → Add custom MCP server → URL del endpoint.

## Probar manualmente

```bash
# Discovery
curl https://sistema-lafuga.vercel.app/.well-known/oauth-authorization-server

# Llamada con token (después del flujo OAuth)
curl -X POST https://sistema-lafuga.vercel.app/api/mcp \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Auditoría

Para ver el historial de llamadas:

```sql
SELECT created_at, user_email, tool_name, status, duration_ms, arguments
FROM mcp_audit_log
ORDER BY created_at DESC
LIMIT 50;
```

Para ver cambios de precios hechos por MCP:

```sql
SELECT h.created_at, h.id_producto, h.campo_modificado, h.valor_anterior, h.valor_nuevo, h.motivo
FROM historial_productos h
WHERE h.motivo LIKE 'MCP%'
ORDER BY h.created_at DESC;
```

## Seguridad

- El access token se guarda **hasheado** (SHA-256). Un dump de la tabla no
  expone tokens válidos.
- Replay de authorization codes detectado: si un code se intenta canjear dos
  veces, se revocan todos los tokens del par cliente/usuario.
- PKCE S256 obligatorio.
- El servidor solo acepta clientes registrados con redirect_uri exacto.
- El rol del usuario se valida en cada llamada a tool (no se confía en el
  token para autorización, solo para autenticación).
