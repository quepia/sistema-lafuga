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
