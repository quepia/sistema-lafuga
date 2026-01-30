"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { api, TipoAjuste, Producto } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Search, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const formSchema = z.object({
  tipo_ajuste: z.enum(['AJUSTE_MANUAL', 'MERMA', 'ROTURA', 'VENCIMIENTO', 'CONSUMO_INTERNO'] as const, {
    required_error: "Seleccione un tipo de ajuste",
  }),
  cantidad_real: z.coerce.number().min(0, "La cantidad no puede ser negativa"),
  motivo: z.string().optional(),
})

interface AjusteStockFormProps {
  onSuccess?: () => void
}

export function AjusteStockForm({ onSuccess }: AjusteStockFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [producto, setProducto] = useState<Producto | null>(null)
  const [buscandoProducto, setBuscandoProducto] = useState(false)
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Producto[]>([])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cantidad_real: 0,
      motivo: "",
      tipo_ajuste: "AJUSTE_MANUAL",
    },
  })

  // Watch cantidad_real to calculate difference
  const cantidadReal = form.watch("cantidad_real")
  const stockActual = (producto as any)?.stock_actual ?? 0
  const diferencia = producto ? cantidadReal - stockActual : 0

  const buscarProducto = async () => {
    if (!busqueda) return

    console.log("Iniciando búsqueda de producto con término:", busqueda)
    setBuscandoProducto(true)
    setProducto(null)
    setResultadosBusqueda([])

    try {
      // Usar el buscador general que ya busca por nombre, id y código de barras
      const respuesta = await api.listarProductos({
        query: busqueda,
        limit: 10 // Traemos algunos resultados para desambiguar si es necesario
      })

      const encontrados = respuesta.productos || []
      console.log("Resultados encontrados:", encontrados.length, encontrados)

      if (encontrados.length === 0) {
        toast({
          variant: "destructive",
          title: "No encontrado",
          description: "No se encontró ningún producto con ese criterio.",
        })
      } else if (encontrados.length === 1) {
        // Coincidencia exacta o única
        const prod = encontrados[0]
        seleccionarProducto(prod)
      } else {
        // Múltiples resultados, dejar que el usuario seleccione
        setResultadosBusqueda(encontrados)
        toast({
          title: "Múltiples coincidencias",
          description: "Seleccione el producto correcto de la lista.",
        })
      }
    } catch (error) {
      console.error(error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al buscar el producto.",
      })
    } finally {
      setBuscandoProducto(false)
    }
  }

  const seleccionarProducto = (prod: Producto) => {
    setProducto(prod)
    setResultadosBusqueda([])
    form.setValue("cantidad_real", prod.stock_actual ?? 0)
    setBusqueda(prod.nombre) // Actualizar input con nombre completo para feedback visual
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!producto) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debe seleccionar un producto primero.",
      })
      return
    }

    setLoading(true)
    try {
      await api.ajustarStock({
        producto_id: producto.id,
        cantidad_real: values.cantidad_real,
        tipo_ajuste: values.tipo_ajuste,
        motivo: values.motivo || "",
      })

      toast({
        title: "Stock ajustado",
        description: `El stock se actualizó correctamente a ${values.cantidad_real}`,
      })

      form.reset({
        cantidad_real: 0,
        motivo: "",
        tipo_ajuste: "AJUSTE_MANUAL",
      })
      setProducto(null)
      setBusqueda("")

      if (onSuccess) onSuccess()

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al ajustar",
        description: error.message || "Ocurrió un error inesperado.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Buscador de Producto */}
      <div className="flex gap-2 items-end">
        <div className="w-full">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Buscar Producto (Nombre, ID o Código de Barras)
          </label>
          <div className="flex gap-2 mt-2">
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Ingrese código..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  buscarProducto()
                }
              }}
              disabled={loading}
            />
            <Button type="button" onClick={buscarProducto} disabled={buscandoProducto || loading}>
              {buscandoProducto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de resultados ambiguos */}
      {resultadosBusqueda.length > 0 && !producto && (
        <Card className="bg-white border-muted animate-in fade-in zoom-in-95 duration-200">
          <CardContent className="p-2">
            <p className="text-xs text-muted-foreground mb-2 px-2">Seleccione un producto:</p>
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              {resultadosBusqueda.map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => seleccionarProducto(prod)}
                  className="flex items-center justify-between p-2 hover:bg-muted rounded-md text-left transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{prod.nombre}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{prod.id}</span>
                      {prod.codigo_barra && <span>CB: {prod.codigo_barra}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                      Stock: {prod.stock_actual ?? 0}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {producto && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Producto</p>
                <p className="font-bold text-lg">{producto.nombre}</p>
                <p className="text-xs text-muted-foreground">{producto.id}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Stock Actual</p>
                <p className="font-bold text-2xl">{stockActual}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="cantidad_real"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock Real (Conteo físico)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} disabled={!producto || loading} />
                  </FormControl>
                  {producto && (
                    <FormDescription className={diferencia !== 0 ? (diferencia > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium") : ""}>
                      Diferencia: {diferencia > 0 ? "+" : ""}{diferencia}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipo_ajuste"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Ajuste</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!producto || loading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="AJUSTE_MANUAL">Corrección de Conteo</SelectItem>
                      <SelectItem value="MERMA">Merma (Dañado/Perdido)</SelectItem>
                      <SelectItem value="ROTURA">Rotura</SelectItem>
                      <SelectItem value="VENCIMIENTO">Vencimiento</SelectItem>
                      <SelectItem value="CONSUMO_INTERNO">Consumo Interno</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="motivo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo (Opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Explique la razón del ajuste..."
                    className="resize-none"
                    {...field}
                    disabled={!producto || loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={!producto || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Ajuste
          </Button>
        </form>
      </Form>
    </div>
  )
}
