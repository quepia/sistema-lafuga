import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

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

async function main() {
  loadLocalEnvFiles(repoRoot);

  const id = readArg("--id");
  const email = readArg("--email");
  const label = readArg("--label");

  if (!id && !(email && label)) {
    throw new Error(
      "Uso: node --experimental-strip-types ./scripts/revoke-mcp-token.ts --id UUID_DEL_TOKEN\n" +
        "o bien: node --experimental-strip-types ./scripts/revoke-mcp-token.ts --email usuario@dominio.com --label 'Claude Code'"
    );
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

  let query = supabase
    .from("mcp_access_tokens")
    .update({
      active: false,
      expires_at: new Date().toISOString(),
    })
    .eq("active", true);

  if (id) {
    query = query.eq("id", id);
  } else {
    query = query.eq("owner_email", email!).eq("label", label!);
  }

  const { data, error } = await query.select("id, owner_email, label, active, expires_at");
  if (error) {
    throw new Error(`No se pudo revocar el token: ${error.message}`);
  }

  const updated = data || [];
  if (updated.length === 0) {
    throw new Error("No se encontró ningún token activo que coincida con ese criterio.");
  }

  process.stdout.write(
    JSON.stringify(
      {
        revoked: updated,
        count: updated.length,
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
