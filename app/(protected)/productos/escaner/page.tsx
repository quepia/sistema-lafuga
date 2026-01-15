"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Search, Barcode, Camera, Check, X, Keyboard, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api"

interface Producto {
  id: number
  codigo: string
  producto: string
  categoria: string
  precio_menor: number
  precio_mayor: number
  codigo_barra: string | null
  unidad: string | null
}

export default function EscanerPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [productosSinCodigo, setProductosSinCodigo] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [codigoInput, setCodigoInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"sin-codigo" | "todos">("sin-codigo")
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const { toast } = useToast()

  // Cargar productos sin codigo de barras
  const cargarProductosSinCodigo = async () => {
    try {
      const res = await fetch(`${API_URL}/productos/sin-codigo-barra?limit=200`)
      const data = await res.json()
      setProductosSinCodigo(data.productos || [])
    } catch (error) {
      console.error("Error cargando productos:", error)
    }
  }

  // Cargar todos los productos
  const cargarTodosProductos = async () => {
    try {
      const res = await fetch(`${API_URL}/productos?limit=500`)
      const data = await res.json()
      setProductos(data.productos || [])
    } catch (error) {
      console.error("Error cargando productos:", error)
    }
  }

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true)
      await Promise.all([cargarProductosSinCodigo(), cargarTodosProductos()])
      setLoading(false)
    }
    cargarDatos()
  }, [])

  // Filtrar productos por busqueda
  const productosFiltrados = (activeTab === "sin-codigo" ? productosSinCodigo : productos)
    .filter(p => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        p.producto.toLowerCase().includes(query) ||
        p.codigo.toLowerCase().includes(query) ||
        (p.codigo_barra && p.codigo_barra.toLowerCase().includes(query))
      )
    })

  // Seleccionar producto para asignar codigo
  const seleccionarProducto = (producto: Producto) => {
    setSelectedProducto(producto)
    setCodigoInput(producto.codigo_barra || "")
    setModalOpen(true)
    setCameraActive(false)
    setCameraError(null)

    // Focus en el input despues de abrir el modal
    setTimeout(() => {
      barcodeInputRef.current?.focus()
    }, 100)
  }

  // Guardar codigo de barras
  const guardarCodigo = async () => {
    if (!selectedProducto || !codigoInput.trim()) {
      toast({
        title: "Error",
        description: "Ingresa un codigo de barras valido",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/productos/${selectedProducto.id}/codigo-barra`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo_barra: codigoInput.trim() })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || "Error al guardar")
      }

      toast({
        title: "Codigo asignado",
        description: `Codigo ${codigoInput} asignado a ${selectedProducto.producto}`,
      })

      // Actualizar listas
      await Promise.all([cargarProductosSinCodigo(), cargarTodosProductos()])

      setModalOpen(false)
      setSelectedProducto(null)
      setCodigoInput("")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar el codigo",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // Manejar Enter en el input (para lector USB)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && codigoInput.trim()) {
      e.preventDefault()
      guardarCodigo()
    }
  }

  // Activar camara
  const activarCamara = async () => {
    try {
      setCameraError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraActive(true)
    } catch (error) {
      console.error("Error accediendo a la camara:", error)
      setCameraError("No se pudo acceder a la camara. Verifica los permisos.")
    }
  }

  // Desactivar camara
  const desactivarCamara = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }, [])

  // Limpiar al cerrar modal
  useEffect(() => {
    if (!modalOpen) {
      desactivarCamara()
    }
  }, [modalOpen, desactivarCamara])

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      desactivarCamara()
    }
  }, [desactivarCamara])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Asignar Codigos de Barras</h1>
          <p className="text-muted-foreground">
            {productosSinCodigo.length} productos sin codigo asignado
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Barcode className="h-5 w-5 mr-2" />
          Escaner
        </Badge>
      </div>

      {/* Buscador y tabs */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar producto..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "sin-codigo" | "todos")}>
              <TabsList>
                <TabsTrigger value="sin-codigo">
                  Sin codigo ({productosSinCodigo.length})
                </TabsTrigger>
                <TabsTrigger value="todos">
                  Todos ({productos.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Lista de productos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Productos ({productosFiltrados.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando productos...
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Check className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>No hay productos pendientes</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white">
                  <TableRow>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Codigo Barra</TableHead>
                    <TableHead className="text-right">Accion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productosFiltrados.map((producto) => (
                    <TableRow
                      key={producto.id}
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => seleccionarProducto(producto)}
                    >
                      <TableCell className="font-mono text-sm">
                        {producto.codigo}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {producto.producto}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{producto.categoria}</Badge>
                      </TableCell>
                      <TableCell>
                        {producto.codigo_barra ? (
                          <span className="font-mono text-sm text-green-600">
                            {producto.codigo_barra}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Sin asignar
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline">
                          <Barcode className="h-4 w-4 mr-1" />
                          Asignar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de asignacion */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="h-5 w-5" />
              Asignar Codigo de Barras
            </DialogTitle>
          </DialogHeader>

          {selectedProducto && (
            <div className="space-y-4">
              {/* Info del producto */}
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-bold text-lg">{selectedProducto.producto}</p>
                <p className="text-sm text-muted-foreground">
                  Codigo: {selectedProducto.codigo} | {selectedProducto.categoria}
                </p>
                {selectedProducto.codigo_barra && (
                  <p className="text-sm mt-1">
                    Codigo actual: <span className="font-mono">{selectedProducto.codigo_barra}</span>
                  </p>
                )}
              </div>

              {/* Tabs para modo de entrada */}
              <Tabs defaultValue="usb">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="usb" onClick={() => desactivarCamara()}>
                    <Keyboard className="h-4 w-4 mr-2" />
                    Lector USB
                  </TabsTrigger>
                  <TabsTrigger value="camera" onClick={activarCamara}>
                    <Camera className="h-4 w-4 mr-2" />
                    Camara
                  </TabsTrigger>
                </TabsList>

                {/* Modo Lector USB */}
                <TabsContent value="usb" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Escanea o escribe el codigo de barras:
                    </label>
                    <Input
                      ref={barcodeInputRef}
                      type="text"
                      placeholder="Escanea el codigo de barras..."
                      className="text-xl h-14 font-mono text-center"
                      value={codigoInput}
                      onChange={(e) => setCodigoInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      El lector USB escribira el codigo y presionara Enter automaticamente
                    </p>
                  </div>
                </TabsContent>

                {/* Modo Camara */}
                <TabsContent value="camera" className="space-y-4">
                  {cameraError ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2 text-destructive" />
                      <p className="text-destructive">{cameraError}</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={activarCamara}
                      >
                        Reintentar
                      </Button>
                    </div>
                  ) : cameraActive ? (
                    <div className="space-y-4">
                      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-48 h-24 border-2 border-red-500 rounded" />
                        </div>
                      </div>
                      <p className="text-sm text-center text-muted-foreground">
                        Apunta al codigo de barras. La deteccion requiere la libreria react-zxing.
                      </p>
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          O ingresa el codigo manualmente:
                        </label>
                        <Input
                          type="text"
                          placeholder="Codigo de barras..."
                          className="font-mono"
                          value={codigoInput}
                          onChange={(e) => setCodigoInput(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Camera className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">
                        La camara se activara automaticamente
                      </p>
                      <Button onClick={activarCamara}>
                        <Camera className="h-4 w-4 mr-2" />
                        Activar Camara
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Botones */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={guardarCodigo}
                  disabled={saving || !codigoInput.trim()}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
