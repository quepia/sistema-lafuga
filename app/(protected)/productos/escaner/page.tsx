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
import { api, Producto } from "@/lib/api"
import { useZxing } from "react-zxing";

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
  const [scanMode, setScanMode] = useState<"usb" | "camera">("usb")

  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // ZXing hook for camera
  const { ref: cameraRef } = useZxing({
    onDecodeResult(result) {
      const code = result.getText();
      console.log("Barcode detected:", code);
      if (modalOpen && scanMode === "camera") {
        setCodigoInput(code);
        // Optional: Auto-save if desired, but user might want to verify
        // handleSave(code); 
        toast({
          title: "Código detectado",
          description: code,
        });
      }
    },
    paused: !modalOpen || scanMode !== "camera",
  });

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const [sinCodigo, todos] = await Promise.all([
        api.obtenerProductosSinCodigo(),
        api.listarProductos({ limit: 500 }).then(r => r.productos)
        // Note: listarProductos returns paginated object
      ])
      setProductosSinCodigo(sinCodigo)
      setProductos(todos)
    } catch (error) {
      console.error("Error cargando productos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const seleccionarProducto = (producto: Producto) => {
    setSelectedProducto(producto)
    setCodigoInput(producto.codigo_barra || "")
    setModalOpen(true)
    setScanMode("usb") // Default to USB/Manual

    setTimeout(() => {
      barcodeInputRef.current?.focus()
    }, 100)
  }

  const guardarCodigo = async () => {
    if (!selectedProducto || !codigoInput.trim()) return

    setSaving(true)
    try {
      await api.asignarCodigoBarra(selectedProducto.id, codigoInput.trim())

      toast({
        title: "Código asignado",
        description: `Código ${codigoInput} asignado a ${selectedProducto.nombre}`,
      })

      // Refresh text
      await cargarDatos()

      setModalOpen(false)
      setSelectedProducto(null)
      setCodigoInput("")
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el código",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && codigoInput.trim()) {
      e.preventDefault()
      guardarCodigo()
    }
  }

  // Filter logic
  const productosFiltrados = (activeTab === "sin-codigo" ? productosSinCodigo : productos)
    .filter(p => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        (p.nombre && p.nombre.toLowerCase().includes(query)) ||
        (p.id && p.id.toLowerCase().includes(query)) ||
        (p.codigo_barra && p.codigo_barra.toLowerCase().includes(query))
      )
    })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Asignar Códigos de Barras</h1>
          <p className="text-muted-foreground">
            {productosSinCodigo.length} productos sin código asignado
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
                  Sin código ({productosSinCodigo.length})
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
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Código Barra</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productosFiltrados.map((producto) => (
                    <TableRow
                      key={producto.id}
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => seleccionarProducto(producto)}
                    >
                      <TableCell className="max-w-[200px] truncate font-medium">
                        {producto.nombre}
                        <div className="text-xs text-muted-foreground font-mono">{producto.id.slice(0, 8)}</div>
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
              Asignar Código de Barras
            </DialogTitle>
          </DialogHeader>

          {selectedProducto && (
            <div className="space-y-4">
              {/* Info del producto */}
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-bold text-lg">{selectedProducto.nombre}</p>
                <p className="text-sm text-muted-foreground">
                  ID: {selectedProducto.id} | {selectedProducto.categoria}
                </p>
                {selectedProducto.codigo_barra && (
                  <p className="text-sm mt-1">
                    Código actual: <span className="font-mono">{selectedProducto.codigo_barra}</span>
                  </p>
                )}
              </div>

              {/* Tabs para modo de entrada */}
              <Tabs value={scanMode} onValueChange={(v) => setScanMode(v as "usb" | "camera")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="usb">
                    <Keyboard className="h-4 w-4 mr-2" />
                    Lector USB
                  </TabsTrigger>
                  <TabsTrigger value="camera">
                    <Camera className="h-4 w-4 mr-2" />
                    Cámara
                  </TabsTrigger>
                </TabsList>

                {/* Modo Lector USB */}
                <TabsContent value="usb" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Escanea o escribe el código de barras:
                    </label>
                    <Input
                      ref={barcodeInputRef}
                      type="text"
                      placeholder="Escanea el código de barras..."
                      className="text-xl h-14 font-mono text-center"
                      value={codigoInput}
                      onChange={(e) => setCodigoInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      El lector USB escribirá el código y presionará Enter automáticamente
                    </p>
                  </div>
                </TabsContent>

                {/* Modo Cámara */}
                <TabsContent value="camera" className="space-y-4">
                  <div className="space-y-4">
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                      {/* Video Element for ZXing */}
                      <video ref={cameraRef} className="w-full h-full object-cover" />

                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-64 h-32 border-2 border-red-500 rounded bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
                      </div>
                    </div>
                    <p className="text-sm text-center text-muted-foreground">
                      Apunta al código de barras dentro del recuadro rojo.
                    </p>

                    {/* Manual input fallback inside camera mode */}
                    <div>
                      <label className="text-sm font-medium mb-1 block">Corrección manual:</label>
                      <div className="flex gap-2">
                        <Input
                          value={codigoInput}
                          onChange={(e) => setCodigoInput(e.target.value)}
                          placeholder="Código detectado..."
                          className="font-mono"
                        />
                        <Button size="sm" onClick={guardarCodigo}>OK</Button>
                      </div>
                    </div>
                  </div>
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
