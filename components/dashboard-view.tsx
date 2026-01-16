"use client"

import { Package, AlertCircle, Tag, Layers, RefreshCw, ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import CsvUploader from "@/components/CsvUploader"
import { useEstadisticas } from "@/hooks/use-estadisticas"

export default function DashboardView() {
  const { estadisticas, loading, error, refetch } = useEstadisticas()

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error de conexión</AlertTitle>
          <AlertDescription>
            {error}
            <br />
            <span className="text-sm mt-2 block">
              Asegúrate de que el servidor backend esté corriendo correctamente
            </span>
          </AlertDescription>
        </Alert>
        <Button onClick={refetch} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Reintentar conexión
        </Button>
      </div>
    )
  }

  const cantidadCategorias = estadisticas
    ? Object.keys(estadisticas.productos_por_categoria).length
    : 0

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-[#006AC0] to-[#FF1F8F] p-4 sm:p-8 text-white">
        <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">Hola, Usuario</h1>
        <p className="text-sm sm:text-base text-white/90">Bienvenido al Sistema de Gestión de Precios LA FUGA</p>
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-10">
          <div className="h-full w-full bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/4"></div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-3 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-[#006AC0]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Productos</CardTitle>
            <Package className="h-5 w-5 text-[#006AC0]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <>
                <div className="text-3xl font-bold text-brand-dark">
                  {estadisticas?.total_productos.toLocaleString() || "0"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Productos en el sistema</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#FF1F8F]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sin Precio</CardTitle>
            <AlertCircle className="h-5 w-5 text-[#FF1F8F]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold text-[#FF1F8F]">
                  {estadisticas?.productos_sin_precio || "0"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Requieren atención</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#6CBEFA]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sin Código Barra</CardTitle>
            <Tag className="h-5 w-5 text-[#6CBEFA]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold text-brand-dark">
                  {estadisticas?.productos_sin_codigo_barra || "0"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Sin código de barras</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#006AC0]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categorías</CardTitle>
            <Layers className="h-5 w-5 text-[#006AC0]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-12" />
            ) : (
              <>
                <div className="text-3xl font-bold text-brand-dark">{cantidadCategorias}</div>
                <p className="text-xs text-muted-foreground mt-1">Categorías activas</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Precios Promedio */}
      <div className="grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-sm sm:text-lg">Precio Promedio Menor (Minorista)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 sm:h-12 w-24 sm:w-32" />
            ) : (
              <div className="text-2xl sm:text-4xl font-bold text-[#006AC0]">
                ${estadisticas?.promedio_precio_menor.toLocaleString("es-AR", { maximumFractionDigits: 0 }) || "0"}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-sm sm:text-lg">Precio Promedio Mayor (Mayorista)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 sm:h-12 w-24 sm:w-32" />
            ) : (
              <div className="text-2xl sm:text-4xl font-bold text-[#FF1F8F]">
                ${estadisticas?.promedio_precio_mayor.toLocaleString("es-AR", { maximumFractionDigits: 0 }) || "0"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CSV Uploader Section */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm sm:text-lg">Importar Productos desde CSV</CardTitle>
                <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <CsvUploader />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Productos por Categoría */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Productos por Categoría</CardTitle>
          <Button variant="ghost" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {estadisticas &&
                Object.entries(estadisticas.productos_por_categoria)
                  .sort(([, a], [, b]) => b - a)
                  .map(([categoria, cantidad]) => {
                    const porcentaje =
                      estadisticas.total_productos > 0
                        ? (cantidad / estadisticas.total_productos) * 100
                        : 0
                    return (
                      <div key={categoria} className="space-y-1">
                        <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                          <span className="font-medium truncate">{categoria}</span>
                          <span className="text-muted-foreground whitespace-nowrap">
                            {cantidad.toLocaleString()} <span className="hidden sm:inline">productos</span> ({porcentaje.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#006AC0] to-[#FF1F8F] transition-all duration-500"
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diagonal Brand Element */}
      <div className="relative h-20 sm:h-32 overflow-hidden rounded-lg">
        <div className="absolute inset-0 flex">
          <div className="w-1/2 bg-[#006AC0] flex items-center justify-center text-white font-bold text-lg sm:text-2xl">MENOR</div>
          <div className="w-1/2 bg-[#FF1F8F] flex items-center justify-center text-white font-bold text-lg sm:text-2xl">MAYOR</div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12"></div>
      </div>
    </div>
  )
}
