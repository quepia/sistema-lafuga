"use client"

import { useState, useEffect } from "react"
import { Percent, TrendingUp, TrendingDown, AlertTriangle, Loader2, Check, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useCategorias } from "@/hooks/use-categorias"
import { useActualizacionMasiva } from "@/hooks/use-actualizacion-masiva"
import { Producto } from "@/lib/api"
import { toast } from "sonner"

export default function MassUpdateView() {
  const [percentage, setPercentage] = useState("")
  const [priceType, setPriceType] = useState<"menor" | "mayor" | "ambos">("menor")
  const [category, setCategory] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const { categorias, loading: loadingCategorias } = useCategorias()
  const {
    loading,
    error,
    resultado,
    preview,
    previewLoading,
    obtenerPreview,
    actualizarPorCategoria,
    reset,
  } = useActualizacionMasiva()

  // Cargar preview cuando cambia la categoría
  useEffect(() => {
    if (category) {
      obtenerPreview(category)
    }
  }, [category, obtenerPreview])

  const calculateNewPrice = (oldPrice: number, type: "menor" | "mayor") => {
    if (!percentage) return oldPrice
    if (priceType !== "ambos" && priceType !== type) return oldPrice
    const percent = parseFloat(percentage)
    return Math.round(oldPrice * (1 + percent / 100))
  }

  const handlePreview = () => {
    if (!percentage || !category) {
      toast.error("Selecciona una categoría y un porcentaje")
      return
    }
    setShowPreview(true)
  }

  const handleApply = () => {
    if (!percentage || !category) {
      toast.error("Selecciona una categoría y un porcentaje")
      return
    }
    setShowConfirmDialog(true)
  }

  const confirmUpdate = async () => {
    setShowConfirmDialog(false)
    const percent = parseFloat(percentage)

    const success = await actualizarPorCategoria(category, percent, priceType)

    if (success) {
      toast.success(`Se actualizaron los precios correctamente`)
      setShowPreview(false)
      setPercentage("")
      // Recargar preview para ver precios actualizados
      obtenerPreview(category)
    } else {
      toast.error(error || "Error al actualizar precios")
    }
  }

  const handleReset = () => {
    setPercentage("")
    setPriceType("menor")
    setCategory("")
    setShowPreview(false)
    reset()
  }

  // Limitar preview a los primeros 10 productos
  const previewProducts = preview.slice(0, 10)
  const totalInCategory = preview.length

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
      {/* Configuration Card */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Actualización Masiva de Precios</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Selecciona la categoría y el porcentaje de ajuste
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
          {/* Category Selector */}
          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Select value={category} onValueChange={setCategory} disabled={loadingCategorias}>
              <SelectTrigger id="category">
                <SelectValue placeholder={loadingCategorias ? "Cargando..." : "Seleccionar categoría"} />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {category && !previewLoading && (
              <p className="text-xs text-muted-foreground">
                {totalInCategory} productos en esta categoría
              </p>
            )}
          </div>

          {/* Percentage Input */}
          <div className="space-y-2">
            <Label htmlFor="percentage">Porcentaje de Ajuste</Label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="percentage"
                type="number"
                placeholder="Ej: 10 para +10% o -5 para -5%"
                className="pl-10"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Usa valores positivos para aumentar (+10) o negativos para disminuir (-5)
            </p>
          </div>

          {/* Price Type Radio */}
          <div className="space-y-3">
            <Label>Tipo de Precio a Actualizar</Label>
            <RadioGroup value={priceType} onValueChange={(v) => setPriceType(v as typeof priceType)}>
              <div className="flex items-center space-x-2 rounded-lg border border-[#006AC0] bg-[#006AC0]/5 p-4">
                <RadioGroupItem value="menor" id="menor" />
                <Label htmlFor="menor" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#006AC0]" />
                    <span className="font-semibold text-[#006AC0]">Precio Menor</span>
                    <span className="text-sm text-muted-foreground">(Minorista)</span>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border border-[#FF1F8F] bg-[#FF1F8F]/5 p-4">
                <RadioGroupItem value="mayor" id="mayor" />
                <Label htmlFor="mayor" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#FF1F8F]" />
                    <span className="font-semibold text-[#FF1F8F]">Precio Mayor</span>
                    <span className="text-sm text-muted-foreground">(Mayorista)</span>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border border-purple-500 bg-purple-500/5 p-4">
                <RadioGroupItem value="ambos" id="ambos" />
                <Label htmlFor="ambos" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-gradient-to-r from-[#006AC0] to-[#FF1F8F]" />
                    <span className="font-semibold text-purple-600">Ambos Precios</span>
                    <span className="text-sm text-muted-foreground">(Minorista y Mayorista)</span>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={handleReset}>
              Limpiar
            </Button>
            <Button
              className="flex-1 bg-[#006AC0] hover:bg-[#005a9e] text-white"
              onClick={handlePreview}
              disabled={!category || !percentage || previewLoading}
            >
              {previewLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cargando...
                </>
              ) : (
                "Vista Previa"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result Alert */}
      {resultado && (
        <Alert className="border-green-500 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-700">Actualización Exitosa</AlertTitle>
          <AlertDescription className="text-green-600">
            {resultado.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Preview Table */}
      {showPreview && percentage && category && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              Vista Previa
              {parseFloat(percentage) > 0 ? (
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
              )}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              <span className="block sm:inline">{category}</span>
              <span className="hidden sm:inline"> | </span>
              <span className="block sm:inline">Ajuste: {percentage}%</span>
              <br />
              <span className="text-amber-600">
                {totalInCategory} productos
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {previewLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 sm:h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[70px] sm:min-w-[100px] text-xs sm:text-sm">SKU</TableHead>
                        <TableHead className="min-w-[120px] sm:min-w-[200px] text-xs sm:text-sm">Producto</TableHead>
                        {(priceType === "menor" || priceType === "ambos") && (
                          <>
                            <TableHead className="text-right min-w-[70px] sm:min-w-[100px] text-xs sm:text-sm">Actual</TableHead>
                            <TableHead className="text-right min-w-[70px] sm:min-w-[100px] text-xs sm:text-sm">Nuevo</TableHead>
                          </>
                        )}
                        {(priceType === "mayor" || priceType === "ambos") && (
                          <>
                            <TableHead className="text-right min-w-[70px] sm:min-w-[100px] text-xs sm:text-sm">Actual</TableHead>
                            <TableHead className="text-right min-w-[70px] sm:min-w-[100px] text-xs sm:text-sm">Nuevo</TableHead>
                          </>
                        )}
                        <TableHead className="text-right min-w-[60px] sm:min-w-[80px] text-xs sm:text-sm">Dif.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewProducts.map((item) => {
                        const newPrecioMenor = calculateNewPrice(item.precio_menor, "menor")
                        const newPrecioMayor = calculateNewPrice(item.precio_mayor, "mayor")
                        const diffMenor = newPrecioMenor - item.precio_menor
                        const diffMayor = newPrecioMayor - item.precio_mayor
                        const totalDiff = diffMenor + diffMayor

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-[10px] sm:text-sm p-2 sm:p-4">{item.codigo}</TableCell>
                            <TableCell className="font-medium max-w-[100px] sm:max-w-[200px] truncate text-xs sm:text-sm p-2 sm:p-4">
                              {item.producto}
                            </TableCell>
                            {(priceType === "menor" || priceType === "ambos") && (
                              <>
                                <TableCell className="text-right text-xs sm:text-sm p-2 sm:p-4">
                                  ${item.precio_menor.toLocaleString("es-AR")}
                                </TableCell>
                                <TableCell className="text-right font-bold text-[#006AC0] text-xs sm:text-sm p-2 sm:p-4">
                                  ${newPrecioMenor.toLocaleString("es-AR")}
                                </TableCell>
                              </>
                            )}
                            {(priceType === "mayor" || priceType === "ambos") && (
                              <>
                                <TableCell className="text-right text-xs sm:text-sm p-2 sm:p-4">
                                  ${item.precio_mayor.toLocaleString("es-AR")}
                                </TableCell>
                                <TableCell className="text-right font-bold text-[#FF1F8F] text-xs sm:text-sm p-2 sm:p-4">
                                  ${newPrecioMayor.toLocaleString("es-AR")}
                                </TableCell>
                              </>
                            )}
                            <TableCell
                              className={`text-right font-semibold text-xs sm:text-sm p-2 sm:p-4 ${
                                totalDiff > 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {totalDiff > 0 ? "+" : ""}${totalDiff.toLocaleString("es-AR")}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {totalInCategory > 10 && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4 text-center">
                    ... y {totalInCategory - 10} productos más
                  </p>
                )}

                {/* Apply Button */}
                <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                  <Button variant="ghost" onClick={() => setShowPreview(false)} className="text-sm">
                    Editar
                  </Button>
                  <Button
                    className="bg-[#FF1F8F] hover:bg-[#e01b7f] text-white text-sm"
                    onClick={handleApply}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Aplicando...
                      </>
                    ) : (
                      `Aplicar (${totalInCategory})`
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar Actualización Masiva
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Estás a punto de actualizar los precios de <strong>{totalInCategory} productos</strong> en la categoría <strong>{category}</strong>.</p>
              <p>
                Se aplicará un ajuste de <strong>{percentage}%</strong> al{" "}
                <strong>
                  {priceType === "menor" ? "precio menor" : priceType === "mayor" ? "precio mayor" : "precio menor y mayor"}
                </strong>.
              </p>
              <p className="text-amber-600 font-medium">Esta acción no se puede deshacer.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUpdate}
              className="bg-[#FF1F8F] hover:bg-[#e01b7f]"
            >
              Confirmar Actualización
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
