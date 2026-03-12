import { Catalogo, Producto, ProductoCatalogo, CatalogoTipoPrecio } from "@/lib/supabase";
import { calcularPrecioFinal } from "@/lib/pdf-utils";

interface CalcularPrecioCatalogoOptions {
  producto: Pick<Producto, "precio_mayor" | "precio_menor">;
  tipoPrecio: CatalogoTipoPrecio;
  descuentoGlobal?: number;
  descuentoIndividual?: number;
  precioPersonalizado?: number | null;
}

export function obtenerPrecioBaseCatalogo(
  producto: Pick<Producto, "precio_mayor" | "precio_menor">,
  tipoPrecio: CatalogoTipoPrecio
): number {
  return tipoPrecio === "menor" ? producto.precio_menor : producto.precio_mayor;
}

export function calcularPrecioCatalogoFinal({
  producto,
  tipoPrecio,
  descuentoGlobal = 0,
  descuentoIndividual = 0,
  precioPersonalizado = null,
}: CalcularPrecioCatalogoOptions): number {
  if (precioPersonalizado !== null) {
    return precioPersonalizado;
  }

  return calcularPrecioFinal(
    obtenerPrecioBaseCatalogo(producto, tipoPrecio),
    descuentoGlobal,
    descuentoIndividual
  );
}

export function obtenerEtiquetaTipoPrecio(tipoPrecio: CatalogoTipoPrecio): string {
  return tipoPrecio === "menor" ? "Minorista" : "Mayorista";
}

export function obtenerDescripcionTipoPrecio(tipoPrecio: CatalogoTipoPrecio): string {
  return tipoPrecio === "menor" ? "Lista minorista" : "Lista mayorista";
}

export function ordenarProductosSegunIds<T extends { id: string }>(productos: T[], ids: string[]): T[] {
  const productosMap = new Map(productos.map((producto) => [producto.id, producto]));

  return ids
    .map((id) => productosMap.get(id))
    .filter((producto): producto is T => producto !== undefined);
}

export function expandirProductosCatalogo(
  catalogo: Pick<Catalogo, "productos" | "tipo_precio" | "descuento_global">,
  productos: Producto[]
): ProductoCatalogo[] {
  const productosOrdenados = ordenarProductosSegunIds(
    productos,
    catalogo.productos.map((producto) => producto.producto_id)
  );

  const productosMap = new Map(productosOrdenados.map((producto) => [producto.id, producto]));

  return catalogo.productos
    .map((configuracionProducto) => {
      const producto = productosMap.get(configuracionProducto.producto_id);
      if (!producto) {
        return null;
      }

      return {
        ...producto,
        descuento_individual: configuracionProducto.descuento_individual,
        precio_personalizado: configuracionProducto.precio_personalizado,
        precio_final: calcularPrecioCatalogoFinal({
          producto,
          tipoPrecio: catalogo.tipo_precio || "mayor",
          descuentoGlobal: catalogo.descuento_global,
          descuentoIndividual: configuracionProducto.descuento_individual,
          precioPersonalizado: configuracionProducto.precio_personalizado,
        }),
      } as ProductoCatalogo;
    })
    .filter((producto): producto is ProductoCatalogo => producto !== null);
}

export function productoCatalogoEstaDisponible(
  producto: Pick<Producto, "stock_actual" | "estado">
): boolean {
  if (producto.estado === "eliminado") {
    return false;
  }

  return producto.stock_actual === undefined || producto.stock_actual === null || producto.stock_actual > 0;
}

export function filtrarProductosCatalogoDisponibles<T extends Pick<Producto, "stock_actual" | "estado">>(
  productos: T[]
): T[] {
  return productos.filter(productoCatalogoEstaDisponible);
}

export function formatearDiasValidez(dias: number): string {
  return `${dias} día${dias === 1 ? "" : "s"}`;
}

export function formatearFechaCatalogo(dateString: string): string {
  return new Date(dateString).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function obtenerTextoVigenciaDesdeDias(dias: number): string {
  return `Link válido por ${formatearDiasValidez(dias)} desde su generación`;
}

export function obtenerTextoVigenciaHastaFecha(expiresAt: string): string {
  return `Válido hasta ${formatearFechaCatalogo(expiresAt)}`;
}

export function obtenerTextoAjustePorcentaje(valor: number): string {
  if (valor === 0) {
    return "0%";
  }

  return valor > 0 ? `-${valor}%` : `+${Math.abs(valor)}%`;
}

export function obtenerTextoAjuste(valor: number): string {
  if (valor === 0) {
    return "Sin ajuste";
  }

  return valor > 0 ? `Descuento ${valor}%` : `Recargo ${Math.abs(valor)}%`;
}
