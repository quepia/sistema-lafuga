import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url) throw new Error('SUPABASE_URL o NEXT_PUBLIC_SUPABASE_URL es requerida');
  if (!key) throw new Error('SUPABASE_SERVICE_KEY es requerida');

  return createClient(url, key);
}

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
  const supabase = getSupabaseClient();
  const PAGE_SIZE = 1000;

  // Paginar productos (Supabase limita a 1000 por query)
  const allProductos: any[] = [];
  let from = 0;
  while (true) {
    const { data: batch, error: prodError } = await supabase
      .from('productos')
      .select('id, nombre, categoria, costo, precio_mayor, precio_menor, unidad, codigo_barra, descripcion, peso_neto, volumen_neto, permite_venta_fraccionada, estado, created_at, updated_at')
      .in('estado', ['activo', 'inactivo'])
      .order('nombre')
      .range(from, from + PAGE_SIZE - 1);

    if (prodError) throw new Error(`Error exportando productos: ${prodError.message}`);
    allProductos.push(...(batch || []));
    if (!batch || batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  // Paginar ventas del ultimo mes
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const allVentas: any[] = [];
  from = 0;
  while (true) {
    const { data: batch, error: ventasError } = await supabase
      .from('ventas')
      .select('id, created_at, tipo_venta, total, metodo_pago, cliente_nombre, productos, subtotal, descuento_global, descuento_global_porcentaje, descuento_global_motivo')
      .gte('created_at', oneMonthAgo.toISOString())
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (ventasError) throw new Error(`Error exportando ventas: ${ventasError.message}`);
    allVentas.push(...(batch || []));
    if (!batch || batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return {
    productos: allProductos,
    ventas: allVentas,
    exportDate: new Date().toISOString(),
  };
}
