"use client"

import Image from "next/image"
import { Producto, ProductoCatalogo, CamposVisibles } from "@/lib/supabase"
import { formatearPrecio, calcularPrecioFinal } from "@/lib/pdf-utils"
import { ShoppingCart, Star, Phone, Instagram, MapPin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ProductoConStock extends Producto {
  stock_actual?: number;
}

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
}: CatalogoPreviewProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div id={id} className="bg-white rounded-lg shadow-xl overflow-hidden font-sans">
      {/* Header Vibrant - Replicating catalog-header.tsx */}
      <header className="relative overflow-hidden bg-[#006AC0] text-white p-6 md:p-8">
        {/* Background Patterns */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, #FF1F8F 10px, #FF1F8F 20px)`
          }}
        />
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#FF1F8F] rounded-full opacity-20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-[#6CBEFA] rounded-full opacity-30 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg text-[#006AC0] font-bold text-2xl">
                  {/* Logo here ideally */}
                  <Image src="/LogoLaFuga.svg" alt="LF" width={40} height={40} />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">LA FUGA</h1>
                <p className="text-[#6CBEFA] text-sm font-medium">Villa Carlos Paz</p>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold leading-tight mt-2 text-center md:text-left">
                {titulo}
              </h2>
              {descuentoGlobal > 0 && (
                <Badge className="mt-2 bg-[#FF1F8F] hover:bg-[#FF1F8F] text-white border-none text-md px-3 py-1">
                  Descuento Global: {descuentoGlobal}%
                </Badge>
              )}
            </div>
          </div>

          {/* Client Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 min-w-[280px]">
            <p className="text-white/70 text-sm mb-1">Preparado para</p>
            <p className="text-white text-xl font-semibold mb-4">{clienteNombre}</p>

            <div className="flex items-center gap-4 text-white/80 text-sm">
              <div>
                <p className="text-white/60 text-xs">Productos</p>
                <p className="text-2xl font-bold text-[#FF1F8F]">{productos.length}</p>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div>
                <p className="text-white/60 text-xs">Fecha</p>
                <p className="font-medium">{formatDate(fechaGeneracion)}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Grid Content */}
      <div className="p-6 md:p-8 bg-gray-50/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {productos.map((producto) => {
            const descuentoIndividual = 'descuento_individual' in producto
              ? producto.descuento_individual
              : (getDescuentoIndividual?.(producto.id) ?? 0);

            const precioPersonalizado = 'precio_personalizado' in producto
              ? producto.precio_personalizado
              : (getPrecioPersonalizado?.(producto.id) ?? null);

            const precioBase = precioPersonalizado ?? producto.precio_mayor;
            const precioFinal = 'precio_final' in producto
              ? producto.precio_final
              : calcularPrecioFinal(precioBase, descuentoGlobal, descuentoIndividual);

            const tieneDescuento = descuentoGlobal > 0 || descuentoIndividual > 0;
            const totalDescuento = descuentoGlobal + descuentoIndividual;

            // Stock status
            const stockActual = (producto as ProductoConStock).stock_actual;
            const estaAgotado = stockActual === 0;
            const esUltimasUnidades = stockActual !== undefined && stockActual > 0 && stockActual <= 5;

            return (
              <Card key={producto.id} className="group relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 bg-white">
                {/* Discount Ribbon */}
                {tieneDescuento && (
                  <Badge className="absolute top-2 right-2 z-20 bg-[#FF1F8F] hover:bg-[#FE439E] text-white font-bold">
                    -{totalDescuento}%
                  </Badge>
                )}

                {/* Stock Badges */}
                {estaAgotado && (
                  <Badge variant="destructive" className="absolute top-2 left-2 z-20 font-bold">
                    Agotado
                  </Badge>
                )}
                {esUltimasUnidades && (
                  <Badge className="absolute top-2 left-2 z-20 bg-orange-500 hover:bg-orange-600 text-white font-bold">
                    Últimas unidades
                  </Badge>
                )}

                <CardContent className="p-0">
                  {/* Image */}
                  {camposVisibles.foto && (
                    <div className="relative aspect-square bg-[#F8F9FA] overflow-hidden p-4">
                      {producto.image_url ? (
                        <Image
                          src={producto.image_url}
                          alt={producto.nombre}
                          fill
                          className="object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <span className="text-4xl">📦</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    {camposVisibles.nombre && (
                      <h3 className="font-semibold text-[#333333] text-sm leading-tight line-clamp-2 min-h-[2.5rem]" title={producto.nombre}>
                        {producto.nombre}
                      </h3>
                    )}

                    {camposVisibles.descripcion && producto.descripcion && (
                      <p className="text-xs text-[#333333]/60 line-clamp-2">
                        {producto.descripcion}
                      </p>
                    )}

                    {camposVisibles.codigo && (
                      <p className="text-[10px] text-gray-400 font-mono">
                        Cod: {producto.id}
                      </p>
                    )}

                    {camposVisibles.precio && (
                      <div className="pt-2 border-t border-[#E5E5E5] flex items-end justify-between">
                        <div>
                          {tieneDescuento && (
                            <p className="text-xs text-[#333333]/50 line-through">
                              {formatearPrecio(producto.precio_mayor)}
                            </p>
                          )}
                          <p className="text-lg font-bold text-[#006AC0]">
                            {formatearPrecio(precioFinal)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#006AC0] to-[#FF1F8F] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </Card>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t p-6 text-center text-sm text-gray-500">
        <p>Los precios pueden variar sin previo aviso • Catálogo válido por 7 días</p>
      </div>
    </div>
  )
}
