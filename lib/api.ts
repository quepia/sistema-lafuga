// API Service para comunicación directa con Supabase
// Sistema de Gestión de Precios - LA FUGA

import { supabase, Producto, ProductoUpdate, ProductoInsert, ProductoEnVenta, HistorialProducto, calcularMargen } from './supabase';
import { logProductChange } from './supabase-utils';

const TABLA_PRODUCTOS = 'productos';
const TABLA_VENTAS = 'ventas';
const TABLA_HISTORIAL = 'historial_productos';

// Re-export types for convenience
export type { Producto, ProductoUpdate, ProductoInsert, ProductoEnVenta, HistorialProducto };

// ==================== TIPOS DE VENTAS ====================

/**
 * Legacy product format in sales (for backward compatibility)
 */
export interface VentaProducto {
  producto_id: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

/**
 * Extended product format in sales (with custom pricing support)
 */
export interface VentaProductoExtendido extends VentaProducto {
  precio_lista_menor?: number;
  precio_lista_mayor?: number;
  costo_unitario?: number;
  tipo_precio?: 'menor' | 'mayor' | 'custom';
  descuento_linea?: number;
  descuento_linea_porcentaje?: number;
  motivo_descuento?: string;
}

export interface Venta {
  id: string;
  created_at: string;
  tipo_venta: 'MAYOR' | 'MENOR';
  total: number;
  metodo_pago: string;
  cliente_nombre: string | null;
  productos: VentaProducto[] | VentaProductoExtendido[];

  // NEW FIELDS (Migration 003)
  subtotal?: number;
  descuento_global?: number;
  descuento_global_porcentaje?: number;
  descuento_global_motivo?: string | null;
  requirio_autorizacion?: boolean;
  autorizado_por?: string | null;
}

export interface VentaInsert {
  tipo_venta: 'MAYOR' | 'MENOR';
  total: number;
  metodo_pago?: string;
  cliente_nombre?: string;
  productos: VentaProducto[] | VentaProductoExtendido[];

  // NEW FIELDS (Migration 003)
  subtotal?: number;
  descuento_global?: number;
  descuento_global_porcentaje?: number;
  descuento_global_motivo?: string;
  requirio_autorizacion?: boolean;
  autorizado_por?: string;
}

export interface VentasPaginadas {
  total: number;
  limit: number;
  offset: number;
  count: number;
  ventas: Venta[];
}

export interface ResumenCaja {
  fecha: string;
  total_ventas: number;
  cantidad_ventas: number;
  total_efectivo: number;
  total_transferencia: number;
  total_tarjeta: number;
  ventas_mayorista: number;
  ventas_minorista: number;
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
  promedio_costo: number;
}

export interface ActualizacionMasiva {
  categoria?: string;
  codigos?: string[];
  porcentaje: number;
  aplicar_a: 'menor' | 'mayor' | 'costo' | 'ambos' | 'todos';
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
   * NOTA: Supabase por defecto limita a 1000 filas. Usamos range() para manejar esto.
   */
  async listarProductos(params: {
    query?: string;
    categoria?: string;
    precio_min?: number;
    precio_max?: number;
    incluirEliminados?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<ProductosPaginados> {
    const { query, categoria, precio_min, precio_max, incluirEliminados = false, limit = 50, offset = 0 } = params;

    // Base query builder
    const buildQuery = (head = false) => {
      let q = supabase.from(TABLA_PRODUCTOS).select('*', { count: 'exact', head });

      if (!incluirEliminados) {
        q = q.neq('estado', 'eliminado');
      }
      if (categoria) {
        q = q.eq('categoria', categoria);
      }
      if (precio_min !== undefined) {
        q = q.gte('precio_menor', precio_min);
      }
      if (precio_max !== undefined) {
        q = q.lte('precio_menor', precio_max);
      }

      // Improved Search Logic: Multi-word support
      if (query && query.trim()) {
        const cleanQuery = query.trim();
        // Check if it's potentially an ID or Barcode (single word, no spaces usually)
        const isSingleToken = !cleanQuery.includes(' ');

        if (isSingleToken) {
          // Classic OR search for ID, Name, Barcode
          q = q.or(`nombre.ilike.%${cleanQuery}%,id.ilike.%${cleanQuery}%,codigo_barra.ilike.%${cleanQuery}%`);
        } else {
          // Multi-word search: Name must match ALL words (AND logic)
          // OR exact ID match OR exact Barcode match
          // Note: Supabase doesn't easily support mixed AND/OR groups in one line without raw SQL or RPC.
          // Workaround for simple cases: Use an OR group where:
          // 1. ID ilike query OR
          // 2. Barcode ilike query OR
          // 3. Name matches all tokens

          // However, for "suavizante suelto", we want to match names containing "suavizante" AND "suelto".
          // Supabase 'ilike' doesn't support ALL.
          // We can use `.textSearch` but it requires a setup. 
          // Simpler approach for now using PostgREST syntax:
          // We will prioritize name search if spacing exists.

          const tokens = cleanQuery.split(/\s+/).map(t => `%${t}%`);
          // Chain ILIKEs for name
          tokens.forEach(token => {
            q = q.ilike('nombre', token);
          });
          // Note: This effectively searches for Name containing T1 AND Name containing T2...
          // It excludes ID/Barcode search in this specific multi-word branch which is usually acceptable 
          // because IDs/Barcodes rarely have spaces.
        }
      }

      return q;
    };

    // Get Count
    const countQuery = buildQuery(true);
    const { count, error: countError } = await countQuery;
    if (countError) handleSupabaseError(countError);

    // Get Data
    let dataQuery = buildQuery(false);

    // Default sorting
    dataQuery = dataQuery.order('nombre', { ascending: true });

    // Pagination
    dataQuery = dataQuery.range(offset, offset + limit - 1);

    const { data, error } = await dataQuery;
    if (error) handleSupabaseError(error);

    const productos = (data as Producto[]) || [];

    return {
      total: count || 0,
      limit,
      offset,
      count: productos.length,
      productos,
    };
  },

  async obtenerProductosSinCodigo(limit: number = 200): Promise<Producto[]> {
    const { data, error } = await supabase
      .from(TABLA_PRODUCTOS)
      .select("*")
      .is("codigo_barra", null)
      .neq("estado", "eliminado")
      .limit(limit);

    if (error) handleSupabaseError(error);

    return (data as Producto[]) || [];
  },

  async asignarCodigoBarra(id: string, codigoBarra: string): Promise<Producto> {
    const { data, error } = await supabase
      .from(TABLA_PRODUCTOS)
      .update({ codigo_barra: codigoBarra })
      .eq('id', id)
      .select()
      .single();

    if (error) handleSupabaseError(error);
    return data as Producto;
  },

  /**
   * Obtiene TODOS los productos (sin paginación, para estadísticas)
   * Usa múltiples consultas si hay más de 1000 productos
   */
  async obtenerTodosLosProductos(): Promise<Producto[]> {
    const BATCH_SIZE = 1000;
    let allProducts: Producto[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(TABLA_PRODUCTOS)
        .select('*')
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) handleSupabaseError(error);

      const productos = (data as Producto[]) || [];
      allProducts = [...allProducts, ...productos];

      if (productos.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        offset += BATCH_SIZE;
      }
    }

    return allProducts;
  },

  /**
   * Busca productos por texto (nombre, código, código de barras)
   * Aumentado el limite por defecto a 50
   */
  async buscarProductos(query: string, limite: number = 50): Promise<Producto[]> {
    const result = await this.listarProductos({ query, limit: limite });
    return result.productos;
  },

  /**
   * Obtiene un producto por su ID (código)
   */
  async obtenerProducto(id: string): Promise<Producto> {
    const { data, error } = await supabase
      .from(TABLA_PRODUCTOS)
      .select('*')
      .eq('id', id)
      .single();

    if (error) handleSupabaseError(error);
    return data as Producto;
  },

  /**
   * Obtiene un producto por código de barras
   */
  async obtenerProductoPorCodigoBarras(codigoBarras: string): Promise<Producto> {
    const { data, error } = await supabase
      .from(TABLA_PRODUCTOS)
      .select('*')
      .eq('codigo_barra', codigoBarras)
      .single();

    if (error) handleSupabaseError(error);
    return data as Producto;
  },

  /**
   * Actualiza un producto existente
   */
  async actualizarProducto(id: string, datos: ProductoUpdate): Promise<Producto> {
    // Obtener estado anterior para historial
    const { data: anterior } = await supabase
      .from(TABLA_PRODUCTOS)
      .select('*')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from(TABLA_PRODUCTOS)
      .update({
        ...datos,
        ultima_actualizacion: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) handleSupabaseError(error);

    // Registrar cambios en el historial
    if (anterior && data) {
      const cambios = Object.keys(datos) as (keyof ProductoUpdate)[];
      // Campos exentos de registro
      const ignorar = ['ultima_actualizacion', 'motivo_eliminacion'];

      for (const campo of cambios) {
        if (ignorar.includes(campo)) continue;

        const valAnterior = anterior[campo as keyof Producto];
        const valNuevo = data[campo as keyof Producto];

        if (valAnterior != valNuevo) {
          // Ejecutar en background (no bloquear respuesta)
          logProductChange(
            id,
            id, // Usamos ID como SKU
            campo,
            valAnterior,
            valNuevo,
            'Actualización manual'
          ).catch(console.error);
        }
      }
    }

    return data as Producto;
  },

  /**
   * Crea un nuevo producto
   */
  async crearProducto(datos: ProductoInsert): Promise<Producto> {
    const { data, error } = await supabase
      .from(TABLA_PRODUCTOS)
      .insert({
        ...datos,
        created_at: new Date().toISOString(),
        ultima_actualizacion: new Date().toISOString(),
        estado: 'activo'
      })
      .select()
      .single();

    if (error) handleSupabaseError(error);
    return data as Producto;
  },

  /**
   * Migrar producto a un nuevo ID (Crear nuevo y eliminar anterior)
   * Se usa para "editar" el ID de un producto.
   */
  async migrarProducto(idAnterior: string, nuevoId: string, datos: ProductoInsert): Promise<Producto> {
    // 1. Verificar si el nuevo ID ya existe
    const { data: existe } = await supabase
      .from(TABLA_PRODUCTOS)
      .select('id')
      .eq('id', nuevoId)
      .maybeSingle(); // Usar maybeSingle para no lanzar error si no existe

    if (existe) {
      throw new ApiError(`El codigo ${nuevoId} ya esta en uso.`, 409);
    }

    // 2. Crear el nuevo producto
    const nuevoProducto = await this.crearProducto({ ...datos, id: nuevoId });

    // 3. Intentar eliminar el anterior
    const { error: deleteError } = await supabase
      .from(TABLA_PRODUCTOS)
      .delete()
      .eq('id', idAnterior);

    if (deleteError) {
      // Si falla la eliminacion (probablemente por Foreign Key constraints en ventas),
      // revertimos la creacion del nuevo producto
      await supabase.from(TABLA_PRODUCTOS).delete().eq('id', nuevoId);

      if (deleteError.code === '23503') { // ForeignKey Violation
        throw new ApiError('No se puede cambiar el ID porque el producto tiene historial de ventas/movimientos asociados or otros registros dependientes.', 400, deleteError.code);
      }

      handleSupabaseError(deleteError);
    }

    return nuevoProducto;
  },

  /**
   * Elimina un producto
   */
  async eliminarProducto(id: string): Promise<void> {
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
    // Obtener todas las categorías (puede haber más de 1000 productos)
    const productos = await this.obtenerTodosLosProductos();

    // Extraer categorías únicas
    const categoriasSet = new Set<string>();
    productos.forEach((p) => {
      if (p.categoria) {
        categoriasSet.add(p.categoria);
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
      .eq('categoria', categoria)
      .range(0, 2999); // Aumentado para categorías grandes

    if (error) handleSupabaseError(error);
    return (data as Producto[]) || [];
  },

  // ==================== ESTADÍSTICAS ====================

  /**
   * Obtiene estadísticas generales del sistema
   * Usa obtenerTodosLosProductos() para evitar el límite de 1000
   */
  /**
   * Obtiene estadísticas generales del sistema
   * Usa múltiples consultas si hay más de 1000 productos, pero optimizado 
   * seleccionando solo columnas necesarias.
   */
  async obtenerEstadisticas(): Promise<Estadisticas> {
    const BATCH_SIZE = 1000;
    let allProducts: Partial<Producto>[] = [];
    let offset = 0;
    let hasMore = true;

    // Fetch optimized payload (only necessary columns)
    // Avoid fetching images, descriptions, logs, etc.
    while (hasMore) {
      const { data, error } = await supabase
        .from(TABLA_PRODUCTOS)
        .select('id, categoria, precio_menor, precio_mayor, costo, codigo_barra')
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) handleSupabaseError(error);

      const productos = (data as Partial<Producto>[]) || [];
      allProducts = [...allProducts, ...productos];

      if (productos.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        offset += BATCH_SIZE;
      }
    }

    const productos = allProducts;
    const total = productos.length;

    // Productos por categoría
    const productos_por_categoria: Record<string, number> = {};
    productos.forEach(p => {
      const cat = p.categoria || 'Sin categoría';
      productos_por_categoria[cat] = (productos_por_categoria[cat] || 0) + 1;
    });

    // Productos sin precio
    const productos_sin_precio = productos.filter(p =>
      (p.precio_menor === 0 || p.precio_menor === null) &&
      (p.precio_mayor === 0 || p.precio_mayor === null)
    ).length;

    // Productos sin código de barras
    const productos_sin_codigo_barra = productos.filter(p => !p.codigo_barra).length;

    // Promedios (solo productos con valores válidos)
    // Use optional chaining or defaults as we are working with Partial<Producto>
    const productosConPrecioMenor = productos.filter(p => (p.precio_menor || 0) > 0);
    const productosConPrecioMayor = productos.filter(p => (p.precio_mayor || 0) > 0);
    const productosConCosto = productos.filter(p => (p.costo || 0) > 0);

    const promedio_precio_menor = productosConPrecioMenor.length > 0
      ? productosConPrecioMenor.reduce((sum, p) => sum + (p.precio_menor || 0), 0) / productosConPrecioMenor.length
      : 0;

    const promedio_precio_mayor = productosConPrecioMayor.length > 0
      ? productosConPrecioMayor.reduce((sum, p) => sum + (p.precio_mayor || 0), 0) / productosConPrecioMayor.length
      : 0;

    const promedio_costo = productosConCosto.length > 0
      ? productosConCosto.reduce((sum, p) => sum + (p.costo || 0), 0) / productosConCosto.length
      : 0;

    return {
      total_productos: total,
      productos_por_categoria,
      productos_sin_precio,
      productos_sin_codigo_barra,
      promedio_precio_menor: Math.round(promedio_precio_menor * 100) / 100,
      promedio_precio_mayor: Math.round(promedio_precio_mayor * 100) / 100,
      promedio_costo: Math.round(promedio_costo * 100) / 100,
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
      query = query.eq('categoria', categoria);
    }
    if (codigos && codigos.length > 0) {
      query = query.in('id', codigos);
    }

    // Usar range amplio para categorías grandes
    query = query.range(0, 2999);

    const { data, error } = await query;
    if (error) handleSupabaseError(error);

    const productosRaw = (data as Producto[]) || [];
    let actualizados = 0;

    // Actualizar cada producto
    for (const producto of productosRaw) {
      const updateData: Partial<Producto> = {};

      if ((aplicar_a === 'menor' || aplicar_a === 'ambos' || aplicar_a === 'todos') && producto.precio_menor > 0) {
        updateData.precio_menor = Math.round(producto.precio_menor * factor * 100) / 100;
      }
      if ((aplicar_a === 'mayor' || aplicar_a === 'ambos' || aplicar_a === 'todos') && producto.precio_mayor > 0) {
        updateData.precio_mayor = Math.round(producto.precio_mayor * factor * 100) / 100;
      }
      if ((aplicar_a === 'costo' || aplicar_a === 'todos') && producto.costo > 0) {
        updateData.costo = Math.round(producto.costo * factor * 100) / 100;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from(TABLA_PRODUCTOS)
          .update(updateData)
          .eq('id', producto.id);

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
    aplicarA: 'menor' | 'mayor' | 'costo' | 'ambos' | 'todos' = 'ambos'
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
    aplicarA: 'menor' | 'mayor' | 'costo' | 'ambos' | 'todos' = 'ambos'
  ): Promise<{ message: string; productos_actualizados: number }> {
    return this.actualizacionMasiva({
      codigos,
      porcentaje,
      aplicar_a: aplicarA,
    });
  },

  // ==================== REPORTES ====================

  /**
   * Obtiene datos para reportes de negocio
   */
  async obtenerReportes(): Promise<ReportesData> {
    const productos = await this.obtenerTodosLosProductos();

    // Calcular valuación
    const total_costo_inventario = productos.reduce((sum, p) => sum + (p.costo || 0), 0);
    const total_valor_minorista = productos.reduce((sum, p) => sum + (p.precio_menor || 0), 0);
    const total_valor_mayorista = productos.reduce((sum, p) => sum + (p.precio_mayor || 0), 0);

    // Calcular rentabilidad (solo productos con costo > 0)
    const productosConCosto = productos.filter(p => p.costo > 0);
    const margen_promedio_minorista = productosConCosto.length > 0
      ? productosConCosto.reduce((sum, p) => sum + calcularMargen(p.precio_menor, p.costo), 0) / productosConCosto.length
      : 0;
    const margen_promedio_mayorista = productosConCosto.length > 0
      ? productosConCosto.reduce((sum, p) => sum + calcularMargen(p.precio_mayor, p.costo), 0) / productosConCosto.length
      : 0;

    // Alertas
    const productos_margen_negativo = productos.filter(p => p.costo > 0 && p.precio_menor < p.costo);
    const productos_sin_precio = productos.filter(p =>
      (p.precio_menor === 0 || p.precio_menor === null) &&
      (p.precio_mayor === 0 || p.precio_mayor === null)
    );

    // Performance por categoría
    const categorias = [...new Set(productos.map(p => p.categoria || 'Sin categoría'))];
    const categoria_performance = categorias.map(categoria => {
      const prods = productos.filter(p => (p.categoria || 'Sin categoría') === categoria);
      const total_costo = prods.reduce((sum, p) => sum + (p.costo || 0), 0);
      const total_valor_menor = prods.reduce((sum, p) => sum + (p.precio_menor || 0), 0);
      const total_valor_mayor = prods.reduce((sum, p) => sum + (p.precio_mayor || 0), 0);

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

  // ==================== VENTAS ====================

  /**
   * Crea una nueva venta y la guarda en la base de datos
   */
  async crearVenta(datos: VentaInsert): Promise<Venta> {
    const { data, error } = await supabase
      .from(TABLA_VENTAS)
      .insert({
        tipo_venta: datos.tipo_venta,
        total: datos.total,
        metodo_pago: datos.metodo_pago || 'Efectivo',
        cliente_nombre: datos.cliente_nombre || 'Cliente General',
        productos: datos.productos,
      })
      .select()
      .single();

    if (error) handleSupabaseError(error);
    return data as Venta;
  },

  /**
   * Lista ventas con filtros opcionales y paginación
   */
  async listarVentas(params: {
    fecha_inicio?: string;
    fecha_fin?: string;
    tipo_venta?: 'MAYOR' | 'MENOR';
    metodo_pago?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<VentasPaginadas> {
    const { fecha_inicio, fecha_fin, tipo_venta, metodo_pago, limit = 50, offset = 0 } = params;

    // Contar total
    let countQuery = supabase.from(TABLA_VENTAS).select('*', { count: 'exact', head: true });

    if (fecha_inicio) {
      countQuery = countQuery.gte('created_at', fecha_inicio);
    }
    if (fecha_fin) {
      countQuery = countQuery.lte('created_at', fecha_fin);
    }
    if (tipo_venta) {
      countQuery = countQuery.eq('tipo_venta', tipo_venta);
    }
    if (metodo_pago) {
      countQuery = countQuery.eq('metodo_pago', metodo_pago);
    }

    const { count, error: countError } = await countQuery;
    if (countError) handleSupabaseError(countError);

    // Obtener datos
    let dataQuery = supabase.from(TABLA_VENTAS).select('*').order('created_at', { ascending: false });

    if (fecha_inicio) {
      dataQuery = dataQuery.gte('created_at', fecha_inicio);
    }
    if (fecha_fin) {
      dataQuery = dataQuery.lte('created_at', fecha_fin);
    }
    if (tipo_venta) {
      dataQuery = dataQuery.eq('tipo_venta', tipo_venta);
    }
    if (metodo_pago) {
      dataQuery = dataQuery.eq('metodo_pago', metodo_pago);
    }

    dataQuery = dataQuery.range(offset, offset + limit - 1);

    const { data, error } = await dataQuery;
    if (error) handleSupabaseError(error);

    return {
      total: count || 0,
      limit,
      offset,
      count: (data as Venta[])?.length || 0,
      ventas: (data as Venta[]) || [],
    };
  },

  /**
   * Obtiene el resumen de caja para una fecha específica
   */
  async obtenerResumenCaja(fecha: string): Promise<ResumenCaja> {
    // fecha en formato YYYY-MM-DD
    const fechaInicio = `${fecha}T00:00:00`;
    const fechaFin = `${fecha}T23:59:59`;

    const { data, error } = await supabase
      .from(TABLA_VENTAS)
      .select('*')
      .gte('created_at', fechaInicio)
      .lte('created_at', fechaFin);

    if (error) handleSupabaseError(error);

    const ventas = (data as Venta[]) || [];

    const total_ventas = ventas.reduce((sum, v) => sum + v.total, 0);
    const total_efectivo = ventas
      .filter(v => v.metodo_pago === 'Efectivo')
      .reduce((sum, v) => sum + v.total, 0);
    const total_transferencia = ventas
      .filter(v => v.metodo_pago === 'Transferencia')
      .reduce((sum, v) => sum + v.total, 0);
    const total_tarjeta = ventas
      .filter(v => v.metodo_pago === 'Tarjeta')
      .reduce((sum, v) => sum + v.total, 0);
    const ventas_mayorista = ventas
      .filter(v => v.tipo_venta === 'MAYOR')
      .reduce((sum, v) => sum + v.total, 0);
    const ventas_minorista = ventas
      .filter(v => v.tipo_venta === 'MENOR')
      .reduce((sum, v) => sum + v.total, 0);

    return {
      fecha,
      total_ventas,
      cantidad_ventas: ventas.length,
      total_efectivo,
      total_transferencia,
      total_tarjeta,
      ventas_mayorista,
      ventas_minorista,
    };
  },

  /**
   * Obtiene una venta por su ID
   */
  async obtenerVenta(id: string): Promise<Venta> {
    const { data, error } = await supabase
      .from(TABLA_VENTAS)
      .select('*')
      .eq('id', id)
      .single();

    if (error) handleSupabaseError(error);
    return data as Venta;
  },

  /**
   * Elimina una venta (usar con cuidado)
   */
  async eliminarVenta(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLA_VENTAS)
      .delete()
      .eq('id', id);

    if (error) handleSupabaseError(error);
  },

  // ==================== SOFT DELETE PRODUCTS ====================

  /**
   * Soft delete a product (marks as 'eliminado' instead of deleting)
   * This preserves the product for historical sales data
   */
  async softDeleteProducto(id: string, motivo: string): Promise<Producto> {
    const { data, error } = await supabase
      .from(TABLA_PRODUCTOS)
      .update({
        estado: 'eliminado',
        motivo_eliminacion: motivo,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) handleSupabaseError(error);
    return data as Producto;
  },

  /**
   * Restore a soft-deleted product
   */
  async restaurarProducto(id: string): Promise<Producto> {
    const { data, error } = await supabase
      .from(TABLA_PRODUCTOS)
      .update({
        estado: 'activo',
        motivo_eliminacion: null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) handleSupabaseError(error);
    return data as Producto;
  },

  /**
   * Check if a product has been used in any sales
   */
  async productoTieneVentas(id: string): Promise<boolean> {
    // Search for the product ID in the productos JSONB column
    const { data, error } = await supabase
      .from(TABLA_VENTAS)
      .select('id')
      .contains('productos', [{ producto_id: id }])
      .limit(1);

    if (error) {
      console.error('Error checking product sales:', error);
      return false;
    }

    return data !== null && data.length > 0;
  },

  /**
   * List only active products (excludes 'eliminado' and optionally 'inactivo')
   */
  async listarProductosActivos(params: {
    query?: string;
    categoria?: string;
    incluirInactivos?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<ProductosPaginados> {
    const { query, categoria, incluirInactivos = false, limit = 50, offset = 0 } = params;

    // Build count query
    let countQuery = supabase.from(TABLA_PRODUCTOS).select('*', { count: 'exact', head: true });

    // Exclude deleted products, optionally include inactive
    if (incluirInactivos) {
      countQuery = countQuery.neq('estado', 'eliminado');
    } else {
      countQuery = countQuery.or('estado.is.null,estado.eq.activo');
    }

    if (categoria) {
      countQuery = countQuery.eq('categoria', categoria);
    }
    if (query) {
      countQuery = countQuery.or(`nombre.ilike.%${query}%,id.ilike.%${query}%,codigo_barra.ilike.%${query}%`);
    }

    const { count, error: countError } = await countQuery;
    if (countError) handleSupabaseError(countError);

    // Build data query
    let dataQuery = supabase.from(TABLA_PRODUCTOS).select('*');

    if (incluirInactivos) {
      dataQuery = dataQuery.neq('estado', 'eliminado');
    } else {
      dataQuery = dataQuery.or('estado.is.null,estado.eq.activo');
    }

    if (categoria) {
      dataQuery = dataQuery.eq('categoria', categoria);
    }
    if (query) {
      dataQuery = dataQuery.or(`nombre.ilike.%${query}%,id.ilike.%${query}%,codigo_barra.ilike.%${query}%`);
    }

    dataQuery = dataQuery.range(offset, offset + limit - 1);

    const { data, error } = await dataQuery;
    if (error) handleSupabaseError(error);

    const productos = (data as Producto[]) || [];

    return {
      total: count || 0,
      limit,
      offset,
      count: productos.length,
      productos,
    };
  },

  // ==================== PRODUCT HISTORY ====================

  /**
   * Get product change history
   */
  async obtenerHistorialProducto(id_producto: string, limite: number = 50): Promise<HistorialProducto[]> {
    const { data, error } = await supabase
      .from(TABLA_HISTORIAL)
      .select('*')
      .eq('id_producto', id_producto)
      .order('created_at', { ascending: false })
      .limit(limite);

    if (error) handleSupabaseError(error);
    return (data as HistorialProducto[]) || [];
  },

  /**
   * Get recent product history (across all products)
   */
  async obtenerHistorialReciente(limite: number = 50): Promise<HistorialProducto[]> {
    const { data, error } = await supabase
      .from(TABLA_HISTORIAL)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite);

    if (error) handleSupabaseError(error);
    return (data as HistorialProducto[]) || [];
  },

  /**
   * Log a product change to history
   */
  async registrarCambioProducto(
    id_producto: string,
    codigo_sku: string,
    campo: string,
    valorAnterior: unknown,
    valorNuevo: unknown,
    motivo?: string
  ): Promise<HistorialProducto> {
    const { data, error } = await supabase
      .from(TABLA_HISTORIAL)
      .insert({
        id_producto,
        codigo_sku,
        campo_modificado: campo,
        valor_anterior: valorAnterior != null ? String(valorAnterior) : null,
        valor_nuevo: valorNuevo != null ? String(valorNuevo) : null,
        motivo: motivo || null,
        id_usuario: null,
      })
      .select()
      .single();

    if (error) handleSupabaseError(error);
    return data as HistorialProducto;
  },

  // ==================== EXTENDED SALE CREATION ====================

  /**
   * Creates a new sale with extended pricing and discount support
   */
  async crearVentaExtendida(datos: VentaInsert): Promise<Venta> {
    const { data, error } = await supabase
      .from(TABLA_VENTAS)
      .insert({
        tipo_venta: datos.tipo_venta,
        total: datos.total,
        subtotal: datos.subtotal || datos.total,
        metodo_pago: datos.metodo_pago || 'Efectivo',
        cliente_nombre: datos.cliente_nombre || 'Cliente General',
        productos: datos.productos,
        descuento_global: datos.descuento_global || 0,
        descuento_global_porcentaje: datos.descuento_global_porcentaje || 0,
        descuento_global_motivo: datos.descuento_global_motivo || null,
        requirio_autorizacion: datos.requirio_autorizacion || false,
        autorizado_por: datos.autorizado_por || null,
      })
      .select()
      .single();

    if (error) handleSupabaseError(error);
    return data as Venta;
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
