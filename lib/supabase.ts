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

// Tipos de los datos crudos de Supabase (nombres exactos de las columnas del CSV)
export interface ProductoRaw {
  id?: number;
  "CÓDIGO": string;
  "PRODUCTO": string;
  "CATEGORIA": string;
  "PRECIO_MENOR": string; // Viene como texto con comas, ej: "1,600.00"
  "PRECIO_MAYOR": string; // Viene como texto con comas
  "UNIDAD": string | null;
  "CODIGO_BARRA": string | null;
}

// Función para limpiar precios (quitar comas y convertir a número)
export function parsePrecio(precioStr: string | null | undefined): number {
  if (!precioStr || precioStr === '') return 0;
  // Quitar comas de miles y convertir a número
  const limpio = precioStr.replace(/,/g, '');
  const numero = parseFloat(limpio);
  return isNaN(numero) ? 0 : numero;
}

// Tipo del producto transformado para el frontend
export interface Producto {
  id: number;
  codigo: string;
  producto: string;
  categoria: string;
  precio_menor: number;
  precio_mayor: number;
  costo_compra: number;
  unidad: string | null;
  codigo_barra: string | null;
  ultima_actualizacion: string | null;
  diferencia_porcentual: number;
}

// Función para transformar datos crudos de Supabase al formato del frontend
export function transformarProducto(raw: ProductoRaw, index: number): Producto {
  const precio_menor = parsePrecio(raw["PRECIO_MENOR"]);
  const precio_mayor = parsePrecio(raw["PRECIO_MAYOR"]);

  // Calcular diferencia porcentual entre precio menor y mayor
  const diferencia_porcentual = precio_mayor > 0
    ? ((precio_menor - precio_mayor) / precio_mayor) * 100
    : 0;

  return {
    id: raw.id ?? index + 1,
    codigo: raw["CÓDIGO"] || '',
    producto: raw["PRODUCTO"] || '',
    categoria: raw["CATEGORIA"] || '',
    precio_menor,
    precio_mayor,
    costo_compra: 0, // No está en el CSV, default 0
    unidad: raw["UNIDAD"] || null,
    codigo_barra: raw["CODIGO_BARRA"] || null,
    ultima_actualizacion: null,
    diferencia_porcentual: Math.round(diferencia_porcentual * 100) / 100,
  };
}

// Función para transformar array de productos
export function transformarProductos(rawProductos: ProductoRaw[]): Producto[] {
  return rawProductos.map((raw, index) => transformarProducto(raw, index));
}
