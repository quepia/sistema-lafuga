import { NextResponse } from "next/server";
import { getMcpAdminClient, randomToken } from "@/lib/mcp/admin";

export const runtime = "nodejs";

// RFC 7591: Dynamic Client Registration.
// Claude móvil llama acá para registrarse antes de iniciar OAuth.
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "Body must be JSON" },
      { status: 400 },
    );
  }

  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
  if (redirectUris.length === 0 || !redirectUris.every((u): u is string => typeof u === "string")) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: "redirect_uris is required" },
      { status: 400 },
    );
  }

  const clientId = `mcp_${randomToken(12)}`;
  const clientName = typeof body.client_name === "string" ? body.client_name : "MCP Client";
  const grantTypes = Array.isArray(body.grant_types) && body.grant_types.length > 0
    ? body.grant_types.filter((g): g is string => typeof g === "string")
    : ["authorization_code"];

  const supabase = getMcpAdminClient();
  const { error } = await supabase.from("mcp_oauth_clients").insert({
    client_id: clientId,
    client_secret_hash: null, // Public client (PKCE)
    client_name: clientName,
    redirect_uris: redirectUris,
    grant_types: grantTypes,
    token_endpoint_auth_method: "none",
    scope: "mcp",
  });

  if (error) {
    return NextResponse.json(
      { error: "server_error", error_description: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      client_id: clientId,
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: grantTypes,
      token_endpoint_auth_method: "none",
      scope: "mcp",
    },
    { status: 201 },
  );
}
