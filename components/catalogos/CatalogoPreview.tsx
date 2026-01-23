"use client"

import Image from "next/image"
import { Producto, ProductoCatalogo, CamposVisibles } from "@/lib/supabase"
import { CatalogoProductCard } from "./CatalogoProductCard"
import { formatearPrecio } from "@/lib/pdf-utils"

interface CatalogoPreviewProps {
  id?: string;
  titulo: string;
  clienteNombre: string;
  productos: (Producto | ProductoCatalogo)[];
  camposVisibles: CamposVisibles;
  descuentoGlobal: number;
  getDescuentoIndividual?: (productoId: string) => number;
  getPrecioPersonalizado?: (productoId: string) => number | null;
  fechaGeneracion?: Date;
  forPrint?: boolean;
}

export function CatalogoPreview({
  id = "catalogo-preview",
  titulo,
  clienteNombre,
  productos,
  camposVisibles,
  descuentoGlobal,
  getDescuentoIndividual,
  getPrecioPersonalizado,
  fechaGeneracion = new Date(),
  forPrint = false,
}: CatalogoPreviewProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div
      id={id}
      className={`bg-white ${forPrint ? 'p-8' : 'p-6 rounded-lg border'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <div className="flex items-center gap-4">
          <Image
            src="/LogoLaFuga.svg"
            alt="La Fuga"
            width={50}
            height={50}
            className="h-12 w-12"
          />
          <div>
            <h1 className="text-xl font-bold text-gray-900">{titulo}</h1>
            <p className="text-sm text-gray-600">
              Preparado para: <span className="font-medium">{clienteNombre}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">{formatDate(fechaGeneracion)}</p>
          {descuentoGlobal > 0 && (
            <p className="text-sm font-medium text-green-600">
              Descuento especial: {descuentoGlobal}%
            </p>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {productos.length} producto{productos.length !== 1 ? 's' : ''} en este catálogo
          </span>
          <span className="text-gray-600">
            Precios en pesos argentinos (ARS)
          </span>
        </div>
      </div>

      {/* Products Grid */}
      <div className={`grid gap-4 ${forPrint ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
        {productos.map((producto) => {
          const descuentoIndividual = 'descuento_individual' in producto
            ? producto.descuento_individual
            : (getDescuentoIndividual?.(producto.id) ?? 0);

          const precioPersonalizado = 'precio_personalizado' in producto
            ? producto.precio_personalizado
            : (getPrecioPersonalizado?.(producto.id) ?? null);

          return (
            <CatalogoProductCard
              key={producto.id}
              producto={producto}
              camposVisibles={camposVisibles}
              descuentoGlobal={descuentoGlobal}
              descuentoIndividual={descuentoIndividual}
              precioPersonalizado={precioPersonalizado}
              compact={forPrint}
            />
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t text-center text-sm text-gray-500">
        <p className="font-medium text-gray-700">LA FUGA - Ventas por Mayor y Menor</p>
        <p>Los precios pueden variar sin previo aviso</p>
        <p className="mt-2">
          Catálogo válido por 7 días desde {formatDate(fechaGeneracion)}
        </p>
      </div>
    </div>
  );
}
