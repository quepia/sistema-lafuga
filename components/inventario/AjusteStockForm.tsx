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
  motivo: z.string().min(5, "El motivo debe tener al menos 5 caracteres"),
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
    setBuscandoProducto(true)
    setProducto(null)
    try {
      // Intentar buscar por código exacto (ID) o código de barras
      let prod = await api.obtenerProducto(busqueda).catch(() => null)
      if (!prod) {
        prod = await api.obtenerProductoPorCodigoBarras(busqueda).catch(() => null)
      }
      
      if (prod) {
        setProducto(prod)
        form.setValue("cantidad_real", (prod as any).stock_actual ?? 0)
        toast({
          title: "Producto encontrado",
          description: prod.nombre,
        })
      } else {
        toast({
          variant: "destructive",
          title: "No encontrado",
          description: "No se encontró ningún producto con ese código.",
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
        motivo: values.motivo,
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
            Buscar Producto (ID o Código de Barras)
          </label>
          <div className="flex gap-2 mt-2">
            <Input 
              value={busqueda} 
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Ingrese código..."
              onKeyDown={(e) => e.key === 'Enter' && buscarProducto()}
              disabled={loading}
            />
            <Button type="button" onClick={buscarProducto} disabled={buscandoProducto || loading}>
              {buscandoProducto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

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
                <FormLabel>Motivo (Obligatorio)</FormLabel>
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
