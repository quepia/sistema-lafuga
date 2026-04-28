import { z } from "zod";
import {
  canWrite,
  getMcpAdminClient,
  type AccessTokenContext,
} from "./admin";

// ============================================================================
// Definiciones de tools del MCP
// ============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  requiresWrite: boolean;
  zodSchema: z.ZodTypeAny;
  handler: (args: unknown, ctx: AccessTokenContext) => Promise<ToolResult>;
}

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

const ok = (data: unknown): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
});

const fail = (msg: string): ToolResult => ({
  content: [{ type: "text", text: msg }],
  isError: true,
});

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const buscarSchema = z.object({
  query: z.string().min(1, "query no puede estar vacío"),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

const obtenerSchema = z.object({
  id: z.string().min(1),
});

const listarSchema = z.object({
  categoria: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
  solo_activos: z.boolean().optional().default(true),
});

const actualizarPrecioSchema = z
  .object({
    id: z.string().min(1),
    precio_menor: z.number().nonnegative().optional(),
    precio_mayor: z.number().nonnegative().optional(),
    motivo: z.string().optional(),
  })
  .refine(
    (v) => v.precio_menor !== undefined || v.precio_mayor !== undefined,
    "Debés enviar al menos precio_menor o precio_mayor",
  );

const actualizarProductoSchema = z
  .object({
    id: z.string().min(1),
    nombre: z.string().min(1).optional(),
    categoria: z.string().nullable().optional(),
    costo: z.number().nonnegative().optional(),
    unidad: z.string().nullable().optional(),
    codigo_barra: z.string().nullable().optional(),
    descripcion: z.string().nullable().optional(),
    motivo: z.string().optional(),
  })
  .refine((v) => {
    const { id: _id, motivo: _motivo, ...rest } = v;
    return Object.values(rest).some((x) => x !== undefined);
  }, "Tenés que enviar al menos un campo a modificar");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PRODUCT_FIELDS = "id,nombre,categoria,costo,precio_menor,precio_mayor,unidad,codigo_barra,descripcion,estado,updated_at";

async function logHistorial(
  productoId: string,
  codigoSku: string,
  cambios: Array<{ campo: string; anterior: unknown; nuevo: unknown }>,
  motivo: string | null,
  userId: string,
) {
  if (cambios.length === 0) return;
  const supabase = getMcpAdminClient();
  await supabase.from("historial_productos").insert(
    cambios.map((c) => ({
      id_producto: productoId,
      codigo_sku: codigoSku,
      campo_modificado: c.campo,
      valor_anterior: c.anterior == null ? null : String(c.anterior),
      valor_nuevo: c.nuevo == null ? null : String(c.nuevo),
      motivo,
      id_usuario: userId,
    })),
  );
}

// ---------------------------------------------------------------------------
// Implementaciones
// ---------------------------------------------------------------------------

const buscarProducto: ToolDefinition = {
  name: "buscar_producto",
  description:
    "Busca productos por nombre, categoría o código de barras (coincidencia parcial, case-insensitive). Usalo cuando el usuario nombra un producto pero no sabe el ID exacto.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Texto a buscar (nombre, categoría o código de barras)." },
      limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
    },
    required: ["query"],
  },
  requiresWrite: false,
  zodSchema: buscarSchema,
  handler: async (args) => {
    const { query, limit } = buscarSchema.parse(args);
    const supabase = getMcpAdminClient();
    const term = `%${query.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    const { data, error } = await supabase
      .from("productos")
      .select(PRODUCT_FIELDS)
      .or(`nombre.ilike.${term},categoria.ilike.${term},codigo_barra.ilike.${term},id.ilike.${term}`)
      .neq("estado", "eliminado")
      .limit(limit);
    if (error) return fail(`Error consultando productos: ${error.message}`);
    return ok({ count: data?.length ?? 0, productos: data ?? [] });
  },
};

const obtenerProducto: ToolDefinition = {
  name: "obtener_producto",
  description: "Devuelve los datos completos de un producto por su ID exacto.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "ID/SKU exacto del producto." },
    },
    required: ["id"],
  },
  requiresWrite: false,
  zodSchema: obtenerSchema,
  handler: async (args) => {
    const { id } = obtenerSchema.parse(args);
    const supabase = getMcpAdminClient();
    const { data, error } = await supabase
      .from("productos")
      .select(PRODUCT_FIELDS)
      .eq("id", id)
      .maybeSingle();
    if (error) return fail(`Error: ${error.message}`);
    if (!data) return fail(`No existe un producto con id "${id}".`);
    return ok(data);
  },
};

const listarProductos: ToolDefinition = {
  name: "listar_productos",
  description:
    "Lista productos paginados, opcionalmente filtrando por categoría. Útil para explorar el catálogo.",
  inputSchema: {
    type: "object",
    properties: {
      categoria: { type: "string", description: "Filtrar por categoría exacta (opcional)." },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 50 },
      offset: { type: "integer", minimum: 0, default: 0 },
      solo_activos: { type: "boolean", default: true, description: "Excluir productos inactivos/eliminados." },
    },
  },
  requiresWrite: false,
  zodSchema: listarSchema,
  handler: async (args) => {
    const { categoria, limit, offset, solo_activos } = listarSchema.parse(args);
    const supabase = getMcpAdminClient();
    let q = supabase
      .from("productos")
      .select(PRODUCT_FIELDS, { count: "exact" })
      .order("nombre", { ascending: true })
      .range(offset, offset + limit - 1);
    if (categoria) q = q.eq("categoria", categoria);
    if (solo_activos) q = q.neq("estado", "eliminado");
    const { data, count, error } = await q;
    if (error) return fail(`Error: ${error.message}`);
    return ok({ total: count ?? null, count: data?.length ?? 0, offset, productos: data ?? [] });
  },
};

const actualizarPrecio: ToolDefinition = {
  name: "actualizar_precio",
  description:
    "Actualiza el precio menor (minorista) y/o el precio mayor (mayorista) de UN producto. Cada cambio queda registrado en el historial con tu usuario.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "ID exacto del producto." },
      precio_menor: { type: "number", minimum: 0, description: "Nuevo precio minorista (opcional)." },
      precio_mayor: { type: "number", minimum: 0, description: "Nuevo precio mayorista (opcional)." },
      motivo: { type: "string", description: "Motivo del cambio (opcional, queda en el historial)." },
    },
    required: ["id"],
  },
  requiresWrite: true,
  zodSchema: actualizarPrecioSchema,
  handler: async (args, ctx) => {
    const input = actualizarPrecioSchema.parse(args);
    const supabase = getMcpAdminClient();

    const { data: prev, error: prevErr } = await supabase
      .from("productos")
      .select("id,nombre,precio_menor,precio_mayor,costo")
      .eq("id", input.id)
      .maybeSingle();
    if (prevErr) return fail(`Error leyendo producto: ${prevErr.message}`);
    if (!prev) return fail(`No existe un producto con id "${input.id}".`);

    const update: Record<string, number | string> = {
      ultima_actualizacion: new Date().toISOString(),
    };
    const cambios: Array<{ campo: string; anterior: unknown; nuevo: unknown }> = [];

    if (input.precio_menor !== undefined && input.precio_menor !== Number(prev.precio_menor)) {
      update.precio_menor = input.precio_menor;
      cambios.push({ campo: "precio_menor", anterior: prev.precio_menor, nuevo: input.precio_menor });
    }
    if (input.precio_mayor !== undefined && input.precio_mayor !== Number(prev.precio_mayor)) {
      update.precio_mayor = input.precio_mayor;
      cambios.push({ campo: "precio_mayor", anterior: prev.precio_mayor, nuevo: input.precio_mayor });
    }

    if (cambios.length === 0) {
      return ok({
        producto_id: prev.id,
        nombre: prev.nombre,
        sin_cambios: true,
        mensaje: "Los precios enviados son iguales a los actuales.",
      });
    }

    const { error: upErr } = await supabase
      .from("productos")
      .update(update)
      .eq("id", input.id);
    if (upErr) return fail(`Error actualizando: ${upErr.message}`);

    await logHistorial(prev.id, prev.id, cambios, input.motivo ?? `MCP (${ctx.user.email})`, ctx.userId);

    return ok({
      producto_id: prev.id,
      nombre: prev.nombre,
      cambios,
      actualizado_por: ctx.user.email,
    });
  },
};

const actualizarProducto: ToolDefinition = {
  name: "actualizar_producto",
  description:
    "Actualiza campos generales de un producto (nombre, categoría, costo, unidad, código de barras, descripción). NO toca precios — para precios usar actualizar_precio.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "ID exacto del producto." },
      nombre: { type: "string" },
      categoria: { type: ["string", "null"] },
      costo: { type: "number", minimum: 0 },
      unidad: { type: ["string", "null"] },
      codigo_barra: { type: ["string", "null"] },
      descripcion: { type: ["string", "null"] },
      motivo: { type: "string", description: "Motivo (opcional)." },
    },
    required: ["id"],
  },
  requiresWrite: true,
  zodSchema: actualizarProductoSchema,
  handler: async (args, ctx) => {
    const input = actualizarProductoSchema.parse(args);
    const supabase = getMcpAdminClient();

    const { data: prev, error: prevErr } = await supabase
      .from("productos")
      .select("id,nombre,categoria,costo,unidad,codigo_barra,descripcion")
      .eq("id", input.id)
      .maybeSingle();
    if (prevErr) return fail(`Error leyendo producto: ${prevErr.message}`);
    if (!prev) return fail(`No existe un producto con id "${input.id}".`);

    const editable = ["nombre", "categoria", "costo", "unidad", "codigo_barra", "descripcion"] as const;
    const update: Record<string, unknown> = {
      ultima_actualizacion: new Date().toISOString(),
    };
    const cambios: Array<{ campo: string; anterior: unknown; nuevo: unknown }> = [];

    for (const campo of editable) {
      const val = input[campo as keyof typeof input];
      if (val === undefined) continue;
      const anterior = (prev as Record<string, unknown>)[campo];
      const normPrev = anterior == null ? null : campo === "costo" ? Number(anterior) : String(anterior);
      const normNew = val == null ? null : campo === "costo" ? Number(val) : String(val);
      if (normPrev === normNew) continue;
      update[campo] = val;
      cambios.push({ campo, anterior, nuevo: val });
    }

    if (cambios.length === 0) {
      return ok({
        producto_id: prev.id,
        sin_cambios: true,
        mensaje: "Los valores enviados son iguales a los actuales.",
      });
    }

    const { error: upErr } = await supabase
      .from("productos")
      .update(update)
      .eq("id", input.id);
    if (upErr) return fail(`Error actualizando: ${upErr.message}`);

    await logHistorial(prev.id, prev.id, cambios, input.motivo ?? `MCP (${ctx.user.email})`, ctx.userId);

    return ok({
      producto_id: prev.id,
      cambios,
      actualizado_por: ctx.user.email,
    });
  },
};

export const TOOLS: ToolDefinition[] = [
  buscarProducto,
  obtenerProducto,
  listarProductos,
  actualizarPrecio,
  actualizarProducto,
];

export function findTool(name: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.name === name);
}

export async function runTool(
  tool: ToolDefinition,
  args: unknown,
  ctx: AccessTokenContext,
): Promise<ToolResult> {
  if (tool.requiresWrite && !canWrite(ctx.user)) {
    return fail(
      `Tu rol "${ctx.user.role}" no tiene permiso para escritura. Se requiere admin, editor o gerente.`,
    );
  }
  try {
    return await tool.handler(args, ctx);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return fail(`Argumentos inválidos: ${e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
    }
    return fail(`Error inesperado: ${(e as Error).message}`);
  }
}
