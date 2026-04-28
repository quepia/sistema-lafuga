import { NextResponse } from "next/server";
import { getPublicBaseUrl } from "@/lib/mcp/admin";

export const runtime = "nodejs";

// RFC 8414: OAuth 2.0 Authorization Server Metadata.
export async function GET(req: Request) {
  const base = getPublicBaseUrl(req);
  return NextResponse.json({
    issuer: base,
    authorization_endpoint: `${base}/api/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    registration_endpoint: `${base}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["mcp"],
  });
}
