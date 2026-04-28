import { NextResponse } from "next/server";
import {
  getMcpAdminClient,
  randomToken,
  sha256,
  verifyPkceS256,
} from "@/lib/mcp/admin";

export const runtime = "nodejs";

const ACCESS_TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 1 año

function err(error: string, description?: string, status = 400): Response {
  return NextResponse.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  // Acepta application/x-www-form-urlencoded (estándar OAuth) o JSON.
  let params: URLSearchParams;
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as Record<string, string>;
    params = new URLSearchParams(body);
  } else {
    const text = await req.text();
    params = new URLSearchParams(text);
  }

  const grantType = params.get("grant_type") ?? "";
  if (grantType !== "authorization_code") {
    return err("unsupported_grant_type", "Only authorization_code is supported");
  }

  const code = params.get("code") ?? "";
  const clientId = params.get("client_id") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const codeVerifier = params.get("code_verifier") ?? "";

  if (!code || !clientId || !redirectUri || !codeVerifier) {
    return err("invalid_request", "Missing required parameters");
  }

  const supabase = getMcpAdminClient();

  const { data: codeRow } = await supabase
    .from("mcp_oauth_codes")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (!codeRow) {
    return err("invalid_grant", "Authorization code not found");
  }
  if (codeRow.consumed_at) {
    // Defensa contra replay: si alguien usa el code dos veces, revocamos
    // todos los tokens emitidos para ese client_id + user.
    await supabase
      .from("mcp_access_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("client_id", codeRow.client_id)
      .eq("user_email", codeRow.user_email)
      .is("revoked_at", null);
    return err("invalid_grant", "Code already used");
  }
  if (new Date(codeRow.expires_at).getTime() < Date.now()) {
    return err("invalid_grant", "Code expired");
  }
  if (codeRow.client_id !== clientId) {
    return err("invalid_grant", "Code/client mismatch");
  }
  if (codeRow.redirect_uri !== redirectUri) {
    return err("invalid_grant", "Redirect URI mismatch");
  }
  if (!verifyPkceS256(codeVerifier, codeRow.code_challenge)) {
    return err("invalid_grant", "PKCE verification failed");
  }

  // Marcar code como consumido.
  await supabase
    .from("mcp_oauth_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("code", code);

  // Generar y guardar access token (hasheado).
  const accessToken = randomToken(32);
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS).toISOString();
  const { error: insErr } = await supabase.from("mcp_access_tokens").insert({
    token_hash: sha256(accessToken),
    client_id: codeRow.client_id,
    user_id: codeRow.user_id,
    user_email: codeRow.user_email,
    scope: codeRow.scope ?? "mcp",
    expires_at: expiresAt,
  });

  if (insErr) {
    return err("server_error", insErr.message, 500);
  }

  return NextResponse.json(
    {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      scope: codeRow.scope ?? "mcp",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
