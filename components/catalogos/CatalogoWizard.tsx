"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCatalogoBuilder, WizardStep } from "@/hooks/use-catalogo-builder"
import { api, Producto } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { toast } from "sonner"
import { CatalogoProductCard } from "./CatalogoProductCard"
import { CatalogoPreview } from "./CatalogoPreview"
import { CatalogoPDFView } from "./CatalogoPDFView"
import { generarCatalogoPDF } from "@/lib/pdf-utils"
import { CamposVisibles } from "@/lib/supabase"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Search,
  FileDown,
  Link2,
  Copy,
  Loader2,
  X,
} from "lucide-react"

// Step indicator
function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  const steps = [
    { num: 1, label: "Productos" },
    { num: 2, label: "Descuentos" },
    { num: 3, label: "Campos" },
    { num: 4, label: "Exportar" },
  ];

  return (
    <div className="flex items-center justify-center mb-6">
      {steps.map((step, index) => (
        <div key={step.num} className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${currentStep >= step.num
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-500"
              }`}
          >
            {currentStep > step.num ? (
              <Check className="w-4 h-4" />
            ) : (
              step.num
            )}
          </div>
          <span
            className={`ml-2 text-sm hidden sm:inline ${currentStep >= step.num ? "text-gray-900" : "text-gray-500"
              }`}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div
              className={`w-8 sm:w-16 h-0.5 mx-2 transition-colors ${currentStep > step.num ? "bg-blue-500" : "bg-gray-200"
                }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function CatalogoWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const builder = useCatalogoBuilder();

  // Products state
  const [productos, setProductos] = useState<Producto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProductosData, setSelectedProductosData] = useState<Producto[]>([]);

  // Loading states
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Created catalog state
  const [createdCatalogo, setCreatedCatalogo] = useState<{
    id: string;
    publicToken: string;
  } | null>(null);

  // Search products
  useEffect(() => {
    const searchProducts = async () => {
      if (searchQuery.length < 2) {
        setProductos([]);
        return;
      }

      setIsSearching(true);
      try {
        const result = await api.buscarProductos(searchQuery, 50);
        setProductos(result);
      } catch (error) {
        console.error("Error searching products:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Load selected products data when moving to step 2
  useEffect(() => {
    const loadSelectedProducts = async () => {
      const ids = builder.getProductoIds();
      if (ids.length === 0) {
        setSelectedProductosData([]);
        return;
      }

      try {
        const data = await api.obtenerProductosPorIds(ids);
        setSelectedProductosData(data);
      } catch (error) {
        console.error("Error loading selected products:", error);
      }
    };

    if (builder.state.step >= 2) {
      loadSelectedProducts();
    }
  }, [builder.state.step, builder.productosCount]);

  // Handlers
  const handleCreateCatalogo = async (generateLink: boolean) => {
    if (!builder.state.clienteNombre.trim()) {
      toast.error("Por favor ingresa el nombre del cliente");
      return;
    }

    setIsCreating(true);
    try {
      const catalogo = await api.crearCatalogo({
        cliente_nombre: builder.state.clienteNombre.trim(),
        titulo: builder.state.titulo.trim() || "Catálogo de Precios",
        descuento_global: builder.state.descuentoGlobal,
        campos_visibles: builder.state.camposVisibles,
        productos: builder.getProductosArray(),
        creado_por: user?.email || undefined,
      });

      setCreatedCatalogo({
        id: catalogo.id,
        publicToken: catalogo.public_token,
      });

      if (generateLink) {
        const url = `${window.location.origin}/catalogo/${catalogo.public_token}`;
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado al portapapeles");
      }
    } catch (error) {
      console.error("Error creating catalog:", error);
      toast.error("Error al crear el catálogo");
    } finally {
      setIsCreating(false);
    }
  };

  /* eslint-disable @typescript-eslint/no-unused-vars */
  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // Use the hidden PDF view ID
      await generarCatalogoPDF("catalogo-pdf-hidden", builder.state.clienteNombre);
      toast.success("PDF generado correctamente");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleCopyLink = async () => {
    if (createdCatalogo) {
      const url = `${window.location.origin}/catalogo/${createdCatalogo.publicToken}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado al portapapeles");
    }
  };

  const campoLabels: Record<keyof CamposVisibles, string> = {
    foto: "Foto del producto",
    nombre: "Nombre",
    precio: "Precio",
    codigo: "Código (ID)",
    descripcion: "Descripción",
    unidad: "Unidad",
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Step Indicator */}
      <StepIndicator currentStep={builder.state.step} />

      {/* Step Content */}
      <div className="bg-white rounded-lg border p-6 min-h-[400px]">
        {/* Step 1: Product Selection */}
        {builder.state.step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Seleccionar Productos</h2>
              <span className="text-sm text-gray-500">
                {builder.productosCount} seleccionado{builder.productosCount !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar productos por nombre o código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
              )}
            </div>

            {/* Selected products summary */}
            {builder.productosCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600">Seleccionados:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={builder.deselectAll}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-3 h-3 mr-1" />
                  Limpiar todo
                </Button>
              </div>
            )}

            {/* Products grid */}
            {productos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto">
                {productos.map((producto) => (
                  <CatalogoProductCard
                    key={producto.id}
                    producto={producto}
                    camposVisibles={{ foto: true, nombre: true, precio: true, codigo: true, descripcion: false, unidad: true }}
                    showCheckbox
                    isSelected={builder.isProductoSelected(producto.id)}
                    onToggle={builder.toggleProducto}
                    compact
                  />
                ))}
              </div>
            ) : searchQuery.length >= 2 && !isSearching ? (
              <p className="text-center text-gray-500 py-8">
                No se encontraron productos
              </p>
            ) : (
              <p className="text-center text-gray-500 py-8">
                Escribe al menos 2 caracteres para buscar productos
              </p>
            )}
          </div>
        )}

        {/* Step 2: Discount Configuration */}
        {builder.state.step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Configurar Descuentos</h2>

            {/* Global Discount */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <Label>Descuento Global</Label>
                <span className="text-2xl font-bold text-blue-600">
                  {builder.state.descuentoGlobal}%
                </span>
              </div>
              <Slider
                value={[builder.state.descuentoGlobal]}
                onValueChange={([value]) => builder.setDescuentoGlobal(value)}
                max={50}
                step={1}
                className="py-2"
              />
              <p className="text-xs text-gray-500">
                Este descuento se aplicará a todos los productos del catálogo
              </p>
            </div>

            {/* Individual Discounts */}
            <div className="space-y-3">
              <Label>Ajustes Individuales</Label>
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {selectedProductosData.map((producto) => {
                  const config = builder.getProductoConfig(producto.id);
                  const descuentoIndividual = config?.descuento_individual ?? 0;
                  const totalDescuento = builder.state.descuentoGlobal + descuentoIndividual;
                  const precioFinal = Math.round(producto.precio_mayor * (1 - totalDescuento / 100) * 100) / 100;

                  return (
                    <div
                      key={producto.id}
                      className="flex items-center gap-4 p-3 bg-white border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{producto.nombre}</p>
                        <p className="text-xs text-gray-500">
                          Original: ${producto.precio_mayor.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={descuentoIndividual}
                          onChange={(e) =>
                            builder.setDescuentoIndividual(producto.id, Number(e.target.value))
                          }
                          className="w-16 text-center"
                          min={0}
                          max={50}
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-blue-600">
                          ${precioFinal.toLocaleString()}
                        </p>
                        {totalDescuento > 0 && (
                          <p className="text-xs text-green-600">-{totalDescuento}%</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Visible Fields */}
        {builder.state.step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Campos Visibles</h2>
            <p className="text-sm text-gray-500">
              Selecciona qué información mostrar en el catálogo
            </p>

            <div className="grid grid-cols-2 gap-4">
              {(Object.keys(campoLabels) as (keyof CamposVisibles)[]).map((campo) => (
                <label
                  key={campo}
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <Checkbox
                    checked={builder.state.camposVisibles[campo]}
                    onCheckedChange={() => builder.toggleCampo(campo)}
                  />
                  <span className="text-sm font-medium">{campoLabels[campo]}</span>
                </label>
              ))}
            </div>

            {/* Mini Preview */}
            <div className="mt-6">
              <Label className="mb-2 block">Vista previa</Label>
              <div className="grid grid-cols-3 gap-2 p-4 bg-gray-50 rounded-lg">
                {selectedProductosData.slice(0, 3).map((producto) => (
                  <CatalogoProductCard
                    key={producto.id}
                    producto={producto}
                    camposVisibles={builder.state.camposVisibles}
                    descuentoGlobal={builder.state.descuentoGlobal}
                    descuentoIndividual={builder.getProductoConfig(producto.id)?.descuento_individual ?? 0}
                    compact
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Preview & Export */}
        {builder.state.step === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Vista Previa y Exportar</h2>

            {/* Client Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clienteNombre">Nombre del Cliente *</Label>
                <Input
                  id="clienteNombre"
                  value={builder.state.clienteNombre}
                  onChange={(e) => builder.setClienteNombre(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="titulo">Título del Catálogo</Label>
                <Input
                  id="titulo"
                  value={builder.state.titulo}
                  onChange={(e) => builder.setTitulo(e.target.value)}
                  placeholder="Catálogo de Precios"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
              <CatalogoPreview
                titulo={builder.state.titulo}
                clienteNombre={builder.state.clienteNombre || "Cliente"}
                productos={selectedProductosData}
                camposVisibles={builder.state.camposVisibles}
                descuentoGlobal={builder.state.descuentoGlobal}
                getDescuentoIndividual={(id) => builder.getProductoConfig(id)?.descuento_individual ?? 0}
                getPrecioPersonalizado={(id) => builder.getProductoConfig(id)?.precio_personalizado ?? null}
              />
            </div>

            {/* Hidden PDF View */}
            <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
              <CatalogoPDFView
                id="catalogo-pdf-hidden"
                titulo={builder.state.titulo}
                clienteNombre={builder.state.clienteNombre || "Cliente"}
                productos={selectedProductosData}
                camposVisibles={builder.state.camposVisibles}
                descuentoGlobal={builder.state.descuentoGlobal}
                getDescuentoIndividual={(id) => builder.getProductoConfig(id)?.descuento_individual ?? 0}
                getPrecioPersonalizado={(id) => builder.getProductoConfig(id)?.precio_personalizado ?? null}
              />
            </div>

            {/* Export Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {!createdCatalogo ? (
                <>
                  <Button
                    onClick={handleGeneratePDF}
                    disabled={isGeneratingPDF || !builder.canProceed.step4}
                    className="flex-1"
                    variant="outline"
                  >
                    {isGeneratingPDF ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileDown className="w-4 h-4 mr-2" />
                    )}
                    Descargar PDF
                  </Button>
                  <Button
                    onClick={() => handleCreateCatalogo(true)}
                    disabled={isCreating || !builder.canProceed.step4}
                    className="flex-1"
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4 mr-2" />
                    )}
                    Generar Link Temporal
                  </Button>
                </>
              ) : (
                <div className="flex-1 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 font-medium mb-2">
                    Catálogo creado exitosamente
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={`${window.location.origin}/catalogo/${createdCatalogo.publicToken}`}
                      className="flex-1 bg-white"
                    />
                    <Button onClick={handleCopyLink} variant="outline" size="icon">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    El link expira en 7 días
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={builder.prevStep}
          disabled={builder.state.step === 1}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Anterior
        </Button>

        {builder.state.step < 4 ? (
          <Button
            onClick={builder.nextStep}
            disabled={!builder.canProceed[`step${builder.state.step}` as keyof typeof builder.canProceed]}
          >
            Siguiente
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button variant="outline" onClick={() => router.push("/catalogos")}>
            Volver a Catálogos
          </Button>
        )}
      </div>
    </div>
  );
}
