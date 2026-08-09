# MCP La Fuga remoto

Servidor MCP remoto por `HTTP` para exponer la gestión de precios de La Fuga a Claude desde internet.

## Qué quedó listo

- Transporte remoto `Streamable HTTP` en `POST /mcp`
- Autenticación `Bearer` por request
- Soporte para dos tipos de token:
  - token propio del MCP almacenado en Supabase
  - JWT de usuario emitido por Supabase Auth
- Persistencia de `preview_id` en base de datos para cambios masivos
- Auditoría por producto en historial
- Endpoints auxiliares:
  - `GET /health`
  - `POST /mcp`

## Variables mínimas

El servidor carga automáticamente `.env.local`, `.env` y `.env.production`.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
LAFUGA_MCP_BASE_URL=https://mcp.tu-dominio.com/mcp
```

Variables útiles:

```bash
LAFUGA_MCP_PORT=3018
LAFUGA_MCP_HOST=0.0.0.0
LAFUGA_MCP_ALLOWED_ORIGINS=http://localhost:6274,http://127.0.0.1:6274
LAFUGA_MCP_TOKEN_PREFIX=lfmcp_live
LAFUGA_MCP_READONLY=false
LAFUGA_MCP_MAX_BULK_PERCENT=35
LAFUGA_MCP_PREVIEW_TTL_MINUTES=20
LAFUGA_MCP_MUTATION_ROLES=admin,editor,supervisor,gerente
LAFUGA_MCP_BULK_ROLES=admin,supervisor,gerente
LAFUGA_MCP_CONFIG_ROLES=admin,gerente
```

## Migraciones necesarias

Antes de usar el remoto, corré también la migración:

```text
supabase/migrations/017_create_mcp_remote_tables.sql
```

Esa migración crea:

- `mcp_access_tokens`
- `mcp_bulk_previews`

## Ejecutarlo localmente como remoto

```bash
npm run mcp:start
```

Health check:

```bash
curl http://127.0.0.1:3018/health
```

## Crear un token para Claude

Primero asegurate de que el email exista en `authorized_users`.

Después:

```bash
npm run mcp:create-token -- --email tu-email@dominio.com --label "Claude Code"
```

Opcionales:

```bash
npm run mcp:create-token -- --email tu-email@dominio.com --label "Produccion" --days 30
npm run mcp:create-token -- --email tu-email@dominio.com --label "API" --scopes mcp:tools
```

El script imprime el token solo una vez. Guardalo como secreto.
También devuelve `token_id`, que sirve para revocarlo después.

## Conectar Claude Code al remoto

Con URL pública y token ya creados:

```bash
claude mcp add --transport http lafuga-precios https://mcp.tu-dominio.com/mcp \
  --header "Authorization: Bearer TU_TOKEN"
```

O usando `.mcp.json` con variables de entorno:

```json
{
  "mcpServers": {
    "lafuga-precios": {
      "type": "http",
      "url": "${LAFUGA_MCP_BASE_URL}",
      "headers": {
        "Authorization": "Bearer ${LAFUGA_MCP_TOKEN}"
      }
    }
  }
}
```

## Conector remoto vía Messages API

También podés usarlo como servidor MCP remoto desde la API de Anthropic pasando `authorization_token`.

Ejemplo conceptual:

```json
{
  "mcp_servers": [
    {
      "type": "url",
      "name": "lafuga-precios",
      "url": "https://mcp.tu-dominio.com/mcp",
      "authorization_token": "TU_TOKEN"
    }
  ]
}
```

## Despliegue

### Opción simple: Docker

Se incluye [mcp/Dockerfile](/Volumes/Kingston/PROYECTOS%20WEB/SISTEMA%20DE%20GESTION%20DE%20PRECIOS/mcp/Dockerfile).

Build:

```bash
docker build -f mcp/Dockerfile -t lafuga-mcp .
```

Run:

```bash
docker run --rm -p 3018:3018 \
  -e NEXT_PUBLIC_SUPABASE_URL \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY \
  -e SUPABASE_SERVICE_ROLE_KEY \
  -e LAFUGA_MCP_BASE_URL \
  lafuga-mcp
```

### Opción PaaS

Para Render, Railway o Fly:

- Runtime Node 24
- Comando de arranque: `npm run mcp:start`
- Puerto: usar `PORT`
- Variables: las mismas del bloque anterior
- URL pública terminando en `/mcp`

## Gestión de tokens

Para revocar un token existente:

```bash
npm run mcp:revoke-token -- --id UUID_DEL_TOKEN
```

También podés revocarlo por combinación de email y label:

```bash
npm run mcp:revoke-token -- --email tu-email@dominio.com --label "Claude Code"
```

## Safeguards incluidos

- Requiere `Bearer` válido para cada request
- Valida que el actor exista en `authorized_users`
- Puede correr en modo solo lectura
- Limita porcentaje máximo de cambios masivos
- Obliga `preview_id` para aplicar masivos
- Bloquea previews vencidos o ya usados
- Registra historial por producto

## Flujo recomendado para cambios masivos

1. `buscar_productos` o `listar_categorias`
2. `previsualizar_actualizacion_masiva_precios`
3. revisar `preview_id`, muestra y riesgos
4. `aplicar_actualizacion_masiva_precios`
