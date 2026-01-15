// API Service para comunicación con el backend FastAPI
// Sistema de Gestión de Precios - LA FUGA

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Tipos basados en los schemas del backend
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

// Función helper para manejar respuestas
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.detail || `Error ${response.status}`,
      response.status,
      errorData.detail
    );
  }
  return response.json();
}

// Función helper para manejar errores de conexión
function handleFetchError(error: unknown): never {
  if (error instanceof ApiError) {
    throw error;
  }
  if (error instanceof TypeError && error.message.includes('fetch')) {
    throw new ApiError(
      'No se pudo conectar al servidor. Verifica que el backend esté corriendo en ' + API_URL,
      0,
      'CONNECTION_ERROR'
    );
  }
  throw new ApiError(
    error instanceof Error ? error.message : 'Error desconocido',
    0
  );
}

// API Service
export const api = {
  // ==================== HEALTH CHECK ====================

  async healthCheck(): Promise<{ status: string }> {
    try {
      const response = await fetch(`${API_URL}/health`);
      return handleResponse(response);
    } catch (error) {
      handleFetchError(error);
    }
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
    try {
      const searchParams = new URLSearchParams();

      if (params.query) searchParams.set('query', params.query);
      if (params.categoria) searchParams.set('categoria', params.categoria);
      if (params.precio_min !== undefined) searchParams.set('precio_min', params.precio_min.toString());
      if (params.precio_max !== undefined) searchParams.set('precio_max', params.precio_max.toString());
      if (params.limit !== undefined) searchParams.set('limit', params.limit.toString());
      if (params.offset !== undefined) searchParams.set('offset', params.offset.toString());

      const url = `${API_URL}/productos${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      const response = await fetch(url);
      return handleResponse(response);
    } catch (error) {
      handleFetchError(error);
    }
  },

  /**
   * Busca productos por texto (nombre, código, código de barras)
   */
  async buscarProductos(query: string, limite: number = 20): Promise<Producto[]> {
    try {
      const result = await this.listarProductos({ query, limit: limite });
      return result.productos;
    } catch (error) {
      handleFetchError(error);
    }
  },

  /**
   * Obtiene un producto por su ID
   */
  async obtenerProducto(id: number): Promise<Producto> {
    try {
      const response = await fetch(`${API_URL}/productos/${id}`);
      return handleResponse(response);
    } catch (error) {
      handleFetchError(error);
    }
  },

  /**
   * Obtiene un producto por su código SKU
   */
  async obtenerProductoPorCodigo(codigo: string): Promise<Producto> {
    try {
      const response = await fetch(`${API_URL}/productos/codigo/${encodeURIComponent(codigo)}`);
      return handleResponse(response);
    } catch (error) {
      handleFetchError(error);
    }
  },

  /**
   * Obtiene un producto por código de barras
   */
  async obtenerProductoPorCodigoBarras(codigoBarras: string): Promise<Producto> {
    try {
      const response = await fetch(`${API_URL}/productos/barcode/${encodeURIComponent(codigoBarras)}`);
      return handleResponse(response);
    } catch (error) {
      handleFetchError(error);
    }
  },

  /**
   * Actualiza un producto existente
   */
  async actualizarProducto(id: number, datos: ProductoUpdate): Promise<Producto> {
    try {
      const response = await fetch(`${API_URL}/productos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datos),
      });
      return handleResponse(response);
    } catch (error) {
      handleFetchError(error);
    }
  },

  /**
   * Elimina un producto
   */
  async eliminarProducto(id: number): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/productos/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.detail || `Error ${response.status}`,
          response.status,
          errorData.detail
        );
      }
    } catch (error) {
      handleFetchError(error);
    }
  },

  // ==================== CATEGORÍAS ====================

  /**
   * Obtiene todas las categorías disponibles
   */
  async obtenerCategorias(): Promise<string[]> {
    try {
      const response = await fetch(`${API_URL}/categorias`);
      return handleResponse(response);
    } catch (error) {
      handleFetchError(error);
    }
  },

  /**
   * Obtiene todos los productos de una categoría específica
   */
  async obtenerProductosPorCategoria(categoria: string): Promise<Producto[]> {
    try {
      const response = await fetch(`${API_URL}/categorias/${encodeURIComponent(categoria)}/productos`);
      return handleResponse(response);
    } catch (error) {
      handleFetchError(error);
    }
  },

  // ==================== ESTADÍSTICAS ====================

  /**
   * Obtiene estadísticas generales del sistema
   */
  async obtenerEstadisticas(): Promise<Estadisticas> {
    try {
      const response = await fetch(`${API_URL}/estadisticas`);
      return handleResponse(response);
    } catch (error) {
      handleFetchError(error);
    }
  },

  // ==================== ACTUALIZACIÓN MASIVA ====================

  /**
   * Realiza una actualización masiva de precios
   */
  async actualizacionMasiva(datos: ActualizacionMasiva): Promise<{
    message: string;
    productos_actualizados: number;
  }> {
    try {
      const response = await fetch(`${API_URL}/productos/actualizar-masiva`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datos),
      });
      return handleResponse(response);
    } catch (error) {
      handleFetchError(error);
    }
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
   * Importa productos desde un archivo Excel
   */
  async importarExcel(file: File): Promise<{
    message: string;
    productos_creados: number;
    productos_actualizados: number;
    errores: string[];
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/importar/excel`, {
        method: 'POST',
        body: formData,
      });
      return handleResponse(response);
    } catch (error) {
      handleFetchError(error);
    }
  },

  // ==================== REPORTES ====================

  /**
   * Obtiene datos para reportes de negocio
   */
  async obtenerReportes(): Promise<ReportesData> {
    try {
      const response = await fetch(`${API_URL}/reportes`);
      return handleResponse(response);
    } catch (error) {
      handleFetchError(error);
    }
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
