import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

type AuthorizedRole = "admin" | "editor" | "vendedor" | "supervisor" | "gerente";

type AuthorizedUserRow = {
  id: string;
  email: string;
  role: AuthorizedRole;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = dirname(__dirname);

function loadLocalEnvFiles(rootDir: string) {
  const envFiles = [".env.local", ".env", ".env.production"];

  for (const envFile of envFiles) {
    const absolutePath = join(rootDir, envFile);
    if (!existsSync(absolutePath)) continue;

    const raw = readFileSync(absolutePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;

      const key = trimmed.slice(0, separator).trim();
      if (!key || process.env[key] !== undefined) continue;

      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  }
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno requerida: ${name}`);
  return value;
}

function readArg(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hashAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function main() {
  loadLocalEnvFiles(repoRoot);

  const email = readArg("--email");
  const label = readArg("--label");
  const scopesArg = readArg("--scopes");
  const expiresInDaysArg = readArg("--days");
  const createdBy = readArg("--created-by") || email;

  if (!email || !label) {
    throw new Error(
      "Uso: node --experimental-strip-types ./scripts/create-mcp-token.ts --email usuario@dominio.com --label 'Claude Code'"
    );
  }

  const scopes = (scopesArg || "mcp:tools")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const expiresInDays = expiresInDaysArg ? Number(expiresInDaysArg) : null;
  if (expiresInDaysArg && !Number.isFinite(expiresInDays)) {
    throw new Error("--days debe ser un número.");
  }

  const supabase = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { data: authorizedUser, error: authError } = await supabase
    .from("authorized_users")
    .select("id, email, role")
    .eq("email", email)
    .single();

  if (authError || !authorizedUser) {
    throw new Error(`El email ${email} no existe en authorized_users.`);
  }

  const user = authorizedUser as AuthorizedUserRow;
  const tokenPrefix = process.env.LAFUGA_MCP_TOKEN_PREFIX || "lfmcp_live";
  const rawSecret = randomBytes(24).toString("base64url");
  const rawToken = `${tokenPrefix}_${rawSecret}`;
  const tokenHash = hashAccessToken(rawToken);
  const expiresAt =
    expiresInDays && expiresInDays > 0
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const { data: insertedToken, error: insertError } = await supabase
    .from("mcp_access_tokens")
    .insert({
      owner_email: user.email,
      label,
      token_hash: tokenHash,
      token_prefix: tokenPrefix,
      scopes,
      active: true,
      expires_at: expiresAt,
      created_by: createdBy,
      metadata: {
        owner_role: user.role,
      },
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`No se pudo crear el token: ${insertError.message}`);
  }

  process.stdout.write(
    JSON.stringify(
      {
        owner_email: user.email,
        owner_role: user.role,
        token_id: insertedToken?.id || null,
        label,
        scopes,
        expires_at: expiresAt,
        token: rawToken,
      },
      null,
      2
    ) + "\n"
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Error desconocido"}\n`);
  process.exit(1);
});
