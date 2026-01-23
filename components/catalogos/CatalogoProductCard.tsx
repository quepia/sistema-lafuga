"use client"

import Image from "next/image"
import { Producto, ProductoCatalogo, CamposVisibles } from "@/lib/supabase"
import { formatearPrecio, calcularPrecioFinal } from "@/lib/pdf-utils"
import { cn } from "@/lib/utils"

interface CatalogoProductCardProps {
  producto: Producto | ProductoCatalogo;
  camposVisibles: CamposVisibles;
  descuentoGlobal?: number;
  descuentoIndividual?: number;
  precioPersonalizado?: number | null;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onToggle?: (id: string) => void;
  compact?: boolean;
}

export function CatalogoProductCard({
  producto,
  camposVisibles,
  descuentoGlobal = 0,
  descuentoIndividual = 0,
  precioPersonalizado = null,
  showCheckbox = false,
  isSelected = false,
  onToggle,
  compact = false,
}: CatalogoProductCardProps) {
  const precioBase = precioPersonalizado ?? producto.precio_mayor;
  const precioFinal = 'precio_final' in producto
    ? producto.precio_final
    : calcularPrecioFinal(precioBase, descuentoGlobal, descuentoIndividual);

  const tieneDescuento = descuentoGlobal > 0 || descuentoIndividual > 0;

  return (
    <div
      className={cn(
        "relative bg-white rounded-lg border transition-all",
        showCheckbox && "cursor-pointer hover:border-blue-400",
        isSelected && "border-blue-500 ring-2 ring-blue-200",
        compact ? "p-2" : "p-4"
      )}
      onClick={() => showCheckbox && onToggle?.(producto.id)}
    >
      {/* Checkbox */}
      {showCheckbox && (
        <div className="absolute top-2 right-2 z-10">
          <div
            className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
              isSelected
                ? "bg-blue-500 border-blue-500"
                : "bg-white border-gray-300"
            )}
          >
            {isSelected && (
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Product Image */}
      {camposVisibles.foto && (
        <div className={cn(
          "relative bg-gray-100 rounded-md overflow-hidden mb-2",
          compact ? "h-20" : "h-32"
        )}>
          {producto.image_url ? (
            <Image
              src={producto.image_url}
              alt={producto.nombre}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <svg
                className={cn(compact ? "w-8 h-8" : "w-12 h-12")}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Product Info */}
      <div className="space-y-1">
        {/* Name */}
        {camposVisibles.nombre && (
          <h3 className={cn(
            "font-medium text-gray-900 line-clamp-2",
            compact ? "text-xs" : "text-sm"
          )}>
            {producto.nombre}
          </h3>
        )}

        {/* Code */}
        {camposVisibles.codigo && (
          <p className="text-xs text-gray-500">
            Cod: {producto.id}
          </p>
        )}

        {/* Unit */}
        {camposVisibles.unidad && producto.unidad && (
          <p className="text-xs text-gray-500">
            {producto.unidad}
          </p>
        )}

        {/* Description */}
        {camposVisibles.descripcion && producto.descripcion && (
          <p className={cn(
            "text-gray-600 line-clamp-2",
            compact ? "text-xs" : "text-xs"
          )}>
            {producto.descripcion}
          </p>
        )}

        {/* Price */}
        {camposVisibles.precio && (
          <div className="pt-1">
            {tieneDescuento && (
              <p className="text-xs text-gray-400 line-through">
                {formatearPrecio(producto.precio_mayor)}
              </p>
            )}
            <p className={cn(
              "font-bold text-blue-600",
              compact ? "text-base" : "text-lg"
            )}>
              {formatearPrecio(precioFinal)}
            </p>
            {tieneDescuento && (
              <span className="inline-block bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded">
                -{descuentoGlobal + descuentoIndividual}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
