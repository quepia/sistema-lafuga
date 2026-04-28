import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  getAuthorizedUser,
  getMcpAdminClient,
  getPublicBaseUrl,
  randomToken,
} from "@/lib/mcp/admin";

export const runtime = "nodejs";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 min

interface AuthorizeParams {
  responseType: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string | null;
  scope: string | null;
}

function readParams(url: URL): AuthorizeParams | null {
  const responseType = url.searchParams.get("response_type") ?? "";
  const clientId = url.searchParams.get("client_id") ?? "";
  const redirectUri = url.searchParams.get("redirect_uri") ?? "";
  const codeChallenge = url.searchParams.get("code_challenge") ?? "";
  const codeChallengeMethod = url.searchParams.get("code_challenge_method") ?? "S256";
  const state = url.searchParams.get("state");
  const scope = url.searchParams.get("scope");

  if (!responseType || !clientId || !redirectUri || !codeChallenge) return null;
  if (responseType !== "code") return null;
  if (codeChallengeMethod !== "S256") return null;
  return { responseType, clientId, redirectUri, codeChallenge, codeChallengeMethod, state, scope };
}

async function getSupabaseSession() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Read-only inside route handler.
        },
      },
    },
  );
  const { data } = await supabase.auth.getUser();
  return data.user;
}

async function validateClient(clientId: string, redirectUri: string) {
  const supabase = getMcpAdminClient();
  const { data } = await supabase
    .from("mcp_oauth_clients")
    .select("client_id, redirect_uris")
    .eq("client_id", clientId)
    .maybeSingle();
  if (!data) return false;
  return Array.isArray(data.redirect_uris) && data.redirect_uris.includes(redirectUri);
}

function htmlPage(body: string, title = "Autorizar Claude"): Response {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>
  body{font-family:system-ui,-apple-system,sans-serif;background:linear-gradient(135deg,#006AC0,#FF1F8F);min-height:100vh;margin:0;display:flex;align-items:center;justify-content:center;padding:1rem}
  .card{background:white;padding:2rem;border-radius:12px;max-width:420px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,0.2)}
  h1{margin:0 0 1rem;font-size:1.25rem;color:#111}
  p{color:#444;line-height:1.5}
  .row{display:flex;gap:0.5rem;margin-top:1.5rem}
  button,a.btn{flex:1;padding:0.75rem 1rem;border-radius:8px;border:none;font-size:1rem;font-weight:600;cursor:pointer;text-align:center;text-decoration:none;display:inline-block}
  .primary{background:#006AC0;color:white}
  .secondary{background:#eee;color:#333}
  .err{color:#b00020}
  code{background:#f5f5f5;padding:0.1rem 0.35rem;border-radius:4px;font-size:0.9em}
  </style></head><body><div class="card">${body}</div></body></html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function errorRedirect(redirectUri: string, error: string, state: string | null): Response {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  if (state) url.searchParams.set("state", state);
  return NextResponse.redirect(url.toString());
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = readParams(url);

  if (!params) {
    return htmlPage(
      `<h1>Solicitud inválida</h1><p class="err">Faltan parámetros OAuth (response_type, client_id, redirect_uri o code_challenge), o el método de challenge no es S256.</p>`,
    );
  }

  const clientOk = await validateClient(params.clientId, params.redirectUri);
  if (!clientOk) {
    return htmlPage(
      `<h1>Cliente no registrado</h1><p class="err">El <code>client_id</code> o <code>redirect_uri</code> enviado no está registrado en este servidor.</p>`,
    );
  }

  const user = await getSupabaseSession();
  const base = getPublicBaseUrl(req);

  if (!user || !user.email) {
    const loginUrl = `${base}/login`;
    return htmlPage(
      `<h1>Iniciá sesión primero</h1>
       <p>Para autorizar el acceso de Claude a tu cuenta, primero tenés que estar logueado en el sistema.</p>
       <p>Abrí <a href="${loginUrl}" target="_blank" rel="noopener">${loginUrl}</a>, iniciá sesión, y después <strong>recargá esta página</strong>.</p>
       <div class="row"><button class="primary" onclick="location.reload()">Ya inicié sesión, recargar</button></div>`,
    );
  }

  const authUser = await getAuthorizedUser(user.email);
  if (!authUser) {
    return htmlPage(
      `<h1>Cuenta no autorizada</h1>
       <p class="err">El email <code>${user.email}</code> no está en la lista de usuarios autorizados del sistema. Pedí a un admin que te agregue antes de continuar.</p>`,
    );
  }

  // Render consent form.
  const formAction = `${base}/api/oauth/authorize`;
  const hidden = (k: string, v: string) =>
    `<input type="hidden" name="${k}" value="${v.replace(/"/g, "&quot;")}">`;

  return htmlPage(
    `<h1>Autorizar Claude</h1>
     <p>Vas a permitir que <strong>Claude</strong> acceda al sistema La Fuga como <code>${user.email}</code> (rol <code>${authUser.role}</code>) para gestionar productos y precios.</p>
     <p style="font-size:0.85em;color:#666">Cliente OAuth: <code>${params.clientId}</code></p>
     <form method="POST" action="${formAction}">
       ${hidden("response_type", params.responseType)}
       ${hidden("client_id", params.clientId)}
       ${hidden("redirect_uri", params.redirectUri)}
       ${hidden("code_challenge", params.codeChallenge)}
       ${hidden("code_challenge_method", params.codeChallengeMethod)}
       ${params.state ? hidden("state", params.state) : ""}
       ${params.scope ? hidden("scope", params.scope) : ""}
       <div class="row">
         <button type="submit" name="decision" value="deny" class="secondary">Cancelar</button>
         <button type="submit" name="decision" value="allow" class="primary">Autorizar</button>
       </div>
     </form>`,
  );
}

export async function POST(req: Request) {
  const form = await req.formData();
  const params: AuthorizeParams | null = (() => {
    const responseType = String(form.get("response_type") ?? "");
    const clientId = String(form.get("client_id") ?? "");
    const redirectUri = String(form.get("redirect_uri") ?? "");
    const codeChallenge = String(form.get("code_challenge") ?? "");
    const codeChallengeMethod = String(form.get("code_challenge_method") ?? "S256");
    const state = (form.get("state") as string | null) ?? null;
    const scope = (form.get("scope") as string | null) ?? null;
    if (!responseType || !clientId || !redirectUri || !codeChallenge) return null;
    return { responseType, clientId, redirectUri, codeChallenge, codeChallengeMethod, state, scope };
  })();

  if (!params) {
    return htmlPage(`<h1>Solicitud inválida</h1><p class="err">Faltan parámetros del consentimiento.</p>`);
  }

  const clientOk = await validateClient(params.clientId, params.redirectUri);
  if (!clientOk) {
    return htmlPage(`<h1>Cliente no registrado</h1>`);
  }

  const decision = String(form.get("decision") ?? "");
  if (decision !== "allow") {
    return errorRedirect(params.redirectUri, "access_denied", params.state);
  }

  const user = await getSupabaseSession();
  if (!user || !user.email) {
    return errorRedirect(params.redirectUri, "login_required", params.state);
  }

  const authUser = await getAuthorizedUser(user.email);
  if (!authUser) {
    return errorRedirect(params.redirectUri, "access_denied", params.state);
  }

  const code = randomToken(24);
  const supabase = getMcpAdminClient();
  const { error } = await supabase.from("mcp_oauth_codes").insert({
    code,
    client_id: params.clientId,
    user_id: user.id,
    user_email: user.email,
    redirect_uri: params.redirectUri,
    code_challenge: params.codeChallenge,
    code_challenge_method: params.codeChallengeMethod,
    scope: params.scope ?? "mcp",
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });

  if (error) {
    return errorRedirect(params.redirectUri, "server_error", params.state);
  }

  const redirect = new URL(params.redirectUri);
  redirect.searchParams.set("code", code);
  if (params.state) redirect.searchParams.set("state", params.state);
  return NextResponse.redirect(redirect.toString());
}
