import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";

let cached: SupabaseClient | null = null;

/**
 * Cliente Supabase con service_role para uso EXCLUSIVO del servidor MCP.
 * Bypassa RLS — la autorización la aplicamos en código según el rol del
 * usuario dueño del access token.
 */
export function getMcpAdminClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Acepta ambos nombres por compatibilidad con configs viejas del proyecto.
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "MCP requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SERVICE_KEY)",
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * Verifica un PKCE code_challenge (S256) contra el code_verifier que envía
 * el cliente al endpoint /token. Spec: RFC 7636.
 */
export function verifyPkceS256(verifier: string, challenge: string): boolean {
  const hash = createHash("sha256")
    .update(verifier)
    .digest("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return hash === challenge;
}

export interface AuthorizedUser {
  email: string;
  role: "admin" | "editor" | "vendedor" | "supervisor" | "gerente";
}

const WRITE_ROLES: AuthorizedUser["role"][] = ["admin", "editor", "gerente"];

export async function getAuthorizedUser(
  email: string,
): Promise<AuthorizedUser | null> {
  const supabase = getMcpAdminClient();
  const { data } = await supabase
    .from("authorized_users")
    .select("email, role")
    .eq("email", email)
    .maybeSingle();
  return (data as AuthorizedUser | null) ?? null;
}

export function canWrite(user: AuthorizedUser): boolean {
  return WRITE_ROLES.includes(user.role);
}

/**
 * Resuelve el origin público del MCP. Preferimos NEXT_PUBLIC_APP_URL si está
 * seteada (Vercel), si no inferimos desde headers en cada request.
 */
export function getPublicBaseUrl(req?: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (req) {
    const url = new URL(req.url);
    const host =
      req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
    const proto =
      req.headers.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return "https://sistema-lafuga.vercel.app";
}

export interface AccessTokenContext {
  user: AuthorizedUser;
  userId: string; // Supabase auth.users.id (UUID), para auditoría
  clientId: string;
  tokenId: string;
}

/**
 * Valida un Bearer token contra la tabla. Devuelve el contexto del usuario
 * o null si el token no existe / vencido / revocado.
 */
export async function validateAccessToken(
  bearer: string,
): Promise<AccessTokenContext | null> {
  if (!bearer) return null;
  const supabase = getMcpAdminClient();
  const tokenHash = sha256(bearer);

  const { data: tokenRow } = await supabase
    .from("mcp_access_tokens")
    .select("id, client_id, user_id, user_email, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!tokenRow) return null;
  if (tokenRow.revoked_at) return null;
  if (new Date(tokenRow.expires_at).getTime() < Date.now()) return null;

  const user = await getAuthorizedUser(tokenRow.user_email);
  if (!user) return null;

  // Update last_used_at fire-and-forget.
  void supabase
    .from("mcp_access_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  return {
    user,
    userId: tokenRow.user_id,
    clientId: tokenRow.client_id,
    tokenId: tokenRow.id,
  };
}

export async function logAudit(params: {
  userEmail: string;
  clientId: string | null;
  toolName: string;
  args: unknown;
  status: "ok" | "error" | "denied";
  errorMessage?: string;
  durationMs: number;
}): Promise<void> {
  const supabase = getMcpAdminClient();
  await supabase.from("mcp_audit_log").insert({
    user_email: params.userEmail,
    client_id: params.clientId,
    tool_name: params.toolName,
    arguments: params.args ?? null,
    status: params.status,
    error_message: params.errorMessage ?? null,
    duration_ms: params.durationMs,
  });
}
