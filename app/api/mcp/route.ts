import { NextResponse } from "next/server";
import {
  getPublicBaseUrl,
  logAudit,
  validateAccessToken,
  type AccessTokenContext,
} from "@/lib/mcp/admin";
import { TOOLS, findTool, runTool } from "@/lib/mcp/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = {
  name: "sistema-lafuga-mcp",
  version: "1.0.0",
};

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
}

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

function rpcResult(id: JsonRpcRequest["id"], result: unknown) {
  return { jsonrpc: "2.0" as const, id: id ?? null, result };
}

function rpcError(id: JsonRpcRequest["id"], error: JsonRpcError) {
  return { jsonrpc: "2.0" as const, id: id ?? null, error };
}

function unauthorized(req: Request): Response {
  const base = getPublicBaseUrl(req);
  return new Response(
    JSON.stringify({ error: "unauthorized" }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        // RFC 9728: anuncia el protected resource metadata.
        "WWW-Authenticate": `Bearer realm="MCP", resource_metadata="${base}/.well-known/oauth-protected-resource"`,
      },
    },
  );
}

async function handleRpc(
  msg: JsonRpcRequest,
  ctx: AccessTokenContext,
): Promise<unknown | null> {
  const isNotification = msg.id === undefined || msg.id === null;

  switch (msg.method) {
    case "initialize": {
      return rpcResult(msg.id, {
        protocolVersion: PROTOCOL_VERSION,
        serverInfo: SERVER_INFO,
        capabilities: {
          tools: { listChanged: false },
        },
        instructions:
          "Servidor MCP del Sistema La Fuga. Permite consultar y actualizar productos y precios. Cada modificación queda en el historial atribuida al usuario que conectó Claude.",
      });
    }

    case "notifications/initialized":
    case "notifications/cancelled": {
      return null; // notification, no response
    }

    case "ping": {
      return rpcResult(msg.id, {});
    }

    case "tools/list": {
      return rpcResult(msg.id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });
    }

    case "tools/call": {
      const params = (msg.params ?? {}) as { name?: string; arguments?: unknown };
      const tool = params.name ? findTool(params.name) : undefined;
      if (!tool) {
        return rpcError(msg.id, { code: -32602, message: `Tool no encontrada: ${params.name}` });
      }
      const start = Date.now();
      const result = await runTool(tool, params.arguments ?? {}, ctx);
      void logAudit({
        userEmail: ctx.user.email,
        clientId: ctx.clientId,
        toolName: tool.name,
        args: params.arguments ?? null,
        status: result.isError ? "error" : "ok",
        errorMessage: result.isError ? result.content[0]?.text : undefined,
        durationMs: Date.now() - start,
      });
      return rpcResult(msg.id, result);
    }

    default: {
      if (isNotification) return null;
      return rpcError(msg.id, { code: -32601, message: `Método no soportado: ${msg.method}` });
    }
  }
}

export async function GET(req: Request) {
  // Streamable HTTP permite GET para SSE server-initiated. No usamos eventos
  // de ese tipo. Si llega sin auth devolvemos 401 (con WWW-Authenticate para
  // que el cliente arranque el flujo OAuth); si llega con auth válida, 405.
  const auth = req.headers.get("authorization") ?? "";
  if (!auth) return unauthorized(req);
  return new Response("Method Not Allowed", { status: 405 });
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return unauthorized(req);

  const ctx = await validateAccessToken(match[1].trim());
  if (!ctx) return unauthorized(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(rpcError(null, { code: -32700, message: "Parse error" }), { status: 400 });
  }

  // JSON-RPC permite batch requests (array). Lo soportamos.
  const messages: JsonRpcRequest[] = Array.isArray(body) ? body : [body as JsonRpcRequest];
  const responses: unknown[] = [];

  for (const m of messages) {
    if (!m || typeof m !== "object" || (m as JsonRpcRequest).jsonrpc !== "2.0" || typeof (m as JsonRpcRequest).method !== "string") {
      responses.push(rpcError((m as JsonRpcRequest)?.id ?? null, { code: -32600, message: "Invalid Request" }));
      continue;
    }
    const out = await handleRpc(m, ctx);
    if (out !== null) responses.push(out);
  }

  if (responses.length === 0) {
    // Solo notificaciones → 202 sin body.
    return new Response(null, { status: 202 });
  }

  return NextResponse.json(Array.isArray(body) ? responses : responses[0]);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
    },
  });
}
