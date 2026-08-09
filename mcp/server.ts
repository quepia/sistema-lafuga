import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

import type {
  Compra,
  CompraConDetalle,
  CompraDetalle,
  ConfiguracionSistema,
  HistorialProducto,
  MovimientoStock,
  Producto,
  ProductoInsert,
  ProductoUpdate,
  Proveedor,
  ProveedorInsert,
  ProveedorUpdate,
  TipoAjuste,
  TipoDocumentoCompra,
} from "../lib/supabase.ts";

type AuthorizedRole = "admin" | "editor" | "vendedor" | "supervisor" | "gerente";
type ApplyTo = "menor" | "mayor" | "costo" | "ambos" | "todos";
type RoundingMode =
  | "2_decimales"
  | "entero"
  | "multiplo_5"
  | "multiplo_10"
  | "multiplo_50"
  | "multiplo_100";

type ActorContext = {
  id: string;
  email: string;
  role: AuthorizedRole;
};

type Config = {
  repoRoot: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  baseUrl: string;
  port: number;
  host: string;
  allowedOrigins: string[];
  tokenPrefix: string;
  readonlyMode: boolean;
  previewTtlMinutes: number;
  maxBulkPercent: number;
  mutationRoles: Set<AuthorizedRole>;
  bulkRoles: Set<AuthorizedRole>;
  configRoles: Set<AuthorizedRole>;
  maxSearchLimit: number;
};

type BulkPreviewEntry = {
  producto_id: string;
  nombre: string;
  categoria: string | null;
  before: Partial<Pick<Producto, "precio_menor" | "precio_mayor" | "costo">>;
  after: Partial<Pick<Producto, "precio_menor" | "precio_mayor" | "costo">>;
  cambios: string[];
  queda_bajo_costo: boolean;
};

type BulkPreview = {
  preview_id: string;
  actor_email: string;
  actor_role: AuthorizedRole;
  created_at: string;
  expires_at: string;
  porcentaje: number;
  aplicar_a: ApplyTo;
  redondeo: RoundingMode;
  permitir_bajo_costo: boolean;
  categoria?: string;
  codigos?: string[];
  total_productos: number;
  productos_con_cambios: number;
  productos_bajo_costo: number;
  muestra: BulkPreviewEntry[];
  entries: BulkPreviewEntry[];
};

type ProductoBarcodeRow = {
  producto_id: string;
  codigo_barra: string;
};

type AuthorizedUserRow = {
  id: string;
  email: string;
  role: AuthorizedRole;
};

type McpAccessTokenRow = {
  id: string;
  owner_email: string;
  label: string;
  token_hash: string;
  token_prefix: string;
  active: boolean;
  expires_at: string | null;
  scopes: string[] | null;
};

type McpPreviewRow = {
  id: string;
  actor_email: string;
  actor_role: AuthorizedRole;
  categoria: string | null;
  codigos: string[] | null;
  porcentaje: number;
  aplicar_a: ApplyTo;
  redondeo: RoundingMode;
  permitir_bajo_costo: boolean;
  total_productos: number;
  productos_con_cambios: number;
  productos_bajo_costo: number;
  muestra: BulkPreviewEntry[];
  entries: BulkPreviewEntry[];
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

type RequestAuth = {
  actor: ActorContext;
  tokenType: "personal_access_token" | "supabase_jwt";
  scopes: string[];
  tokenLabel?: string;
};

type AuthenticatedRequest = Request & {
  lafugaAuth?: RequestAuth;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = dirname(__dirname);

const productFields = [
  "id",
  "nombre",
  "categoria",
  "costo",
  "precio_mayor",
  "precio_menor",
  "unidad",
  "codigo_barra",
  "ultima_actualizacion",
  "created_at",
  "updated_at",
  "descripcion",
  "peso_neto",
  "volumen_neto",
  "permite_venta_fraccionada",
  "estado",
  "motivo_eliminacion",
  "stock_actual",
  "stock_minimo",
  "stock_maximo",
  "stock_reservado",
  "punto_pedido",
  "permite_stock_negativo",
  "unidad_stock",
  "unidad_compra",
  "factor_conversion",
  "merma_esperada",
  "ubicacion_deposito",
  "controla_vencimiento",
  "proveedor_predeterminado_id",
  "es_combo",
].join(", ");

function writeLog(message: string) {
  process.stderr.write(`[lafuga-mcp] ${message}\n`);
}

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

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return ["1", "true", "yes", "si"].includes(value.toLowerCase());
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function parseRoleSet(value: string | undefined, fallback: AuthorizedRole[]): Set<AuthorizedRole> {
  const roles = (value || fallback.join(","))
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) as AuthorizedRole[];
  return new Set(roles);
}

function requiredEnv(name: string, fallback?: string): string {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

function parseCsvList(value: string | undefined): string[] {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  if (!url.pathname || url.pathname === "/") {
    url.pathname = "/mcp";
  }
  return url.toString();
}

function loadConfig(): Config {
  loadLocalEnvFiles(repoRoot);

  return {
    repoRoot,
    supabaseUrl: requiredEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.LAFUGA_SUPABASE_URL),
    supabaseAnonKey: requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: requiredEnv(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.LAFUGA_MCP_SUPABASE_SERVICE_ROLE_KEY
    ),
    baseUrl: normalizeBaseUrl(requiredEnv("LAFUGA_MCP_BASE_URL", "http://127.0.0.1:3018/mcp")),
    port: parseNumber(process.env.PORT || process.env.LAFUGA_MCP_PORT, 3018),
    host: process.env.LAFUGA_MCP_HOST || "0.0.0.0",
    allowedOrigins: parseCsvList(process.env.LAFUGA_MCP_ALLOWED_ORIGINS),
    tokenPrefix: process.env.LAFUGA_MCP_TOKEN_PREFIX || "lfmcp_live",
    readonlyMode: parseBoolean(process.env.LAFUGA_MCP_READONLY, false),
    previewTtlMinutes: parseNumber(process.env.LAFUGA_MCP_PREVIEW_TTL_MINUTES, 20),
    maxBulkPercent: parseNumber(process.env.LAFUGA_MCP_MAX_BULK_PERCENT, 35),
    mutationRoles: parseRoleSet(process.env.LAFUGA_MCP_MUTATION_ROLES, [
      "admin",
      "editor",
      "supervisor",
      "gerente",
    ]),
    bulkRoles: parseRoleSet(process.env.LAFUGA_MCP_BULK_ROLES, [
      "admin",
      "supervisor",
      "gerente",
    ]),
    configRoles: parseRoleSet(process.env.LAFUGA_MCP_CONFIG_ROLES, ["admin", "gerente"]),
    maxSearchLimit: parseNumber(process.env.LAFUGA_MCP_MAX_SEARCH_LIMIT, 100),
  };
}

function createSupabase(config: Config): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "X-Client-Info": "lafuga-mcp/1.0.0",
      },
    },
  });
}

function toJsonText(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function successResult<T>(summary: string, data: T) {
  return {
    content: [
      {
        type: "text" as const,
        text: `${summary}\n\n${toJsonText(data)}`,
      },
    ],
  };
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : "Error desconocido";
  return {
    content: [
      {
        type: "text" as const,
        text: message,
      },
    ],
    isError: true,
  };
}

function roundMoney(value: number, mode: RoundingMode): number {
  if (!Number.isFinite(value)) return value;

  switch (mode) {
    case "entero":
      return Math.round(value);
    case "multiplo_5":
      return Math.round(value / 5) * 5;
    case "multiplo_10":
      return Math.round(value / 10) * 10;
    case "multiplo_50":
      return Math.round(value / 50) * 50;
    case "multiplo_100":
      return Math.round(value / 100) * 100;
    case "2_decimales":
    default:
      return Math.round(value * 100) / 100;
  }
}

function normalizeBarcodes(codes: Array<string | null | undefined>): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const code of codes) {
    const cleaned = code?.trim();
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    normalized.push(cleaned);
  }

  return normalized;
}

function assertMutationAllowed(
  actor: ActorContext,
  config: Config,
  allowedRoles: Set<AuthorizedRole>,
  actionLabel: string
) {
  if (config.readonlyMode) {
    throw new Error("El MCP está en modo solo lectura. Desactivá LAFUGA_MCP_READONLY para permitir cambios.");
  }

  if (!allowedRoles.has(actor.role)) {
    throw new Error(
      `El rol ${actor.role} no tiene permiso para ${actionLabel}. Roles permitidos: ${Array.from(allowedRoles).join(", ")}.`
    );
  }

  return actor;
}

async function fetchBarcodeMap(supabase: SupabaseClient, productIds: string[]) {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
  const map = new Map<string, string[]>();

  if (uniqueIds.length === 0) return map;

  const { data, error } = await supabase
    .from("producto_codigos_barra")
    .select("producto_id, codigo_barra")
    .in("producto_id", uniqueIds);

  if (error) throw new Error(error.message);

  for (const row of ((data || []) as ProductoBarcodeRow[])) {
    const current = map.get(row.producto_id) || [];
    current.push(row.codigo_barra);
    map.set(row.producto_id, current);
  }

  return map;
}

async function attachBarcodes(supabase: SupabaseClient, products: Producto[]): Promise<Producto[]> {
  const barcodeMap = await fetchBarcodeMap(
    supabase,
    products.map((product) => product.id)
  );

  return products.map((product) => {
    const merged = normalizeBarcodes([
      product.codigo_barra,
      ...(product.codigos_barra || []),
      ...(barcodeMap.get(product.id) || []),
    ]);

    return {
      ...product,
      codigo_barra: product.codigo_barra || merged[0] || null,
      codigos_barra: merged,
    };
  });
}

async function syncProductBarcodes(
  supabase: SupabaseClient,
  productId: string,
  codes: string[]
) {
  const normalized = normalizeBarcodes(codes);

  const { data: conflicts, error: conflictError } = await supabase
    .from("producto_codigos_barra")
    .select("producto_id, codigo_barra")
    .in("codigo_barra", normalized)
    .neq("producto_id", productId);

  if (conflictError) throw new Error(conflictError.message);
  if ((conflicts || []).length > 0) {
    const firstConflict = conflicts?.[0] as { codigo_barra: string } | undefined;
    throw new Error(`El código de barras ${firstConflict?.codigo_barra} ya está asociado a otro producto.`);
  }

  const { data: currentRows, error: currentError } = await supabase
    .from("producto_codigos_barra")
    .select("codigo_barra")
    .eq("producto_id", productId);

  if (currentError) throw new Error(currentError.message);

  const current = new Set(
    ((currentRows || []) as Array<{ codigo_barra: string }>).map((row) => row.codigo_barra)
  );
  const next = new Set(normalized);

  const toDelete = Array.from(current).filter((item) => !next.has(item));
  const toInsert = normalized.filter((item) => !current.has(item));

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("producto_codigos_barra")
      .delete()
      .eq("producto_id", productId)
      .in("codigo_barra", toDelete);

    if (error) throw new Error(error.message);
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("producto_codigos_barra").insert(
      toInsert.map((codigo_barra) => ({
        producto_id: productId,
        codigo_barra,
      }))
    );

    if (error) throw new Error(error.message);
  }
}

async function getProductById(supabase: SupabaseClient, productId: string) {
  const { data, error } = await supabase
    .from("productos")
    .select(productFields)
    .eq("id", productId)
    .single();

  if (error || !data) {
    throw new Error(`No existe el producto ${productId}.`);
  }

  const [product] = await attachBarcodes(supabase, [data as unknown as Producto]);
  return product;
}

async function getProductByBarcode(supabase: SupabaseClient, barcode: string) {
  const normalized = barcode.trim();
  const { data: primary, error: primaryError } = await supabase
    .from("productos")
    .select(productFields)
    .eq("codigo_barra", normalized)
    .maybeSingle();

  if (primaryError) throw new Error(primaryError.message);
  if (primary) {
    const [product] = await attachBarcodes(supabase, [primary as unknown as Producto]);
    return product;
  }

  const { data: secondary, error: secondaryError } = await supabase
    .from("producto_codigos_barra")
    .select("producto_id")
    .eq("codigo_barra", normalized)
    .maybeSingle();

  if (secondaryError) throw new Error(secondaryError.message);
  if (!secondary?.producto_id) {
    throw new Error(`No existe un producto con el código de barras ${normalized}.`);
  }

  return getProductById(supabase, secondary.producto_id);
}

async function insertHistoryRows(
  supabase: SupabaseClient,
  actor: ActorContext,
  productId: string,
  changes: Array<{ field: string; before: unknown; after: unknown; reason: string }>
) {
  if (changes.length === 0) return;

  const payload = changes.map((change) => ({
    id_producto: productId,
    codigo_sku: productId,
    campo_modificado: change.field,
    valor_anterior: change.before === undefined || change.before === null ? null : String(change.before),
    valor_nuevo: change.after === undefined || change.after === null ? null : String(change.after),
    motivo: `${change.reason} (MCP por ${actor.email})`,
    id_usuario: actor.id,
  }));

  const { error } = await supabase.from("historial_productos").insert(payload);
  if (error) throw new Error(error.message);
}

function sanitizePriceGuards(
  nextValues: Partial<Pick<Producto, "precio_menor" | "precio_mayor" | "costo">>,
  allowBelowCost: boolean
) {
  const costo = nextValues.costo ?? 0;
  const menor = nextValues.precio_menor;
  const mayor = nextValues.precio_mayor;

  const violations: string[] = [];

  if (!allowBelowCost && costo > 0) {
    if (menor !== undefined && menor < costo) {
      violations.push("precio_menor");
    }
    if (mayor !== undefined && mayor < costo) {
      violations.push("precio_mayor");
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `La operación deja precios por debajo del costo en: ${violations.join(", ")}. Si realmente querés permitirlo, enviá permitir_bajo_costo=true.`
    );
  }
}

function hasAtLeastOneDefined(values: unknown[]) {
  return values.some((value) => value !== undefined);
}

function hashAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function getAuthorizedUserByEmail(supabase: SupabaseClient, email: string): Promise<ActorContext> {
  const { data, error } = await supabase
    .from("authorized_users")
    .select("id, email, role")
    .eq("email", email)
    .single();

  if (error || !data) {
    throw new Error(`El usuario ${email} no está autorizado en authorized_users.`);
  }

  return data as AuthorizedUserRow;
}

async function verifyPatToken(
  supabase: SupabaseClient,
  token: string
): Promise<RequestAuth | null> {
  const tokenHash = hashAccessToken(token);
  const { data, error } = await supabase
    .from("mcp_access_tokens")
    .select("id, owner_email, label, token_hash, token_prefix, active, expires_at, scopes")
    .eq("token_hash", tokenHash)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Error verificando token MCP: ${error.message}`);
  }
  if (!data) {
    return null;
  }

  const row = data as McpAccessTokenRow;
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    throw new Error("El token MCP está vencido.");
  }

  const actor = await getAuthorizedUserByEmail(supabase, row.owner_email);
  await supabase
    .from("mcp_access_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);

  return {
    actor,
    tokenType: "personal_access_token",
    scopes: row.scopes || ["mcp:tools"],
    tokenLabel: row.label,
  };
}

async function verifySupabaseJwt(
  config: Config,
  supabase: SupabaseClient,
  token: string
): Promise<RequestAuth | null> {
  const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Error verificando JWT de Supabase: ${response.status} ${response.statusText}`);
  }

  const user = (await response.json()) as { email?: string };
  if (!user.email) {
    throw new Error("El JWT de Supabase no contiene email.");
  }

  const actor = await getAuthorizedUserByEmail(supabase, user.email);
  return {
    actor,
    tokenType: "supabase_jwt",
    scopes: ["mcp:tools"],
  };
}

async function authenticateBearerToken(
  config: Config,
  supabase: SupabaseClient,
  token: string
): Promise<RequestAuth> {
  const patAuth = await verifyPatToken(supabase, token);
  if (patAuth) return patAuth;

  const jwtAuth = await verifySupabaseJwt(config, supabase, token);
  if (jwtAuth) return jwtAuth;

  throw new Error("Token inválido o no autorizado.");
}

async function savePreview(
  supabase: SupabaseClient,
  actor: ActorContext,
  preview: BulkPreview
) {
  const { error } = await supabase.from("mcp_bulk_previews").insert({
    id: preview.preview_id,
    actor_email: preview.actor_email,
    actor_role: preview.actor_role,
    categoria: preview.categoria || null,
    codigos: preview.codigos || null,
    porcentaje: preview.porcentaje,
    aplicar_a: preview.aplicar_a,
    redondeo: preview.redondeo,
    permitir_bajo_costo: preview.permitir_bajo_costo,
    total_productos: preview.total_productos,
    productos_con_cambios: preview.productos_con_cambios,
    productos_bajo_costo: preview.productos_bajo_costo,
    muestra: preview.muestra,
    entries: preview.entries,
    expires_at: preview.expires_at,
    used_at: null,
    created_at: preview.created_at,
    created_by: actor.email,
  });

  if (error) {
    throw new Error(`No se pudo guardar el preview: ${error.message}`);
  }
}

async function getPreview(
  supabase: SupabaseClient,
  previewId: string
): Promise<McpPreviewRow | null> {
  const { data, error } = await supabase
    .from("mcp_bulk_previews")
    .select("*")
    .eq("id", previewId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo leer el preview ${previewId}: ${error.message}`);
  }

  return (data as McpPreviewRow | null) || null;
}

async function markPreviewUsed(supabase: SupabaseClient, previewId: string) {
  const { error } = await supabase
    .from("mcp_bulk_previews")
    .update({ used_at: new Date().toISOString() })
    .eq("id", previewId);

  if (error) {
    throw new Error(`No se pudo cerrar el preview ${previewId}: ${error.message}`);
  }
}

function buildBulkPreview(
  products: Producto[],
  porcentaje: number,
  aplicarA: ApplyTo,
  rounding: RoundingMode,
  allowBelowCost: boolean,
  sampleSize: number
): Omit<BulkPreview, "preview_id" | "actor_email" | "actor_role" | "created_at" | "expires_at" | "categoria" | "codigos"> {
  const factor = 1 + porcentaje / 100;
  const entries: BulkPreviewEntry[] = [];

  for (const product of products) {
    const before = {
      precio_menor: product.precio_menor,
      precio_mayor: product.precio_mayor,
      costo: product.costo,
    };
    const after = { ...before };
    const changes: string[] = [];

    if ((aplicarA === "menor" || aplicarA === "ambos" || aplicarA === "todos") && product.precio_menor > 0) {
      after.precio_menor = roundMoney(product.precio_menor * factor, rounding);
      changes.push("precio_menor");
    }
    if ((aplicarA === "mayor" || aplicarA === "ambos" || aplicarA === "todos") && product.precio_mayor > 0) {
      after.precio_mayor = roundMoney(product.precio_mayor * factor, rounding);
      changes.push("precio_mayor");
    }
    if ((aplicarA === "costo" || aplicarA === "todos") && product.costo > 0) {
      after.costo = roundMoney(product.costo * factor, rounding);
      changes.push("costo");
    }

    if (changes.length === 0) continue;

    const compareCost = after.costo ?? product.costo ?? 0;
    const quedaBajoCosto =
      (!!after.precio_menor && compareCost > 0 && after.precio_menor < compareCost) ||
      (!!after.precio_mayor && compareCost > 0 && after.precio_mayor < compareCost);

    entries.push({
      producto_id: product.id,
      nombre: product.nombre,
      categoria: product.categoria,
      before,
      after,
      cambios: changes,
      queda_bajo_costo: quedaBajoCosto,
    });
  }

  return {
    porcentaje,
    aplicar_a: aplicarA,
    redondeo: rounding,
    permitir_bajo_costo: allowBelowCost,
    total_productos: products.length,
    productos_con_cambios: entries.length,
    productos_bajo_costo: entries.filter((entry) => entry.queda_bajo_costo).length,
    muestra: entries.slice(0, sampleSize),
    entries,
  };
}

const config = loadConfig();
const supabase = createSupabase(config);

const emptyInputSchema = {};

const searchProductsInputSchema = {
  query: z.string().trim().optional(),
  categoria: z.string().trim().optional(),
  incluir_inactivos: z.boolean().default(false),
  solo_sin_codigo_barras: z.boolean().default(false),
  limit: z.number().int().min(1).max(config.maxSearchLimit).default(25),
  offset: z.number().int().min(0).default(0),
};

const productLookupInputSchema = {
  id: z.string().trim().optional(),
  codigo_barra: z.string().trim().optional(),
};

const createProductInputSchema = {
  id: z.string().trim().min(1),
  nombre: z.string().trim().min(1),
  categoria: z.string().trim().optional(),
  costo: z.number().min(0).default(0),
  precio_menor: z.number().min(0).default(0),
  precio_mayor: z.number().min(0).default(0),
  unidad: z.string().trim().optional(),
  codigo_barra: z.string().trim().optional(),
  codigos_barra: z.array(z.string().trim().min(1)).optional(),
  descripcion: z.string().trim().optional(),
  stock_actual: z.number().optional(),
  stock_minimo: z.number().optional(),
  stock_maximo: z.number().optional(),
  proveedor_predeterminado_id: z.string().uuid().optional(),
  motivo: z.string().trim().min(3),
  permitir_bajo_costo: z.boolean().default(false),
};

const updateProductInputSchema = {
  producto_id: z.string().trim().min(1),
  nombre: z.string().trim().optional(),
  categoria: z.string().trim().optional(),
  costo: z.number().min(0).optional(),
  precio_menor: z.number().min(0).optional(),
  precio_mayor: z.number().min(0).optional(),
  unidad: z.string().trim().optional(),
  codigo_barra: z.string().trim().nullable().optional(),
  codigos_barra: z.array(z.string().trim().min(1)).optional(),
  descripcion: z.string().trim().nullable().optional(),
  stock_minimo: z.number().optional(),
  stock_maximo: z.number().nullable().optional(),
  punto_pedido: z.number().nullable().optional(),
  ubicacion_deposito: z.string().trim().nullable().optional(),
  estado: z.enum(["activo", "inactivo", "eliminado"]).optional(),
  motivo_eliminacion: z.string().trim().nullable().optional(),
  permitir_bajo_costo: z.boolean().default(false),
  motivo: z.string().trim().min(3),
};

const bulkPreviewInputSchema = {
  categoria: z.string().trim().optional(),
  codigos: z.array(z.string().trim().min(1)).optional(),
  porcentaje: z
    .number()
    .refine(
      (value) => Math.abs(value) <= config.maxBulkPercent,
      `El porcentaje no puede superar ${config.maxBulkPercent}% en valor absoluto.`
    ),
  aplicar_a: z.enum(["menor", "mayor", "costo", "ambos", "todos"]).default("ambos"),
  redondeo: z
    .enum(["2_decimales", "entero", "multiplo_5", "multiplo_10", "multiplo_50", "multiplo_100"])
    .default("2_decimales"),
  permitir_bajo_costo: z.boolean().default(false),
  limite_muestra: z.number().int().min(1).max(50).default(10),
};

const historyInputSchema = {
  producto_id: z.string().trim().min(1),
  limit: z.number().int().min(1).max(200).default(50),
};

const stockAlertsInputSchema = {
  nivel: z.enum(["critico", "precaucion"]).optional(),
  limit: z.number().int().min(1).max(200).default(100),
};

const stockAdjustmentInputSchema = {
  producto_id: z.string().trim().min(1),
  cantidad_real: z.number(),
  tipo_ajuste: z.enum([
    "AJUSTE_MANUAL",
    "MERMA",
    "ROTURA",
    "VENCIMIENTO",
    "CONSUMO_INTERNO",
  ] as [TipoAjuste, ...TipoAjuste[]]),
  motivo: z.string().trim().min(3),
};

const providersListInputSchema = {
  query: z.string().trim().optional(),
  activo: z.boolean().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
};

const createProviderInputSchema = {
  nombre: z.string().trim().min(1),
  cuit: z.string().trim().optional(),
  contacto: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  email: z.string().trim().optional(),
  direccion: z.string().trim().optional(),
  condicion_pago: z.string().trim().optional(),
  notas: z.string().trim().optional(),
};

const updateProviderInputSchema = {
  proveedor_id: z.string().uuid(),
  nombre: z.string().trim().optional(),
  cuit: z.string().trim().nullable().optional(),
  contacto: z.string().trim().nullable().optional(),
  telefono: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  direccion: z.string().trim().nullable().optional(),
  condicion_pago: z.string().trim().nullable().optional(),
  notas: z.string().trim().nullable().optional(),
  activo: z.boolean().optional(),
};

const registrarCompraItemSchema = {
  producto_id: z.string().trim().min(1),
  cantidad: z.number().positive(),
  costo_unitario: z.number().positive(),
  fecha_vencimiento: z.string().trim().optional(),
  lote: z.string().trim().optional(),
};

const createPurchaseInputSchema = {
  proveedor_id: z.string().uuid(),
  fecha: z.string().trim().optional(),
  numero_factura: z.string().trim().optional(),
  tipo_documento: z
    .enum(["FACTURA_A", "FACTURA_B", "FACTURA_C", "REMITO", "NOTA_CREDITO"] as [
      TipoDocumentoCompra,
      ...TipoDocumentoCompra[],
    ])
    .default("FACTURA_A"),
  cae: z.string().trim().optional(),
  notas: z.string().trim().optional(),
  items: z
    .array(
      z.object(registrarCompraItemSchema)
    )
    .min(1),
  motivo: z.string().trim().min(3),
};

const purchasesListInputSchema = {
  proveedor_id: z.string().uuid().optional(),
  estado: z.enum(["PENDIENTE", "RECIBIDA", "PARCIAL", "CANCELADA"]).optional(),
  desde: z.string().trim().optional(),
  hasta: z.string().trim().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
};

const singlePurchaseInputSchema = {
  compra_id: z.string().uuid(),
};

const applyBulkInputSchema = {
  preview_id: z.string().uuid(),
  motivo: z.string().trim().min(3),
};

const configUpdateInputSchema = {
  clave: z.string().trim().min(1),
  valor: z.string().trim().min(1),
  descripcion: z.string().trim().optional(),
};

function createMcpServer(actor: ActorContext) {
const server = new McpServer({
  name: "lafuga-price-management",
  version: "2.0.0",
});

server.registerTool(
  "buscar_productos",
  {
    title: "Buscar Productos",
    description:
      "Busca productos por nombre, SKU, código de barras o categoría. Ideal para empezar cualquier operación desde Claude.",
    inputSchema: searchProductsInputSchema,
  },
  async (input) => {
    try {
      let query = supabase
        .from("productos")
        .select(productFields, { count: "exact" })
        .range(input.offset, input.offset + input.limit - 1);

      if (input.incluir_inactivos) {
        query = query.neq("estado", "eliminado");
      } else {
        query = query.or("estado.is.null,estado.eq.activo");
      }

      if (input.categoria) {
        query = query.eq("categoria", input.categoria);
      }

      if (input.query) {
        query = query.or(
          `nombre.ilike.%${input.query}%,id.ilike.%${input.query}%,codigo_barra.ilike.%${input.query}%`
        );
      }

      if (input.solo_sin_codigo_barras) {
        query = query.is("codigo_barra", null);
      }

      const { data, error, count } = await query.order("nombre", { ascending: true });
      if (error) throw new Error(error.message);

      const products = await attachBarcodes(supabase, (data || []) as unknown as Producto[]);
      return successResult("Consulta de productos completada.", {
        total: count || 0,
        count: products.length,
        productos: products,
      });
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  "obtener_producto",
  {
    title: "Obtener Producto",
    description: "Obtiene un producto puntual por SKU o por código de barras.",
    inputSchema: productLookupInputSchema,
  },
  async (input) => {
    try {
      if (!input.id && !input.codigo_barra) {
        throw new Error("Tenés que enviar id o codigo_barra.");
      }
      const product = input.id
        ? await getProductById(supabase, input.id)
        : await getProductByBarcode(supabase, input.codigo_barra!);

      return successResult("Producto encontrado.", product);
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  "listar_categorias",
  {
    title: "Listar Categorías",
    description: "Devuelve las categorías actuales disponibles en el sistema.",
    inputSchema: emptyInputSchema,
  },
  async () => {
    try {
      const { data, error } = await supabase
        .from("productos")
        .select("categoria")
        .neq("estado", "eliminado");

      if (error) throw new Error(error.message);

      const categorias = Array.from(
        new Set(
          ((data || []) as Array<{ categoria: string | null }>)
            .map((item) => item.categoria)
            .filter(Boolean) as string[]
        )
      ).sort((a, b) => a.localeCompare(b, "es"));

      return successResult("Categorías obtenidas.", { categorias });
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  "obtener_estadisticas_negocio",
  {
    title: "Obtener Estadísticas",
    description:
      "Resume métricas generales del sistema: total de productos, productos sin precio, sin código de barras y promedios.",
    inputSchema: emptyInputSchema,
  },
  async () => {
    try {
      const { data, error } = await supabase
        .from("productos")
        .select("id, categoria, precio_menor, precio_mayor, costo, codigo_barra")
        .neq("estado", "eliminado");

      if (error) throw new Error(error.message);

      const products = (data || []) as Array<
        Pick<Producto, "id" | "categoria" | "precio_menor" | "precio_mayor" | "costo" | "codigo_barra">
      >;

      const productosPorCategoria: Record<string, number> = {};
      for (const product of products) {
        const category = product.categoria || "Sin categoría";
        productosPorCategoria[category] = (productosPorCategoria[category] || 0) + 1;
      }

      const conMenor = products.filter((product) => (product.precio_menor || 0) > 0);
      const conMayor = products.filter((product) => (product.precio_mayor || 0) > 0);
      const conCosto = products.filter((product) => (product.costo || 0) > 0);

      return successResult("Estadísticas calculadas.", {
        total_productos: products.length,
        productos_por_categoria: productosPorCategoria,
        productos_sin_precio: products.filter(
          (product) => (product.precio_menor || 0) <= 0 && (product.precio_mayor || 0) <= 0
        ).length,
        productos_sin_codigo_barra: products.filter((product) => !product.codigo_barra).length,
        promedio_precio_menor:
          conMenor.length === 0
            ? 0
            : roundMoney(
                conMenor.reduce((sum, product) => sum + (product.precio_menor || 0), 0) / conMenor.length,
                "2_decimales"
              ),
        promedio_precio_mayor:
          conMayor.length === 0
            ? 0
            : roundMoney(
                conMayor.reduce((sum, product) => sum + (product.precio_mayor || 0), 0) / conMayor.length,
                "2_decimales"
              ),
        promedio_costo:
          conCosto.length === 0
            ? 0
            : roundMoney(
                conCosto.reduce((sum, product) => sum + (product.costo || 0), 0) / conCosto.length,
                "2_decimales"
              ),
      });
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  "crear_producto",
  {
    title: "Crear Producto",
    description:
      "Crea un producto nuevo en el catálogo. Pensado para completar altas básicas sin salir de Claude.",
    inputSchema: createProductInputSchema,
  },
  async (input) => {
    try {
      assertMutationAllowed(actor, config, config.mutationRoles, "crear productos");

      sanitizePriceGuards(
        {
          costo: input.costo,
          precio_menor: input.precio_menor,
          precio_mayor: input.precio_mayor,
        },
        input.permitir_bajo_costo
      );

      const barcodeList = normalizeBarcodes([input.codigo_barra, ...(input.codigos_barra || [])]);
      const payload: ProductoInsert = {
        id: input.id,
        nombre: input.nombre,
        categoria: input.categoria || null,
        costo: input.costo,
        precio_menor: input.precio_menor,
        precio_mayor: input.precio_mayor,
        unidad: input.unidad || null,
        codigo_barra: barcodeList[0] || null,
        codigos_barra: barcodeList,
        descripcion: input.descripcion || null,
        stock_actual: input.stock_actual,
        stock_minimo: input.stock_minimo,
        stock_maximo: input.stock_maximo,
        proveedor_predeterminado_id: input.proveedor_predeterminado_id || null,
      };

      const { data, error } = await supabase
        .from("productos")
        .insert({
          ...payload,
          codigo_barra: barcodeList[0] || null,
          ultima_actualizacion: new Date().toISOString(),
          estado: "activo",
        })
        .select(productFields)
        .single();

      if (error) throw new Error(error.message);

      await syncProductBarcodes(supabase, input.id, barcodeList);
      await insertHistoryRows(supabase, actor, input.id, [
        {
          field: "alta_producto",
          before: null,
          after: input.nombre,
          reason: input.motivo,
        },
      ]);

      const [product] = await attachBarcodes(supabase, [data as unknown as Producto]);
      return successResult("Producto creado correctamente.", product);
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  "actualizar_producto",
  {
    title: "Actualizar Producto",
    description:
      "Actualiza datos de un producto con auditoría obligatoria. Sirve para precios, costo, datos comerciales y stock mínimo.",
    inputSchema: updateProductInputSchema,
  },
  async (input) => {
    try {
      assertMutationAllowed(actor, config, config.mutationRoles, "actualizar productos");

      if (
        !hasAtLeastOneDefined([
          input.nombre,
          input.categoria,
          input.costo,
          input.precio_menor,
          input.precio_mayor,
          input.unidad,
          input.codigo_barra,
          input.codigos_barra,
          input.descripcion,
          input.stock_minimo,
          input.stock_maximo,
          input.punto_pedido,
          input.ubicacion_deposito,
          input.estado,
          input.motivo_eliminacion,
        ])
      ) {
        throw new Error("Tenés que enviar al menos un campo para actualizar.");
      }

      const current = await getProductById(supabase, input.producto_id);
      const nextValues = {
        costo: input.costo ?? current.costo,
        precio_menor: input.precio_menor ?? current.precio_menor,
        precio_mayor: input.precio_mayor ?? current.precio_mayor,
      };
      sanitizePriceGuards(nextValues, input.permitir_bajo_costo);

      const updatePayload: ProductoUpdate = {
        nombre: input.nombre,
        categoria: input.categoria ?? undefined,
        costo: input.costo,
        precio_menor: input.precio_menor,
        precio_mayor: input.precio_mayor,
        unidad: input.unidad,
        codigo_barra: input.codigo_barra === undefined ? undefined : input.codigo_barra,
        descripcion: input.descripcion === undefined ? undefined : input.descripcion,
        stock_minimo: input.stock_minimo,
        stock_maximo: input.stock_maximo === undefined ? undefined : input.stock_maximo,
        punto_pedido: input.punto_pedido === undefined ? undefined : input.punto_pedido,
        ubicacion_deposito:
          input.ubicacion_deposito === undefined ? undefined : input.ubicacion_deposito,
        estado: input.estado,
        motivo_eliminacion:
          input.motivo_eliminacion === undefined ? undefined : input.motivo_eliminacion,
        ultima_actualizacion: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("productos")
        .update(updatePayload)
        .eq("id", input.producto_id)
        .select(productFields)
        .single();

      if (error) throw new Error(error.message);

      const normalizedBarcodes =
        input.codigos_barra !== undefined || input.codigo_barra !== undefined
          ? normalizeBarcodes([
              input.codigo_barra === undefined ? current.codigo_barra : input.codigo_barra,
              ...(input.codigos_barra || current.codigos_barra || []),
            ])
          : current.codigos_barra || [];

      if (input.codigos_barra !== undefined || input.codigo_barra !== undefined) {
        await syncProductBarcodes(supabase, input.producto_id, normalizedBarcodes);
      }

      const changedFields: Array<{ field: string; before: unknown; after: unknown; reason: string }> = [];
      const updatedProduct = data as unknown as Producto;

      for (const field of Object.keys(updatePayload) as Array<keyof ProductoUpdate>) {
        if (field === "ultima_actualizacion") continue;
        const beforeValue = current[field as keyof Producto];
        const afterValue = updatedProduct[field as keyof Producto];
        if (beforeValue !== afterValue) {
          changedFields.push({
            field,
            before: beforeValue,
            after: afterValue,
            reason: input.motivo,
          });
        }
      }

      if (
        input.codigos_barra !== undefined ||
        input.codigo_barra !== undefined
      ) {
        changedFields.push({
          field: "codigos_barra",
          before: (current.codigos_barra || []).join(", "),
          after: normalizedBarcodes.join(", "),
          reason: input.motivo,
        });
      }

      await insertHistoryRows(supabase, actor, input.producto_id, changedFields);

      const refreshed = await getProductById(supabase, input.producto_id);
      return successResult("Producto actualizado correctamente.", refreshed);
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  "previsualizar_actualizacion_masiva_precios",
  {
    title: "Previsualizar Actualización Masiva",
    description:
      "Calcula una actualización masiva de precios o costos sin aplicarla. Devuelve un preview_id obligatorio para ejecutar el cambio real.",
    inputSchema: bulkPreviewInputSchema,
  },
  async (input) => {
    try {
      assertMutationAllowed(actor, config, config.bulkRoles, "previsualizar actualizaciones masivas");

      if (!input.categoria && (!input.codigos || input.codigos.length === 0)) {
        throw new Error("Tenés que indicar categoria o codigos.");
      }

      let query = supabase.from("productos").select(productFields).neq("estado", "eliminado");
      if (input.categoria) {
        query = query.eq("categoria", input.categoria);
      }
      if (input.codigos && input.codigos.length > 0) {
        query = query.in("id", input.codigos);
      }

      const { data, error } = await query.order("nombre", { ascending: true });
      if (error) throw new Error(error.message);

      const products = (data || []) as unknown as Producto[];
      if (products.length === 0) {
        throw new Error("No se encontraron productos para esa previsualización.");
      }

      const previewData = buildBulkPreview(
        products,
        input.porcentaje,
        input.aplicar_a,
        input.redondeo,
        input.permitir_bajo_costo,
        input.limite_muestra
      );

      if (previewData.productos_con_cambios === 0) {
        throw new Error("La previsualización no generó cambios aplicables con los filtros dados.");
      }

      const createdAt = new Date();
      const previewId = crypto.randomUUID();
      const preview: BulkPreview = {
        preview_id: previewId,
        actor_email: actor.email,
        actor_role: actor.role,
        created_at: createdAt.toISOString(),
        expires_at: new Date(createdAt.getTime() + config.previewTtlMinutes * 60_000).toISOString(),
        categoria: input.categoria,
        codigos: input.codigos,
        ...previewData,
      };

      await savePreview(supabase, actor, preview);

      return successResult("Previsualización generada.", {
        preview_id: preview.preview_id,
        actor_email: preview.actor_email,
        actor_role: preview.actor_role,
        created_at: preview.created_at,
        expires_at: preview.expires_at,
        porcentaje: preview.porcentaje,
        aplicar_a: preview.aplicar_a,
        redondeo: preview.redondeo,
        permitir_bajo_costo: preview.permitir_bajo_costo,
        total_productos: preview.total_productos,
        productos_con_cambios: preview.productos_con_cambios,
        productos_bajo_costo: preview.productos_bajo_costo,
        muestra: preview.muestra,
      });
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  "aplicar_actualizacion_masiva_precios",
  {
    title: "Aplicar Actualización Masiva",
    description:
      "Aplica una actualización masiva usando un preview_id previamente generado. Registra historial por producto y bloquea previews vencidos o desactualizados.",
    inputSchema: applyBulkInputSchema,
  },
  async (input) => {
    try {
      assertMutationAllowed(actor, config, config.bulkRoles, "aplicar actualizaciones masivas");

      const preview = await getPreview(supabase, input.preview_id);
      if (!preview) {
        throw new Error("No existe ese preview_id o ya fue descartado.");
      }
      if (preview.used_at) {
        throw new Error("Ese preview_id ya fue consumido.");
      }
      if (preview.actor_email !== actor.email) {
        throw new Error("El preview_id fue generado por otro actor y no puede reutilizarse.");
      }
      if (new Date(preview.expires_at).getTime() < Date.now()) {
        throw new Error("El preview_id venció. Generá una nueva previsualización.");
      }
      if (preview.productos_bajo_costo > 0 && !preview.permitir_bajo_costo) {
        throw new Error(
          `La previsualización detectó ${preview.productos_bajo_costo} productos que quedarían bajo costo. Regenerá el preview con permitir_bajo_costo=true si realmente querés aplicar ese cambio.`
        );
      }

      const productIds = preview.entries.map((entry) => entry.producto_id);
      const { data: currentRows, error } = await supabase
        .from("productos")
        .select(productFields)
        .in("id", productIds);

      if (error) throw new Error(error.message);

      const currentMap = new Map(
        ((currentRows || []) as unknown as Producto[]).map((product) => [product.id, product])
      );

      const staleProducts: string[] = [];
      for (const entry of preview.entries) {
        const current = currentMap.get(entry.producto_id);
        if (!current) {
          staleProducts.push(entry.producto_id);
          continue;
        }

        if (
          current.precio_menor !== entry.before.precio_menor ||
          current.precio_mayor !== entry.before.precio_mayor ||
          current.costo !== entry.before.costo
        ) {
          staleProducts.push(entry.producto_id);
        }
      }

      if (staleProducts.length > 0) {
        throw new Error(
          `No se puede aplicar porque cambiaron algunos productos desde la previsualización. Rehacé el preview. Ejemplos: ${staleProducts
            .slice(0, 10)
            .join(", ")}`
        );
      }

      let updated = 0;
      for (const entry of preview.entries) {
        const current = currentMap.get(entry.producto_id)!;
        const updatePayload: Partial<Producto> = {};
        const changes: Array<{ field: string; before: unknown; after: unknown; reason: string }> = [];

        for (const field of entry.cambios) {
          if (field === "precio_menor") {
            updatePayload.precio_menor = entry.after.precio_menor;
            changes.push({
              field,
              before: current.precio_menor,
              after: entry.after.precio_menor,
              reason: input.motivo,
            });
          }
          if (field === "precio_mayor") {
            updatePayload.precio_mayor = entry.after.precio_mayor;
            changes.push({
              field,
              before: current.precio_mayor,
              after: entry.after.precio_mayor,
              reason: input.motivo,
            });
          }
          if (field === "costo") {
            updatePayload.costo = entry.after.costo;
            changes.push({
              field,
              before: current.costo,
              after: entry.after.costo,
              reason: input.motivo,
            });
          }
        }

        const { error: updateError } = await supabase
          .from("productos")
          .update({
            ...updatePayload,
            ultima_actualizacion: new Date().toISOString(),
          })
          .eq("id", entry.producto_id);

        if (updateError) throw new Error(updateError.message);
        await insertHistoryRows(supabase, actor, entry.producto_id, changes);
        updated += 1;
      }

      await markPreviewUsed(supabase, input.preview_id);
      return successResult("Actualización masiva aplicada correctamente.", {
        preview_id: input.preview_id,
        productos_actualizados: updated,
        motivo: input.motivo,
      });
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  "obtener_historial_producto",
  {
    title: "Obtener Historial de Producto",
    description: "Lee el historial de auditoría de un producto.",
    inputSchema: historyInputSchema,
  },
  async (input) => {
    try {
      const { data, error } = await supabase
        .from("historial_productos")
        .select("*")
        .eq("id_producto", input.producto_id)
        .order("created_at", { ascending: false })
        .limit(input.limit);

      if (error) throw new Error(error.message);
      return successResult("Historial obtenido.", {
        producto_id: input.producto_id,
        historial: (data || []) as unknown as HistorialProducto[],
      });
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  "obtener_alertas_stock",
  {
    title: "Obtener Alertas de Stock",
    description:
      "Devuelve alertas de stock bajo o crítico, ordenadas desde la situación más urgente.",
    inputSchema: stockAlertsInputSchema,
  },
  async (input) => {
    try {
      const { data, error } = await supabase
        .from("productos")
        .select("id, nombre, stock_actual, stock_minimo")
        .eq("estado", "activo")
        .gt("stock_minimo", 0);

      if (error) throw new Error(error.message);

      const alerts = ((data || []) as Array<Pick<Producto, "id" | "nombre" | "stock_actual" | "stock_minimo">>)
        .filter((product) => (product.stock_actual || 0) <= (product.stock_minimo || 0))
        .map((product) => ({
          producto_id: product.id,
          nombre: product.nombre,
          stock_actual: product.stock_actual || 0,
          stock_minimo: product.stock_minimo || 0,
          nivel:
            (product.stock_actual || 0) <= (product.stock_minimo || 0) * 0.5
              ? ("critico" as const)
              : ("precaucion" as const),
        }))
        .filter((alert) => (input.nivel ? alert.nivel === input.nivel : true))
        .sort((a, b) => a.stock_actual - b.stock_actual)
        .slice(0, input.limit);

      return successResult("Alertas de stock calculadas.", {
        total: alerts.length,
        alertas: alerts,
      });
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  "ajustar_stock_producto",
  {
    title: "Ajustar Stock de Producto",
    description:
      "Ajusta el stock real de un producto y registra el movimiento correspondiente en la bitácora.",
    inputSchema: stockAdjustmentInputSchema,
  },
  async (input) => {
    try {
      assertMutationAllowed(actor, config, config.mutationRoles, "ajustar stock");

      const product = await getProductById(supabase, input.producto_id);
      if (!product.permite_stock_negativo && input.cantidad_real < 0) {
        throw new Error("El producto no permite stock negativo.");
      }

      const stockPrevio = product.stock_actual || 0;
      const diferencia = input.cantidad_real - stockPrevio;

      const { error: updateError } = await supabase
        .from("productos")
        .update({ stock_actual: input.cantidad_real })
        .eq("id", input.producto_id);
      if (updateError) throw new Error(updateError.message);

      const movementPayload: Omit<MovimientoStock, "id" | "created_at"> = {
        producto_id: input.producto_id,
        tipo_movimiento: input.tipo_ajuste,
        cantidad: diferencia,
        stock_previo: stockPrevio,
        stock_resultante: input.cantidad_real,
        costo_unitario: product.costo || 0,
        costo_total: Math.abs(diferencia) * (product.costo || 0),
        usuario_id: actor.email,
        referencia_id: null,
        referencia_tipo: "AJUSTE",
        motivo: `${input.motivo} (MCP por ${actor.email})`,
        lote: null,
        fecha_vencimiento: null,
      };

      const { data, error: movementError } = await supabase
        .from("movimientos_stock")
        .insert(movementPayload)
        .select()
        .single();
      if (movementError) throw new Error(movementError.message);

      await insertHistoryRows(supabase, actor, input.producto_id, [
        {
          field: "stock_actual",
          before: stockPrevio,
          after: input.cantidad_real,
          reason: input.motivo,
        },
      ]);

      return successResult("Stock ajustado correctamente.", {
        movimiento: data as MovimientoStock,
        stock_anterior: stockPrevio,
        stock_actual: input.cantidad_real,
      });
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  "listar_proveedores",
  {
    title: "Listar Proveedores",
    description: "Busca proveedores por nombre, CUIT o contacto.",
    inputSchema: providersListInputSchema,
  },
  async (input) => {
    try {
      let query = supabase
        .from("proveedores")
        .select("*", { count: "exact" })
        .range(input.offset, input.offset + input.limit - 1)
        .order("nombre", { ascending: true });

      if (input.activo !== undefined) {
        query = query.eq("activo", input.activo);
      }
      if (input.query) {
        query = query.or(
          `nombre.ilike.%${input.query}%,cuit.ilike.%${input.query}%,contacto.ilike.%${input.query}%`
        );
      }

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);

      return successResult("Proveedores obtenidos.", {
        total: count || 0,
        proveedores: (data || []) as unknown as Proveedor[],
      });
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  "crear_proveedor",
  {
    title: "Crear Proveedor",
    description: "Da de alta un proveedor nuevo.",
    inputSchema: createProviderInputSchema,
  },
  async (input) => {
    try {
      assertMutationAllowed(actor, config, config.mutationRoles, "crear proveedores");

      const payload: ProveedorInsert = {
        nombre: input.nombre,
        cuit: input.cuit || null,
        contacto: input.contacto || null,
        telefono: input.telefono || null,
        email: input.email || null,
        direccion: input.direccion || null,
        condicion_pago: input.condicion_pago || null,
        notas: input.notas || null,
      };

      const { data, error } = await supabase
        .from("proveedores")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);

      return successResult("Proveedor creado correctamente.", data as unknown as Proveedor);
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  "actualizar_proveedor",
  {
    title: "Actualizar Proveedor",
    description: "Actualiza datos de un proveedor existente.",
    inputSchema: updateProviderInputSchema,
  },
  async (input) => {
    try {
      assertMutationAllowed(actor, config, config.mutationRoles, "actualizar proveedores");

      if (
        !hasAtLeastOneDefined([
          input.nombre,
          input.cuit,
          input.contacto,
          input.telefono,
          input.email,
          input.direccion,
          input.condicion_pago,
          input.notas,
          input.activo,
        ])
      ) {
        throw new Error("Tenés que enviar al menos un campo para actualizar.");
      }

      const payload: ProveedorUpdate = {
        nombre: input.nombre,
        cuit: input.cuit === undefined ? undefined : input.cuit,
        contacto: input.contacto === undefined ? undefined : input.contacto,
        telefono: input.telefono === undefined ? undefined : input.telefono,
        email: input.email === undefined ? undefined : input.email,
        direccion: input.direccion === undefined ? undefined : input.direccion,
        condicion_pago:
          input.condicion_pago === undefined ? undefined : input.condicion_pago,
        notas: input.notas === undefined ? undefined : input.notas,
        activo: input.activo,
      };

      const { data, error } = await supabase
        .from("proveedores")
        .update(payload)
        .eq("id", input.proveedor_id)
        .select()
        .single();
      if (error) throw new Error(error.message);

      return successResult("Proveedor actualizado.", data as unknown as Proveedor);
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  "registrar_compra",
  {
    title: "Registrar Compra",
    description:
      "Registra una compra, actualiza stock y recalcula costo promedio ponderado de los productos involucrados.",
    inputSchema: createPurchaseInputSchema,
  },
  async (input) => {
    try {
      assertMutationAllowed(actor, config, config.mutationRoles, "registrar compras");

      let subtotal = 0;
      for (const item of input.items) {
        subtotal += item.cantidad * item.costo_unitario;
      }
      const iva = roundMoney(subtotal * 0.21, "2_decimales");
      const total = roundMoney(subtotal + iva, "2_decimales");

      const compraPayload: Omit<Compra, "id" | "created_at" | "proveedor_nombre"> = {
        proveedor_id: input.proveedor_id,
        fecha: input.fecha || new Date().toISOString().split("T")[0],
        numero_factura: input.numero_factura || null,
        tipo_documento: input.tipo_documento,
        cae: input.cae || null,
        subtotal,
        iva,
        total,
        estado: "PENDIENTE",
        notas: input.notas || null,
        usuario_id: actor.email,
      };

      const { data: compraRow, error: compraError } = await supabase
        .from("compras")
        .insert(compraPayload)
        .select()
        .single();
      if (compraError) throw new Error(compraError.message);

      const compra = compraRow as unknown as Compra;
      const detalleRows: Array<Omit<CompraDetalle, "id" | "producto_nombre">> = input.items.map(
        (item: {
          producto_id: string;
          cantidad: number;
          costo_unitario: number;
          fecha_vencimiento?: string;
          lote?: string;
        }) => ({
          compra_id: compra.id,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          cantidad_recibida: item.cantidad,
          costo_unitario: item.costo_unitario,
          costo_total: roundMoney(item.cantidad * item.costo_unitario, "2_decimales"),
          fecha_vencimiento: item.fecha_vencimiento || null,
          lote: item.lote || null,
        })
      );

      const { error: detailError } = await supabase.from("compras_detalle").insert(detalleRows);
      if (detailError) throw new Error(detailError.message);

      for (const item of input.items) {
        const product = await getProductById(supabase, item.producto_id);
        const stockActual = product.stock_actual || 0;
        const factorConversion = product.factor_conversion || 1;
        const cantidadEnUnidadStock = item.cantidad * factorConversion;
        const nuevoStock = stockActual + cantidadEnUnidadStock;

        const costoActual = product.costo || 0;
        let nuevoCosto = item.costo_unitario / factorConversion;
        if (stockActual > 0 && costoActual > 0) {
          nuevoCosto =
            (stockActual * costoActual + cantidadEnUnidadStock * (item.costo_unitario / factorConversion)) /
            nuevoStock;
        }
        nuevoCosto = roundMoney(nuevoCosto, "2_decimales");

        const { error: productUpdateError } = await supabase
          .from("productos")
          .update({
            stock_actual: nuevoStock,
            costo: nuevoCosto,
            ultima_actualizacion: new Date().toISOString(),
          })
          .eq("id", item.producto_id);
        if (productUpdateError) throw new Error(productUpdateError.message);

        const movimientoPayload: Omit<MovimientoStock, "id" | "created_at"> = {
          producto_id: item.producto_id,
          tipo_movimiento: "COMPRA",
          cantidad: cantidadEnUnidadStock,
          stock_previo: stockActual,
          stock_resultante: nuevoStock,
          costo_unitario: roundMoney(item.costo_unitario / factorConversion, "2_decimales"),
          costo_total: roundMoney(cantidadEnUnidadStock * (item.costo_unitario / factorConversion), "2_decimales"),
          usuario_id: actor.email,
          referencia_id: compra.id,
          referencia_tipo: "COMPRA",
          motivo: `${input.motivo} (MCP por ${actor.email})`,
          lote: item.lote || null,
          fecha_vencimiento: item.fecha_vencimiento || null,
        };

        const { error: movementError } = await supabase
          .from("movimientos_stock")
          .insert(movimientoPayload);
        if (movementError) throw new Error(movementError.message);

        await insertHistoryRows(supabase, actor, item.producto_id, [
          {
            field: "costo",
            before: product.costo,
            after: nuevoCosto,
            reason: `Compra ${input.numero_factura || compra.id}: ${input.motivo}`,
          },
          {
            field: "stock_actual",
            before: stockActual,
            after: nuevoStock,
            reason: `Compra ${input.numero_factura || compra.id}: ${input.motivo}`,
          },
        ]);
      }

      const { error: finalizeError } = await supabase
        .from("compras")
        .update({ estado: "RECIBIDA" })
        .eq("id", compra.id);
      if (finalizeError) throw new Error(finalizeError.message);

      return successResult("Compra registrada correctamente.", {
        compra_id: compra.id,
        subtotal,
        iva,
        total,
        items: input.items.length,
        estado: "RECIBIDA",
      });
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  "listar_compras",
  {
    title: "Listar Compras",
    description: "Lista compras por proveedor, estado o rango de fechas.",
    inputSchema: purchasesListInputSchema,
  },
  async (input) => {
    try {
      let query = supabase
        .from("compras")
        .select("*", { count: "exact" })
        .range(input.offset, input.offset + input.limit - 1)
        .order("fecha", { ascending: false });

      if (input.proveedor_id) query = query.eq("proveedor_id", input.proveedor_id);
      if (input.estado) query = query.eq("estado", input.estado);
      if (input.desde) query = query.gte("fecha", input.desde);
      if (input.hasta) query = query.lte("fecha", input.hasta);

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);

      return successResult("Compras obtenidas.", {
        total: count || 0,
        compras: (data || []) as unknown as Compra[],
      });
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  "obtener_compra",
  {
    title: "Obtener Compra",
    description: "Devuelve una compra puntual junto con su detalle de ítems.",
    inputSchema: singlePurchaseInputSchema,
  },
  async (input) => {
    try {
      const { data: compraRow, error: compraError } = await supabase
        .from("compras")
        .select("*")
        .eq("id", input.compra_id)
        .single();
      if (compraError || !compraRow) throw new Error("No existe esa compra.");

      const { data: detailRows, error: detailError } = await supabase
        .from("compras_detalle")
        .select("*")
        .eq("compra_id", input.compra_id);
      if (detailError) throw new Error(detailError.message);

      const compra: CompraConDetalle = {
        ...(compraRow as unknown as Compra),
        detalle: (detailRows || []) as unknown as CompraDetalle[],
      };

      return successResult("Compra obtenida.", compra);
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  "obtener_configuracion_sistema",
  {
    title: "Obtener Configuración",
    description: "Lee la configuración operativa del sistema.",
    inputSchema: emptyInputSchema,
  },
  async () => {
    try {
      const { data, error } = await supabase
        .from("configuracion_sistema")
        .select("*")
        .order("clave", { ascending: true });
      if (error) throw new Error(error.message);

      return successResult("Configuración obtenida.", {
        configuracion: (data || []) as unknown as ConfiguracionSistema[],
      });
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  "actualizar_configuracion_sistema",
  {
    title: "Actualizar Configuración",
    description:
      "Actualiza o crea una clave de configuración del sistema. Requiere rol administrativo fuerte.",
    inputSchema: configUpdateInputSchema,
  },
  async (input) => {
    try {
      assertMutationAllowed(actor, config, config.configRoles, "actualizar configuración");

      const { data, error } = await supabase
        .from("configuracion_sistema")
        .upsert(
          {
            clave: input.clave,
            valor: input.valor,
            descripcion: input.descripcion || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "clave" }
        )
        .select()
        .single();

      if (error) throw new Error(error.message);
      return successResult("Configuración actualizada.", data as unknown as ConfiguracionSistema);
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerPrompt(
  "operacion_segura_precios",
  {
    title: "Operación Segura de Precios",
    description:
      "Guía a Claude para trabajar con precios en La Fuga usando preview, auditoría y validaciones antes de tocar datos reales.",
    argsSchema: {
      objetivo: z.string().trim().optional(),
    },
  },
  ({ objetivo }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text:
            `Necesito operar precios en La Fuga${objetivo ? ` con este objetivo: ${objetivo}.` : "."}\n` +
            "Usá primero herramientas de consulta para entender el contexto. " +
            "Si el cambio es masivo, generá obligatoriamente una previsualización, resumí impacto, riesgos de precio bajo costo y recién después aplicá el cambio real. " +
            "Toda mutación debe llevar motivo claro y explicitar qué se tocó.",
        },
      },
    ],
  })
);

server.registerResource(
  "lafuga-operacion",
  "lafuga://operacion-segura",
  {
    title: "Reglas Operativas La Fuga",
    description: "Resumen de guardas del MCP de La Fuga.",
    mimeType: "application/json",
  },
  async () => ({
    contents: [
      {
        uri: "lafuga://operacion-segura",
        mimeType: "application/json",
        text: toJsonText({
          actor_email: actor.email,
          readonly_mode: config.readonlyMode,
          max_bulk_percent: config.maxBulkPercent,
          preview_ttl_minutes: config.previewTtlMinutes,
          mutation_roles: Array.from(config.mutationRoles),
          bulk_roles: Array.from(config.bulkRoles),
          config_roles: Array.from(config.configRoles),
        }),
      },
    ],
  })
);

return server;
}

function getServerBaseUrl() {
  return new URL(config.baseUrl);
}

function unauthorizedResponse(res: Response, message: string) {
  res.setHeader("WWW-Authenticate", 'Bearer realm="lafuga-mcp"');
  res.status(401).json({
    error: message,
  });
}

async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader?.startsWith("Bearer ")) {
    unauthorizedResponse(res, "Falta Authorization: Bearer <token>.");
    return;
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  if (!token) {
    unauthorizedResponse(res, "El token Bearer está vacío.");
    return;
  }

  try {
    req.lafugaAuth = await authenticateBearerToken(config, supabase, token);
    next();
  } catch (error) {
    unauthorizedResponse(
      res,
      error instanceof Error ? error.message : "No se pudo autenticar la conexión MCP."
    );
  }
}

async function main() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));
  app.use(
    cors({
      origin: config.allowedOrigins.length > 0 ? config.allowedOrigins : "*",
      methods: ["POST", "GET", "DELETE"],
      allowedHeaders: ["Authorization", "Content-Type", "Mcp-Protocol-Version"],
      exposedHeaders: ["Mcp-Session-Id"],
    })
  );

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      transport: "streamable-http-stateless",
      public_mcp_url: config.baseUrl,
      endpoint_path: "/mcp",
      readonly_mode: config.readonlyMode,
      now: new Date().toISOString(),
    });
  });

  app.post("/mcp", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const actor = req.lafugaAuth?.actor;
    if (!actor) {
      unauthorizedResponse(res, "No se pudo resolver el actor autenticado.");
      return;
    }

    const server = createMcpServer(actor);
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      res.on("close", () => {
        transport.close().catch(() => undefined);
        server.close().catch(() => undefined);
      });
    } catch (error) {
      writeLog(error instanceof Error ? error.message : "Error manejando request MCP.");
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  });

  app.get("/mcp", authMiddleware, (_req, res) => {
    res.status(405).set("Allow", "POST").send("Method Not Allowed");
  });

  app.delete("/mcp", authMiddleware, (_req, res) => {
    res.status(405).set("Allow", "POST").send("Method Not Allowed");
  });

  app.listen(config.port, config.host, (error?: Error) => {
    if (error) {
      throw error;
    }
    writeLog(
      `MCP remoto escuchando en ${getServerBaseUrl().toString()} (${config.host}:${config.port})`
    );
  });
}

main().catch((error) => {
  writeLog(error instanceof Error ? error.message : "Error fatal al iniciar el MCP remoto.");
  process.exit(1);
});
