"use client"

import Image from "next/image"
import { Producto, ProductoCatalogo, CamposVisibles, CatalogoTipoPrecio } from "@/lib/supabase"
import { formatearPrecio } from "@/lib/pdf-utils"
import {
  calcularPrecioCatalogoFinal,
  obtenerDescripcionTipoPrecio,
  obtenerPrecioBaseCatalogo,
  obtenerTextoAjustePorcentaje,
} from "@/lib/catalogo-utils"
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
  tipoPrecio?: CatalogoTipoPrecio;
  descuentoGlobal: number;
  getDescuentoIndividual?: (productoId: string) => number;
  getPrecioPersonalizado?: (productoId: string) => number | null;
  fechaGeneracion?: Date;
  footerText?: string;
}

export function CatalogoPreview({
  id = "catalogo-preview",
  titulo,
  clienteNombre,
  productos,
  camposVisibles,
  tipoPrecio = "mayor",
  descuentoGlobal,
  getDescuentoIndividual,
  getPrecioPersonalizado,
  fechaGeneracion = new Date(),
  footerText = "Los precios pueden variar sin previo aviso",
}: CatalogoPreviewProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div id={id} className="overflow-hidden rounded-lg bg-white font-sans shadow-xl">
      <header className="relative overflow-hidden bg-[#006AC0] p-6 text-white md:p-8">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, #FF1F8F 10px, #FF1F8F 20px)"
          }}
        />
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#FF1F8F] opacity-20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-[#6CBEFA] opacity-30 blur-2xl" />

        <div className="relative z-10 flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex flex-col items-center gap-4 md:items-start">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-[#006AC0] shadow-lg">
                  <Image src="/LogoLaFuga.svg" alt="LF" width={40} height={40} />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">LA FUGA</h1>
                <p className="text-sm font-medium text-[#6CBEFA]">Villa Carlos Paz</p>
              </div>
            </div>
            <div>
              <h2 className="mt-2 text-center text-3xl font-bold leading-tight md:text-left">
                {titulo}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge className="border-none bg-white/15 text-white hover:bg-white/15">
                  {obtenerDescripcionTipoPrecio(tipoPrecio)}
                </Badge>
                {descuentoGlobal !== 0 && (
                  <Badge className="border-none bg-[#FF1F8F] text-white hover:bg-[#FF1F8F]">
                    {obtenerTextoAjustePorcentaje(descuentoGlobal)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="min-w-[280px] rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
            <p className="mb-1 text-sm text-white/70">Preparado para</p>
            <p className="mb-4 text-xl font-semibold text-white">{clienteNombre}</p>

            <div className="flex items-center gap-4 text-sm text-white/80">
              <div>
                <p className="text-xs text-white/60">Productos</p>
                <p className="text-2xl font-bold text-[#FF1F8F]">{productos.length}</p>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div>
                <p className="text-xs text-white/60">Fecha</p>
                <p className="font-medium">{formatDate(fechaGeneracion)}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-gray-50/50 p-6 md:p-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {productos.map((producto) => {
            const descuentoIndividual = "descuento_individual" in producto
              ? producto.descuento_individual
              : (getDescuentoIndividual?.(producto.id) ?? 0);

            const precioPersonalizado = "precio_personalizado" in producto
              ? producto.precio_personalizado
              : (getPrecioPersonalizado?.(producto.id) ?? null);

            const precioBase = obtenerPrecioBaseCatalogo(producto, tipoPrecio);
            const precioFinal = "precio_final" in producto
              ? producto.precio_final
              : calcularPrecioCatalogoFinal({
                producto,
                tipoPrecio,
                descuentoGlobal,
                descuentoIndividual,
                precioPersonalizado,
              });

            const ajusteTotal = descuentoGlobal + descuentoIndividual;
            const tieneAjuste = precioPersonalizado !== null || ajusteTotal !== 0;
            const ajusteEsDescuento = ajusteTotal > 0;

            const stockActual = (producto as ProductoConStock).stock_actual;
            const estaAgotado = stockActual === 0;
            const esUltimasUnidades = stockActual !== undefined && stockActual > 0 && stockActual <= 5;

            return (
              <Card key={producto.id} className="group relative overflow-hidden border-0 bg-white shadow-sm transition-all duration-300 hover:shadow-xl">
                {precioPersonalizado !== null ? (
                  <Badge className="absolute right-2 top-2 z-20 bg-amber-500 text-white hover:bg-amber-500">
                    Precio manual
                  </Badge>
                ) : tieneAjuste ? (
                  <Badge
                    className={`absolute right-2 top-2 z-20 text-white ${ajusteEsDescuento ? "bg-[#FF1F8F] hover:bg-[#FE439E]" : "bg-orange-500 hover:bg-orange-500"}`}
                  >
                    {obtenerTextoAjustePorcentaje(ajusteTotal)}
                  </Badge>
                ) : null}

                {estaAgotado && (
                  <Badge variant="destructive" className="absolute left-2 top-2 z-20 font-bold">
                    Agotado
                  </Badge>
                )}
                {esUltimasUnidades && (
                  <Badge className="absolute left-2 top-2 z-20 bg-orange-500 font-bold text-white hover:bg-orange-600">
                    Ultimas unidades
                  </Badge>
                )}

                <CardContent className="p-0">
                  {camposVisibles.foto && (
                    <div className="relative aspect-square overflow-hidden bg-[#F8F9FA] p-4">
                      {producto.image_url ? (
                        <Image
                          src={producto.image_url}
                          alt={producto.nombre}
                          fill
                          className="object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-300">
                          <span className="text-4xl">📦</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 p-4">
                    {camposVisibles.nombre && (
                      <h3
                        className="min-h-[2.5rem] text-sm font-semibold leading-tight text-[#333333] line-clamp-2"
                        title={producto.nombre}
                      >
                        {producto.nombre}
                      </h3>
                    )}

                    {camposVisibles.descripcion && producto.descripcion && (
                      <p className="text-xs text-[#333333]/60 line-clamp-2">
                        {producto.descripcion}
                      </p>
                    )}

                    {camposVisibles.codigo && (
                      <p className="font-mono text-[10px] text-gray-400">
                        Cod: {producto.id}
                      </p>
                    )}

                    {camposVisibles.precio && (
                      <div className="flex items-end justify-between border-t border-[#E5E5E5] pt-2">
                        <div>
                          {tieneAjuste && (
                            <p className="text-xs text-[#333333]/50 line-through">
                              {formatearPrecio(precioBase)}
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

                <div className="absolute bottom-0 left-0 right-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#006AC0] to-[#FF1F8F] transition-transform duration-300 group-hover:scale-x-100" />
              </Card>
            );
          })}
        </div>
      </div>

      <div className="border-t bg-white p-6 text-center text-sm text-gray-500">
        <p>{footerText}</p>
      </div>
    </div>
  );
}
