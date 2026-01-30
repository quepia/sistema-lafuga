import { createBrowserClient } from '@supabase/ssr';
import { Database } from './database.types'; // Assuming we strictly typed it, but for now generic is fine?
// Actually we don't have database.types generated probably.
// We'll stick to generic checking.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Verificación de variables de entorno con logging en desarrollo
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `⚠️ [Supabase] Variables de entorno faltantes: ${missingVars.join(', ')}\n` +
      `   Asegúrate de configurar estas variables en tu archivo .env.local o en Vercel Dashboard.`
    );
  }

  throw new Error(
    `Faltan las variables de entorno: ${missingVars.join(', ')}. ` +
    `Configúralas en .env.local (desarrollo) o en Vercel Dashboard (producción).`
  );
}

// Log de conexión exitosa solo en desarrollo
if (process.env.NODE_ENV === 'development') {
  console.log('✅ [Supabase] Cliente inicializado correctamente (SSR/Cookie)');
}

// Use createBrowserClient for client-side usage (shares cookies with middleware/auth)
// Explicit auth config to ensure proper session handling on tab focus/wake
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Reduce storage events to prevent redundant auth state changes
    storageKey: 'la-fuga-auth',
  }
});

/**
 * Tipo del producto tal como está en la base de datos (snake_case)
 * Mapeo desde CSV:
 * - CODIGO -> id (PK)
 * - PRODUCTO -> nombre
 * - CATEGORIA -> categoria
 * - COSTO -> costo
 * - PRECIO_MAYOR -> precio_mayor
 * - PRECIO_MENOR -> precio_menor
 * - UNIDAD -> unidad
 * - CODIGO_BARRA -> codigo_barra
 * - ULTIMA_ACTUALIZACION -> ultima_actualizacion
 */
export interface Producto {
  id: string;                       // PK, from CSV 'CODIGO'
  nombre: string;                   // from CSV 'PRODUCTO'
  categoria: string | null;         // from CSV 'CATEGORIA'
  costo: number;                    // from CSV 'COSTO'
  precio_mayor: number;             // from CSV 'PRECIO_MAYOR'
  precio_menor: number;             // from CSV 'PRECIO_MENOR'
  unidad: string | null;            // from CSV 'UNIDAD'
  codigo_barra: string | null;      // from CSV 'CODIGO_BARRA'
  ultima_actualizacion: string | null; // from CSV 'ULTIMA_ACTUALIZACION'
  created_at?: string;              // System timestamp
  updated_at?: string;              // System timestamp

  // NEW FIELDS (Migration 003)
  descripcion?: string | null;      // Detailed description
  peso_neto?: number | null;        // Net weight in kg (for MASCOTAS)
  volumen_neto?: number | null;     // Net volume in liters (for SUELTOS/QUIMICA)
  permite_venta_fraccionada?: boolean; // Allow fractional sales
  estado?: 'activo' | 'inactivo' | 'eliminado'; // Product state
  motivo_eliminacion?: string | null; // Reason for deletion/inactivation

  // NEW FIELDS (Migration 005) - Product Images
  image_url?: string | null;        // URL of product image
  image_source?: 'openfoodfacts' | 'google' | 'manual' | 'not_found' | null;
  image_fetched_at?: string | null; // When image was fetched/updated

  // NEW FIELDS (Migration 010) - Stock & Inventory
  stock_actual?: number;
  stock_minimo?: number;
  stock_maximo?: number | null;
  stock_reservado?: number;
  punto_pedido?: number | null;
  permite_stock_negativo?: boolean;
  unidad_stock?: string;
  unidad_compra?: string;
  factor_conversion?: number;
  merma_esperada?: number;
  ubicacion_deposito?: string | null;
  controla_vencimiento?: boolean;
  proveedor_predeterminado_id?: string | null;
  es_combo?: boolean;
}

/**
 * Extended product type with computed unit prices
 */
export interface ProductoConPreciosUnitarios extends Producto {
  precio_menor_por_kg?: number | null;
  precio_mayor_por_kg?: number | null;
  precio_menor_por_litro?: number | null;
  precio_mayor_por_litro?: number | null;
}

/**
 * Product history entry for audit trail
 */
export interface HistorialProducto {
  id: string;
  id_producto: string;
  codigo_sku: string;
  campo_modificado: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  motivo: string | null;
  id_usuario: string | null;
  created_at: string;
}

/**
 * Type for product in a sale (with custom pricing support)
 */
export interface ProductoEnVenta {
  producto_id: string;
  nombre_producto: string;
  cantidad: number;

  // MASTER PRICES (from productos table)
  precio_lista_menor: number;
  precio_lista_mayor: number;
  costo_unitario: number;

  // ACTUAL SALE PRICE (can be different from list prices)
  tipo_precio: 'menor' | 'mayor' | 'custom';
  precio_unitario: number;

  // LINE DISCOUNTS (optional)
  descuento_linea?: number;
  descuento_linea_porcentaje?: number;
  motivo_descuento?: string;

  // TOTAL
  subtotal: number;
}

/**
 * Tipo para insertar/actualizar productos (sin campos auto-generados)
 */
export interface ProductoInsert {
  id: string;
  nombre: string;
  categoria?: string | null;
  costo?: number;
  precio_mayor?: number;
  precio_menor?: number;
  unidad?: string | null;
  codigo_barra?: string | null;
  ultima_actualizacion?: string | null;
  // NEW FIELDS (Migration 003)
  descripcion?: string | null;
  peso_neto?: number | null;
  volumen_neto?: number | null;
  permite_venta_fraccionada?: boolean;
  estado?: 'activo' | 'inactivo' | 'eliminado';
  motivo_eliminacion?: string | null;

  // Stock fields (Migration 010)
  stock_actual?: number;
  stock_minimo?: number;
  stock_maximo?: number | null;
  stock_reservado?: number;
  punto_pedido?: number | null;
  permite_stock_negativo?: boolean;
  unidad_stock?: string;
  unidad_compra?: string;
  factor_conversion?: number;
  merma_esperada?: number;
  ubicacion_deposito?: string | null;
  controla_vencimiento?: boolean;
  proveedor_predeterminado_id?: string | null;
  es_combo?: boolean;
}

/**
 * Tipo para actualización parcial de productos
 */
export interface ProductoUpdate {
  nombre?: string;
  categoria?: string | null;
  costo?: number;
  precio_mayor?: number;
  precio_menor?: number;
  unidad?: string | null;
  codigo_barra?: string | null;
  ultima_actualizacion?: string | null;
  // NEW FIELDS (Migration 003)
  descripcion?: string | null;
  peso_neto?: number | null;
  volumen_neto?: number | null;
  permite_venta_fraccionada?: boolean;
  estado?: 'activo' | 'inactivo' | 'eliminado';
  motivo_eliminacion?: string | null;

  // Stock fields (Migration 010)
  stock_actual?: number;
  stock_minimo?: number;
  stock_maximo?: number | null;
  stock_reservado?: number;
  punto_pedido?: number | null;
  permite_stock_negativo?: boolean;
  unidad_stock?: string;
  unidad_compra?: string;
  factor_conversion?: number;
  merma_esperada?: number;
  ubicacion_deposito?: string | null;
  controla_vencimiento?: boolean;
  proveedor_predeterminado_id?: string | null;
  es_combo?: boolean;
}

/**
 * Calcula el margen de ganancia en porcentaje
 * @param precio - Precio de venta
 * @param costo - Costo del producto
 * @returns Porcentaje de margen, o 0 si el costo es 0
 */
export function calcularMargen(precio: number, costo: number): number {
  if (costo <= 0) return 0;
  return Math.round(((precio - costo) / costo) * 10000) / 100; // 2 decimales
}

/**
 * Calcula la ganancia absoluta
 * @param precio - Precio de venta
 * @param costo - Costo del producto
 * @returns Ganancia en valor absoluto
 */
export function calcularGanancia(precio: number, costo: number): number {
  return Math.round((precio - costo) * 100) / 100;
}

// ==================== CATALOGOS (Migration 006) ====================

/**
 * Visible fields configuration for catalog
 */
export interface CamposVisibles {
  foto: boolean;
  nombre: boolean;
  precio: boolean;
  codigo: boolean;
  descripcion: boolean;
  unidad: boolean;
}

/**
 * Product entry in a catalog with individual adjustments
 */
export interface CatalogoProducto {
  producto_id: string;
  descuento_individual: number; // Additional percentage on top of global
  precio_personalizado: number | null; // Manual price override
}

/**
 * Catalog as stored in the database
 */
export interface Catalogo {
  id: string;
  cliente_nombre: string;
  titulo: string;
  public_token: string;
  expires_at: string;
  descuento_global: number;
  campos_visibles: CamposVisibles;
  productos: CatalogoProducto[];
  estado: 'activo' | 'expirado' | 'eliminado';
  creado_por: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Type for inserting a new catalog
 */
export interface CatalogoInsert {
  cliente_nombre: string;
  titulo?: string;
  descuento_global?: number;
  campos_visibles?: Partial<CamposVisibles>;
  productos: CatalogoProducto[];
  creado_por?: string;
}

/**
 * Extended product type for catalog display (with calculated final price)
 */
export interface ProductoCatalogo extends Producto {
  descuento_individual: number;
  precio_personalizado: number | null;
  precio_final: number; // Calculated: precio_mayor * (1 - descuento_global/100) * (1 - descuento_individual/100)
}

/**
 * Default visible fields configuration
 */
export const CAMPOS_VISIBLES_DEFAULT: CamposVisibles = {
  foto: true,
  nombre: true,
  precio: true,
  codigo: false,
  descripcion: false,
  unidad: true,
};

// ==================== INVENTARIO Y STOCK (Migration 007+) ====================

export type TipoMovimiento =
  | 'VENTA' | 'COMPRA' | 'AJUSTE_MANUAL' | 'MERMA' | 'ROTURA'
  | 'VENCIMIENTO' | 'DEVOLUCION_CLIENTE' | 'DEVOLUCION_PROVEEDOR'
  | 'INVENTARIO_INICIAL' | 'TRANSFERENCIA_ENTRADA'
  | 'TRANSFERENCIA_SALIDA' | 'CONSUMO_INTERNO';

export interface MovimientoStock {
  id: string;
  created_at: string;
  producto_id: string;
  tipo_movimiento: TipoMovimiento;
  cantidad: number;
  stock_previo: number;
  stock_resultante: number;
  costo_unitario: number;
  costo_total: number;
  usuario_id: string | null;
  referencia_id: string | null;
  referencia_tipo: 'VENTA' | 'COMPRA' | 'AJUSTE' | 'TRANSFERENCIA' | null;
  motivo: string | null;
  lote: string | null;
  fecha_vencimiento: string | null;
  // Joined fields (optional, from queries with joins)
  producto_nombre?: string;
}

export type TipoAjuste = 'AJUSTE_MANUAL' | 'MERMA' | 'ROTURA' | 'VENCIMIENTO' | 'CONSUMO_INTERNO';

export interface AjusteStockInput {
  producto_id: string;
  cantidad_real: number;
  tipo_ajuste: TipoAjuste;
  motivo: string;
  usuario_id?: string;
}

export interface OrdenCompra {
  id: string;
  proveedor_id: string;
  numero_orden: string | null;
  fecha_orden: string;
  fecha_entrega_esperada: string | null;
  estado: 'BORRADOR' | 'PENDIENTE' | 'APROBADA' | 'ENVIADA' | 'PARCIAL' | 'COMPLETA' | 'CANCELADA';
  subtotal: number;
  iva: number;
  total: number;
  observaciones: string | null;
  created_at: string;
}

export interface AlertaStock {
  producto_id: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  nivel: 'critico' | 'precaucion';
}

// ==================== COMPRAS (Migration 008) ====================

export type TipoDocumentoCompra = 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C' | 'REMITO' | 'NOTA_CREDITO';
export type EstadoCompra = 'PENDIENTE' | 'RECIBIDA' | 'PARCIAL' | 'CANCELADA';

export interface Compra {
  id: string;
  proveedor_id: string;
  fecha: string;
  numero_factura: string | null;
  tipo_documento: TipoDocumentoCompra;
  cae: string | null;
  subtotal: number;
  iva: number;
  total: number;
  estado: EstadoCompra;
  notas: string | null;
  usuario_id: string | null;
  created_at: string;
  // Joined fields (optional)
  proveedor_nombre?: string;
}

export interface CompraDetalle {
  id: string;
  compra_id: string;
  producto_id: string;
  cantidad: number;
  cantidad_recibida: number;
  costo_unitario: number;
  costo_total: number;
  fecha_vencimiento: string | null;
  lote: string | null;
  // Joined fields (optional)
  producto_nombre?: string;
}

export interface CompraInsert {
  proveedor_id: string;
  fecha?: string;
  numero_factura?: string;
  tipo_documento?: TipoDocumentoCompra;
  cae?: string;
  notas?: string;
  usuario_id?: string;
  items: CompraDetalleInsert[];
}

export interface CompraDetalleInsert {
  producto_id: string;
  cantidad: number;
  costo_unitario: number;
  fecha_vencimiento?: string;
  lote?: string;
}

export interface CompraConDetalle extends Compra {
  detalle: CompraDetalle[];
}

// ==================== COMBOS/KITS (Migration 011) ====================

export interface ComposicionCombo {
  id: string;
  producto_padre_id: string;
  producto_hijo_id: string;
  cantidad: number;
  // Joined fields
  producto_hijo_nombre?: string;
}

export interface ComposicionComboInsert {
  producto_padre_id: string;
  producto_hijo_id: string;
  cantidad: number;
}

// ==================== CONFIGURACIÓN SISTEMA (Migration 012) ====================

export type MetodoCosteo = 'PROMEDIO_PONDERADO' | 'ULTIMO_COSTO' | 'FIFO';

export interface ConfiguracionSistema {
  clave: string;
  valor: string;
  descripcion: string | null;
  updated_at: string;
}


// ==================== PROVEEDORES (Migration 007) ====================

export interface Proveedor {
  id: string;
  nombre: string;
  cuit: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  condicion_pago: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProveedorInsert {
  nombre: string;
  cuit?: string | null;
  contacto?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  condicion_pago?: string | null;
  notas?: string | null;
}

export interface ProveedorUpdate {
  nombre?: string;
  cuit?: string | null;
  contacto?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  condicion_pago?: string | null;
  notas?: string | null;
  activo?: boolean;
}

