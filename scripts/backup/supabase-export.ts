import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface ProductoExport {
  id: string;
  nombre: string;
  categoria: string | null;
  costo: number | null;
  precio_mayor: number | null;
  precio_menor: number | null;
  unidad: string | null;
  codigo_barra: string | null;
  descripcion: string | null;
  peso_neto: number | null;
  volumen_neto: number | null;
  permite_venta_fraccionada: boolean;
  estado: string;
  created_at: string;
  updated_at: string;
}

export interface VentaExport {
  id: string;
  created_at: string;
  tipo_venta: string;
  total: number;
  metodo_pago: string;
  cliente_nombre: string;
  productos: any[];
  subtotal: number | null;
  descuento_global: number;
  descuento_global_porcentaje: number;
  descuento_global_motivo: string | null;
}

export interface ExportData {
  productos: ProductoExport[];
  ventas: VentaExport[];
  exportDate: string;
}

export async function exportFromSupabase(): Promise<ExportData> {
  const { data: productos, error: prodError } = await supabase
    .from('productos')
    .select('id, nombre, categoria, costo, precio_mayor, precio_menor, unidad, codigo_barra, descripcion, peso_neto, volumen_neto, permite_venta_fraccionada, estado, created_at, updated_at')
    .in('estado', ['activo', 'inactivo'])
    .order('nombre');

  if (prodError) throw new Error(`Error exportando productos: ${prodError.message}`);

  // Exportar ventas del último mes
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const { data: ventas, error: ventasError } = await supabase
    .from('ventas')
    .select('id, created_at, tipo_venta, total, metodo_pago, cliente_nombre, productos, subtotal, descuento_global, descuento_global_porcentaje, descuento_global_motivo')
    .gte('created_at', oneMonthAgo.toISOString())
    .order('created_at', { ascending: false });

  if (ventasError) throw new Error(`Error exportando ventas: ${ventasError.message}`);

  return {
    productos: productos || [],
    ventas: ventas || [],
    exportDate: new Date().toISOString(),
  };
}
