import { NextResponse } from "next/server";
import { getPublicBaseUrl } from "@/lib/mcp/admin";

export const runtime = "nodejs";

// RFC 9728: OAuth 2.0 Protected Resource Metadata.
// Le dice al cliente MCP cuál es el authorization server para este recurso.
export async function GET(req: Request) {
  const base = getPublicBaseUrl(req);
  return NextResponse.json({
    resource: `${base}/api/mcp`,
    authorization_servers: [base],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp"],
    resource_documentation: `${base}/api/mcp`,
  });
}
