import { createClient } from '@supabase/supabase-js';

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
  console.log('✅ [Supabase] Cliente inicializado correctamente');
  console.log(`   URL: ${supabaseUrl.substring(0, 30)}...`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
