// API Service para comunicación directa con Supabase
// Sistema de Gestión de Precios - LA FUGA

import { supabase, transformarProductos, transformarProducto, parsePrecio, ProductoRaw } from './supabase';

const TABLA_PRODUCTOS = 'productos';

// Tipos basados en los schemas del frontend
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

export interface ProductosPaginados {
  total: number;
  limit: number;
  offset: number;
  count: number;
  productos: Producto[];
}

export interface Estadisticas {
  total_productos: number;
  productos_por_categoria: Record<string, number>;
  productos_sin_precio: number;
  productos_sin_codigo_barra: number;
  promedio_precio_menor: number;
  promedio_precio_mayor: number;
}

export interface ActualizacionMasiva {
  categoria?: string;
  codigos?: string[];
  porcentaje: number;
  aplicar_a: 'menor' | 'mayor' | 'ambos';
}

export interface ProductoUpdate {
  producto?: string;
  categoria?: string;
  precio_menor?: number;
  precio_mayor?: number;
  costo_compra?: number;
  unidad?: string;
  codigo_barra?: string;
}

// Clase de error personalizada para errores de API
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Función helper para manejar errores de Supabase
function handleSupabaseError(error: { message: string; code?: string }): never {
  throw new ApiError(
    error.message || 'Error de base de datos',
    500,
    error.code
  );
}

// API Service
export const api = {
  // ==================== HEALTH CHECK ====================

  async healthCheck(): Promise<{ status: string }> {
    const { error } = await supabase.from(TABLA_PRODUCTOS).select('id').limit(1);
    if (error) handleSupabaseError(error);
    return { status: 'ok' };
  },

  // ==================== PRODUCTOS ====================

  /**
   * Lista productos con filtros opcionales y paginación
   */
  async listarProductos(params: {
    query?: string;
    categoria?: string;
    precio_min?: number;
    precio_max?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<ProductosPaginados> {
    const { query, categoria, precio_min, precio_max, limit = 50, offset = 0 } = params;

    // Primero obtener el total
    let countQuery = supabase.from(TABLA_PRODUCTOS).select('*', { count: 'exact', head: true });

    if (categoria) {
      countQuery = countQuery.eq('CATEGORIA', categoria);
    }
    if (query) {
      countQuery = countQuery.or(`PRODUCTO.ilike.%${query}%,CÓDIGO.ilike.%${query}%,CODIGO_BARRA.ilike.%${query}%`);
    }

    const { count, error: countError } = await countQuery;
    if (countError) handleSupabaseError(countError);

    // Luego obtener los productos paginados
    let dataQuery = supabase.from(TABLA_PRODUCTOS).select('*');

    if (categoria) {
      dataQuery = dataQuery.eq('CATEGORIA', categoria);
    }
    if (query) {
      dataQuery = dataQuery.or(`PRODUCTO.ilike.%${query}%,CÓDIGO.ilike.%${query}%,CODIGO_BARRA.ilike.%${query}%`);
    }

    dataQuery = dataQuery.range(offset, offset + limit - 1);

    const { data, error } = await dataQuery;
    if (error) handleSupabaseError(error);

    let productos = transformarProductos(data as ProductoRaw[] || []);

    // Filtrar por precio si es necesario (post-query ya que los precios son texto)
    if (precio_min !== undefined || precio_max !== undefined) {
      productos = productos.filter(p => {
        if (precio_min !== undefined && p.precio_menor < precio_min) return false;
        if (precio_max !== undefined && p.precio_menor > precio_max) return false;
        return true;
      });
    }

    return {
      total: count || 0,
      limit,
      offset,
      count: productos.length,
      productos,
    };
  },

  /**
   * Busca productos por texto (nombre, código, código de barras)
   */
  async buscarProductos(query: string, limite: number = 20): Promise<Producto[]> {
    const result = await this.listarProductos({ query, limit: limite });
    return result.productos;
  },

  /**
   * Obtiene un producto por su ID
   */
  async obtenerProducto(id: number): Promise<Producto> {
    const { data, error } = await supabase
      .from(TABLA_PRODUCTOS)
      .select('*')
      .eq('id', id)
      .single();

    if (error) handleSupabaseError(error);
    return transformarProducto(data as ProductoRaw, 0);
  },

  /**
   * Obtiene un producto por su código SKU
   */
  async obtenerProductoPorCodigo(codigo: string): Promise<Producto> {
    const { data, error } = await supabase
      .from(TABLA_PRODUCTOS)
      .select('*')
      .eq('CÓDIGO', codigo)
      .single();

    if (error) handleSupabaseError(error);
    return transformarProducto(data as ProductoRaw, 0);
  },

  /**
   * Obtiene un producto por código de barras
   */
  async obtenerProductoPorCodigoBarras(codigoBarras: string): Promise<Producto> {
    const { data, error } = await supabase
      .from(TABLA_PRODUCTOS)
      .select('*')
      .eq('CODIGO_BARRA', codigoBarras)
      .single();

    if (error) handleSupabaseError(error);
    return transformarProducto(data as ProductoRaw, 0);
  },

  /**
   * Actualiza un producto existente
   */
  async actualizarProducto(id: number, datos: ProductoUpdate): Promise<Producto> {
    // Mapear campos del frontend a columnas de Supabase
    const updateData: Record<string, unknown> = {};

    if (datos.producto !== undefined) updateData['PRODUCTO'] = datos.producto;
    if (datos.categoria !== undefined) updateData['CATEGORIA'] = datos.categoria;
    if (datos.precio_menor !== undefined) updateData['PRECIO_MENOR'] = datos.precio_menor.toFixed(2);
    if (datos.precio_mayor !== undefined) updateData['PRECIO_MAYOR'] = datos.precio_mayor.toFixed(2);
    if (datos.unidad !== undefined) updateData['UNIDAD'] = datos.unidad;
    if (datos.codigo_barra !== undefined) updateData['CODIGO_BARRA'] = datos.codigo_barra;

    const { data, error } = await supabase
      .from(TABLA_PRODUCTOS)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) handleSupabaseError(error);
    return transformarProducto(data as ProductoRaw, 0);
  },

  /**
   * Elimina un producto
   */
  async eliminarProducto(id: number): Promise<void> {
    const { error } = await supabase
      .from(TABLA_PRODUCTOS)
      .delete()
      .eq('id', id);

    if (error) handleSupabaseError(error);
  },

  // ==================== CATEGORÍAS ====================

  /**
   * Obtiene todas las categorías disponibles
   */
  async obtenerCategorias(): Promise<string[]> {
    const { data, error } = await supabase
      .from(TABLA_PRODUCTOS)
      .select('CATEGORIA');

    if (error) handleSupabaseError(error);

    // Extraer categorías únicas
    const categoriasSet = new Set<string>();
    (data || []).forEach((item: { CATEGORIA: string }) => {
      if (item.CATEGORIA) {
        categoriasSet.add(item.CATEGORIA);
      }
    });

    return Array.from(categoriasSet).sort();
  },

  /**
   * Obtiene todos los productos de una categoría específica
   */
  async obtenerProductosPorCategoria(categoria: string): Promise<Producto[]> {
    const { data, error } = await supabase
      .from(TABLA_PRODUCTOS)
      .select('*')
      .eq('CATEGORIA', categoria);

    if (error) handleSupabaseError(error);
    return transformarProductos(data as ProductoRaw[] || []);
  },

  // ==================== ESTADÍSTICAS ====================

  /**
   * Obtiene estadísticas generales del sistema
   */
  async obtenerEstadisticas(): Promise<Estadisticas> {
    const { data, error } = await supabase.from(TABLA_PRODUCTOS).select('*');

    if (error) handleSupabaseError(error);

    const productos = transformarProductos(data as ProductoRaw[] || []);
    const total = productos.length;

    // Productos por categoría
    const productos_por_categoria: Record<string, number> = {};
    productos.forEach(p => {
      productos_por_categoria[p.categoria] = (productos_por_categoria[p.categoria] || 0) + 1;
    });

    // Productos sin precio
    const productos_sin_precio = productos.filter(p => p.precio_menor === 0 && p.precio_mayor === 0).length;

    // Productos sin código de barras
    const productos_sin_codigo_barra = productos.filter(p => !p.codigo_barra).length;

    // Promedios
    const productosConPrecio = productos.filter(p => p.precio_menor > 0 || p.precio_mayor > 0);
    const promedio_precio_menor = productosConPrecio.length > 0
      ? productosConPrecio.reduce((sum, p) => sum + p.precio_menor, 0) / productosConPrecio.length
      : 0;
    const promedio_precio_mayor = productosConPrecio.length > 0
      ? productosConPrecio.reduce((sum, p) => sum + p.precio_mayor, 0) / productosConPrecio.length
      : 0;

    return {
      total_productos: total,
      productos_por_categoria,
      productos_sin_precio,
      productos_sin_codigo_barra,
      promedio_precio_menor: Math.round(promedio_precio_menor * 100) / 100,
      promedio_precio_mayor: Math.round(promedio_precio_mayor * 100) / 100,
    };
  },

  // ==================== ACTUALIZACIÓN MASIVA ====================

  /**
   * Realiza una actualización masiva de precios
   */
  async actualizacionMasiva(datos: ActualizacionMasiva): Promise<{
    message: string;
    productos_actualizados: number;
  }> {
    const { categoria, codigos, porcentaje, aplicar_a } = datos;
    const factor = 1 + (porcentaje / 100);

    // Obtener productos a actualizar
    let query = supabase.from(TABLA_PRODUCTOS).select('*');

    if (categoria) {
      query = query.eq('CATEGORIA', categoria);
    }
    if (codigos && codigos.length > 0) {
      query = query.in('CÓDIGO', codigos);
    }

    const { data, error } = await query;
    if (error) handleSupabaseError(error);

    const productosRaw = data as ProductoRaw[] || [];
    let actualizados = 0;

    // Actualizar cada producto
    for (const raw of productosRaw) {
      const updateData: Record<string, string> = {};
      const precioMenor = parsePrecio(raw['PRECIO_MENOR']);
      const precioMayor = parsePrecio(raw['PRECIO_MAYOR']);

      if (aplicar_a === 'menor' || aplicar_a === 'ambos') {
        updateData['PRECIO_MENOR'] = (precioMenor * factor).toFixed(2);
      }
      if (aplicar_a === 'mayor' || aplicar_a === 'ambos') {
        updateData['PRECIO_MAYOR'] = (precioMayor * factor).toFixed(2);
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from(TABLA_PRODUCTOS)
          .update(updateData)
          .eq('id', raw.id);

        if (!updateError) actualizados++;
      }
    }

    return {
      message: `Se actualizaron ${actualizados} productos con un ${porcentaje >= 0 ? 'aumento' : 'descuento'} del ${Math.abs(porcentaje)}%`,
      productos_actualizados: actualizados,
    };
  },

  /**
   * Actualiza precios por categoría
   */
  async actualizarPreciosPorCategoria(
    categoria: string,
    porcentaje: number,
    aplicarA: 'menor' | 'mayor' | 'ambos' = 'ambos'
  ): Promise<{ message: string; productos_actualizados: number }> {
    return this.actualizacionMasiva({
      categoria,
      porcentaje,
      aplicar_a: aplicarA,
    });
  },

  /**
   * Actualiza precios por lista de códigos
   */
  async actualizarPreciosPorCodigos(
    codigos: string[],
    porcentaje: number,
    aplicarA: 'menor' | 'mayor' | 'ambos' = 'ambos'
  ): Promise<{ message: string; productos_actualizados: number }> {
    return this.actualizacionMasiva({
      codigos,
      porcentaje,
      aplicar_a: aplicarA,
    });
  },

  // ==================== IMPORTACIÓN ====================

  /**
   * Importa productos desde un archivo Excel (no implementado para Supabase directo)
   */
  async importarExcel(_file: File): Promise<{
    message: string;
    productos_creados: number;
    productos_actualizados: number;
    errores: string[];
  }> {
    throw new ApiError(
      'Importación de Excel no disponible. Use la interfaz de Supabase para importar datos.',
      501,
      'NOT_IMPLEMENTED'
    );
  },

  // ==================== REPORTES ====================

  /**
   * Obtiene datos para reportes de negocio
   */
  async obtenerReportes(): Promise<ReportesData> {
    const { data, error } = await supabase.from(TABLA_PRODUCTOS).select('*');
    if (error) handleSupabaseError(error);

    const productos = transformarProductos(data as ProductoRaw[] || []);

    // Calcular valuación
    const total_costo_inventario = productos.reduce((sum, p) => sum + p.costo_compra, 0);
    const total_valor_minorista = productos.reduce((sum, p) => sum + p.precio_menor, 0);
    const total_valor_mayorista = productos.reduce((sum, p) => sum + p.precio_mayor, 0);

    // Calcular rentabilidad
    const productosConCosto = productos.filter(p => p.costo_compra > 0);
    const margen_promedio_minorista = productosConCosto.length > 0
      ? productosConCosto.reduce((sum, p) => sum + ((p.precio_menor - p.costo_compra) / p.costo_compra * 100), 0) / productosConCosto.length
      : 0;
    const margen_promedio_mayorista = productosConCosto.length > 0
      ? productosConCosto.reduce((sum, p) => sum + ((p.precio_mayor - p.costo_compra) / p.costo_compra * 100), 0) / productosConCosto.length
      : 0;

    // Alertas
    const productos_margen_negativo = productos.filter(p => p.costo_compra > 0 && p.precio_menor < p.costo_compra);
    const productos_sin_precio = productos.filter(p => p.precio_menor === 0 && p.precio_mayor === 0);

    // Performance por categoría
    const categorias = [...new Set(productos.map(p => p.categoria))];
    const categoria_performance = categorias.map(categoria => {
      const prods = productos.filter(p => p.categoria === categoria);
      const total_costo = prods.reduce((sum, p) => sum + p.costo_compra, 0);
      const total_valor_menor = prods.reduce((sum, p) => sum + p.precio_menor, 0);
      const total_valor_mayor = prods.reduce((sum, p) => sum + p.precio_mayor, 0);

      return {
        categoria,
        total_items: prods.length,
        total_costo,
        total_valor_menor,
        total_valor_mayor,
        margen_promedio_menor: total_costo > 0 ? ((total_valor_menor - total_costo) / total_costo * 100) : 0,
        margen_promedio_mayor: total_costo > 0 ? ((total_valor_mayor - total_costo) / total_costo * 100) : 0,
      };
    });

    return {
      valuacion: {
        total_costo_inventario,
        total_valor_minorista,
        total_valor_mayorista,
        ganancia_potencial_minorista: total_valor_minorista - total_costo_inventario,
        ganancia_potencial_mayorista: total_valor_mayorista - total_costo_inventario,
      },
      rentabilidad: {
        margen_promedio_minorista: Math.round(margen_promedio_minorista * 100) / 100,
        margen_promedio_mayorista: Math.round(margen_promedio_mayorista * 100) / 100,
      },
      alertas: {
        productos_margen_negativo,
        productos_sin_precio,
        total_margen_negativo: productos_margen_negativo.length,
        total_sin_precio: productos_sin_precio.length,
      },
      categoria_performance,
    };
  },
};

export interface ReportesData {
  valuacion: {
    total_costo_inventario: number;
    total_valor_minorista: number;
    total_valor_mayorista: number;
    ganancia_potencial_minorista: number;
    ganancia_potencial_mayorista: number;
  };
  rentabilidad: {
    margen_promedio_minorista: number;
    margen_promedio_mayorista: number;
  };
  alertas: {
    productos_margen_negativo: Producto[];
    productos_sin_precio: Producto[];
    total_margen_negativo: number;
    total_sin_precio: number;
  };
  categoria_performance: {
    categoria: string;
    total_items: number;
    total_costo: number;
    total_valor_menor: number;
    total_valor_mayor: number;
    margen_promedio_menor: number;
    margen_promedio_mayor: number;
  }[];
}

export default api;
