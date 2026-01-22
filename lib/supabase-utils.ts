/**
 * Supabase Utility Functions
 * Sistema de Gestión de Precios - LA FUGA
 *
 * Helper functions for:
 * - Product history logging
 * - Unit price calculations (per kg/liter)
 * - Discount authorization checks
 */

import { supabase, Producto, HistorialProducto } from './supabase';

const TABLA_HISTORIAL = 'historial_productos';

// ==================== PRODUCT HISTORY ====================

/**
 * Log a change to product history
 * @param id_producto - Product ID
 * @param codigo_sku - Product SKU code
 * @param campo - Field that was modified
 * @param valorAnterior - Previous value
 * @param valorNuevo - New value
 * @param motivo - Optional reason for the change
 */
export async function logProductChange(
  id_producto: string,
  codigo_sku: string,
  campo: string,
  valorAnterior: unknown,
  valorNuevo: unknown,
  motivo?: string,
  usuarioId?: string | null, // UUID of the user
  usuarioNombre?: string | null // Name/Email of the user
): Promise<{ data: HistorialProducto | null; error: Error | null }> {
  try {
    // Append user name to motive if provided, for visibility
    let motivoFinal = motivo || null;
    if (usuarioNombre) {
      motivoFinal = motivoFinal
        ? `${motivoFinal} (por ${usuarioNombre})`
        : `Por ${usuarioNombre}`;
    }

    const { data, error } = await supabase.from(TABLA_HISTORIAL).insert({
      id_producto,
      codigo_sku,
      campo_modificado: campo,
      valor_anterior: valorAnterior !== null && valorAnterior !== undefined ? String(valorAnterior) : null,
      valor_nuevo: valorNuevo !== null && valorNuevo !== undefined ? String(valorNuevo) : null,
      motivo: motivoFinal,
      id_usuario: usuarioId || null,
    }).select().single();

    if (error) {
      console.error('Error logging product change:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as HistorialProducto, error: null };
  } catch (err) {
    console.error('Exception logging product change:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Get product change history
 * @param id_producto - Product ID
 * @param limit - Maximum number of entries to return
 */
export async function getProductHistory(
  id_producto: string,
  limit: number = 50
): Promise<{ data: HistorialProducto[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from(TABLA_HISTORIAL)
      .select('*')
      .eq('id_producto', id_producto)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: (data as HistorialProducto[]) || [], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

// ==================== UNIT PRICE CALCULATIONS ====================

/**
 * Calculate price per kilogram for a product
 * @param precio - Price to calculate from
 * @param pesoNeto - Net weight in kg
 * @returns Price per kg, or null if peso_neto is invalid
 */
export function calcularPrecioPorKg(precio: number, pesoNeto?: number | null): number | null {
  if (!pesoNeto || pesoNeto <= 0) return null;
  return Math.round((precio / pesoNeto) * 100) / 100;
}

/**
 * Calculate price per liter for a product
 * @param precio - Price to calculate from
 * @param volumenNeto - Net volume in liters
 * @returns Price per liter, or null if volumen_neto is invalid
 */
export function calcularPrecioPorLitro(precio: number, volumenNeto?: number | null): number | null {
  if (!volumenNeto || volumenNeto <= 0) return null;
  return Math.round((precio / volumenNeto) * 100) / 100;
}

/**
 * Check if product should show price per kg
 * (MASCOTAS category with peso_neto)
 */
export function deberiaMostrarPrecioPorKg(producto: Producto): boolean {
  return producto.categoria === 'MASCOTAS' && !!producto.peso_neto && producto.peso_neto > 0;
}

/**
 * Check if product should show price per liter
 * (SUELTOS or QUIMICA category with volumen_neto)
 */
export function deberiaMostrarPrecioPorLitro(producto: Producto): boolean {
  const categoriasSueltos = ['SUELTOS', 'QUIMICA', 'SUELTOS - QUIMICA', 'SUELTOS/QUIMICA'];
  return categoriasSueltos.includes(producto.categoria || '') && !!producto.volumen_neto && producto.volumen_neto > 0;
}

/**
 * Get all unit prices for a product
 */
export function calcularPreciosUnitarios(producto: Producto): {
  precio_menor_por_kg: number | null;
  precio_mayor_por_kg: number | null;
  precio_menor_por_litro: number | null;
  precio_mayor_por_litro: number | null;
} {
  return {
    precio_menor_por_kg: producto.peso_neto ? calcularPrecioPorKg(producto.precio_menor, producto.peso_neto) : null,
    precio_mayor_por_kg: producto.peso_neto ? calcularPrecioPorKg(producto.precio_mayor, producto.peso_neto) : null,
    precio_menor_por_litro: producto.volumen_neto ? calcularPrecioPorLitro(producto.precio_menor, producto.volumen_neto) : null,
    precio_mayor_por_litro: producto.volumen_neto ? calcularPrecioPorLitro(producto.precio_mayor, producto.volumen_neto) : null,
  };
}

// ==================== DISCOUNT AUTHORIZATION ====================

/**
 * User roles for discount authorization
 */
export type UserRole = 'vendedor' | 'supervisor' | 'admin' | 'gerente';

/**
 * Get maximum discount percentage allowed for a user role
 * @param rol - User role
 * @returns Maximum discount percentage allowed
 */
export function getNivelAutorizacionDescuento(rol?: UserRole | string): number {
  switch (rol) {
    case 'gerente':
      return 100; // No limit
    case 'admin':
      return 30;
    case 'supervisor':
      return 20;
    case 'vendedor':
    default:
      return 10;
  }
}

/**
 * Check if a discount requires supervisor authorization
 * @param descuentoPorcentaje - Discount percentage
 * @param rolUsuario - User role
 * @returns true if authorization is required
 */
export function requiereAutorizacion(
  descuentoPorcentaje: number,
  rolUsuario?: UserRole | string
): boolean {
  const nivelAutorizado = getNivelAutorizacionDescuento(rolUsuario);
  return descuentoPorcentaje > nivelAutorizado;
}

/**
 * Calculate discount percentage from original and final prices
 */
export function calcularPorcentajeDescuento(precioOriginal: number, precioFinal: number): number {
  if (precioOriginal <= 0) return 0;
  const descuento = precioOriginal - precioFinal;
  return Math.round((descuento / precioOriginal) * 10000) / 100; // 2 decimal places
}

/**
 * Calculate final price from original price and discount percentage
 */
export function calcularPrecioConDescuento(precioOriginal: number, porcentajeDescuento: number): number {
  return Math.round(precioOriginal * (1 - porcentajeDescuento / 100) * 100) / 100;
}

/**
 * Calculate profit margin percentage
 */
export function calcularMargenGanancia(precioVenta: number, costo: number): number {
  if (costo <= 0) return 0;
  return Math.round(((precioVenta - costo) / costo) * 10000) / 100;
}

/**
 * Check if price is below cost
 */
export function esPrecioBajoCosto(precioVenta: number, costo: number): boolean {
  return costo > 0 && precioVenta < costo;
}

// ==================== PRODUCT STATE HELPERS ====================

/**
 * Check if product is active (not deleted or inactive)
 */
export function esProductoActivo(producto: Producto): boolean {
  return !producto.estado || producto.estado === 'activo';
}

/**
 * Check if product can be sold (active and has prices)
 */
export function puedeVenderse(producto: Producto): boolean {
  return esProductoActivo(producto) && (producto.precio_menor > 0 || producto.precio_mayor > 0);
}

/**
 * Get human-readable product state label
 */
export function getEstadoLabel(estado?: string): string {
  switch (estado) {
    case 'activo':
      return 'Activo';
    case 'inactivo':
      return 'Inactivo';
    case 'eliminado':
      return 'Eliminado';
    default:
      return 'Activo';
  }
}

/**
 * Get state badge color
 */
export function getEstadoColor(estado?: string): 'default' | 'secondary' | 'destructive' {
  switch (estado) {
    case 'activo':
      return 'default';
    case 'inactivo':
      return 'secondary';
    case 'eliminado':
      return 'destructive';
    default:
      return 'default';
  }
}

// ==================== FORMATTING HELPERS ====================

/**
 * Format price for display (Argentine locale)
 */
export function formatearPrecio(precio: number): string {
  return precio.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Format weight for display
 */
export function formatearPeso(pesoKg: number): string {
  if (pesoKg >= 1) {
    return `${pesoKg.toLocaleString('es-AR', { maximumFractionDigits: 2 })} kg`;
  } else {
    return `${(pesoKg * 1000).toLocaleString('es-AR', { maximumFractionDigits: 0 })} g`;
  }
}

/**
 * Format volume for display
 */
export function formatearVolumen(volumenLitros: number): string {
  if (volumenLitros >= 1) {
    return `${volumenLitros.toLocaleString('es-AR', { maximumFractionDigits: 2 })} L`;
  } else {
    return `${(volumenLitros * 1000).toLocaleString('es-AR', { maximumFractionDigits: 0 })} ml`;
  }
}
