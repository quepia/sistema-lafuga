"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useCatalogoBuilder, WizardStep } from "@/hooks/use-catalogo-builder"
import { api, Producto } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner"
import { CatalogoProductCard } from "./CatalogoProductCard"
import { CatalogoPreview } from "./CatalogoPreview"
import { CatalogoPrintTemplate } from "./CatalogoPrintTemplate"
import { CamposVisibles } from "@/lib/supabase"
import {
  calcularPrecioCatalogoFinal,
  filtrarProductosCatalogoDisponibles,
  formatearDiasValidez,
  formatearFechaCatalogo,
  obtenerDescripcionTipoPrecio,
  obtenerPrecioBaseCatalogo,
  obtenerTextoAjuste,
  obtenerTextoAjustePorcentaje,
  obtenerTextoVigenciaDesdeDias,
} from "@/lib/catalogo-utils"
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
  MessageCircle,
} from "lucide-react"

function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  const steps = [
    { num: 1, label: "Productos" },
    { num: 2, label: "Precios" },
    { num: 3, label: "Campos" },
    { num: 4, label: "Publicar" },
  ];

  return (
    <div className="mb-6 flex items-center justify-center">
      {steps.map((step, index) => (
        <div key={step.num} className="flex items-center">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${currentStep >= step.num ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"}`}
          >
            {currentStep > step.num ? <Check className="h-4 w-4" /> : step.num}
          </div>
          <span className={`ml-2 hidden text-sm sm:inline ${currentStep >= step.num ? "text-gray-900" : "text-gray-500"}`}>
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div className={`mx-2 h-0.5 w-8 transition-colors sm:w-16 ${currentStep > step.num ? "bg-blue-500" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

interface CatalogoWizardProps {
  catalogoId?: string;
}

export function CatalogoWizard({ catalogoId }: CatalogoWizardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const builder = useCatalogoBuilder();
  const isEditing = Boolean(catalogoId);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProductosData, setSelectedProductosData] = useState<Producto[]>([]);

  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isLoadingCatalogo, setIsLoadingCatalogo] = useState(isEditing);
  const [pdfLogo, setPdfLogo] = useState<string>("/LogoLaFuga.svg");
  const [pdfImages, setPdfImages] = useState<Record<string, string>>({});

  const [savedCatalogo, setSavedCatalogo] = useState<{
    id: string;
    publicToken: string;
    expiresAt: string;
  } | null>(null);
  const [showSavedState, setShowSavedState] = useState(false);

  const vigenciaTexto = obtenerTextoVigenciaDesdeDias(builder.state.duracionDias);
  const getProductoIds = builder.getProductoIds;
  const loadCatalogoInBuilder = builder.loadCatalogo;
  const productosCount = builder.productosCount;
  const productosVisiblesCatalogo = filtrarProductosCatalogoDisponibles(selectedProductosData);

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

  useEffect(() => {
    if (!catalogoId) {
      setIsLoadingCatalogo(false);
      return;
    }

    let isMounted = true;

    const loadCatalogo = async () => {
      setIsLoadingCatalogo(true);
      try {
        const catalogo = await api.obtenerCatalogo(catalogoId);

        if (!isMounted) {
          return;
        }

        loadCatalogoInBuilder(catalogo);
        setSavedCatalogo({
          id: catalogo.id,
          publicToken: catalogo.public_token,
          expiresAt: catalogo.expires_at,
        });
        setShowSavedState(false);
      } catch (error) {
        console.error("Error loading catalog:", error);
        toast.error("No se pudo cargar el catálogo para editar");
        router.push("/catalogos");
      } finally {
        if (isMounted) {
          setIsLoadingCatalogo(false);
        }
      }
    };

    void loadCatalogo();

    return () => {
      isMounted = false;
    };
  }, [catalogoId, loadCatalogoInBuilder, router]);

  useEffect(() => {
    const loadSelectedProducts = async () => {
      const ids = getProductoIds();
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

    void loadSelectedProducts();
  }, [getProductoIds, productosCount]);

  const handleSaveCatalogo = async (copyLinkAfterSave: boolean) => {
    if (!builder.state.clienteNombre.trim()) {
      toast.error("Por favor ingresa el nombre del cliente");
      return;
    }

    if (productosVisiblesCatalogo.length === 0) {
      toast.error("El catálogo no tiene productos válidos para publicar");
      return;
    }

    setIsCreating(true);
    try {
      const expiresAt = new Date(
        Date.now() + builder.state.duracionDias * 24 * 60 * 60 * 1000
      ).toISOString();

      const datosCatalogo = {
        cliente_nombre: builder.state.clienteNombre.trim(),
        titulo: builder.state.titulo.trim() || "Catálogo de Precios",
        tipo_precio: builder.state.tipoPrecio,
        expires_at: expiresAt,
        descuento_global: builder.state.descuentoGlobal,
        campos_visibles: builder.state.camposVisibles,
        productos: builder.getProductosArray(),
        creado_por: user?.email || undefined,
      };

      const catalogo = isEditing && catalogoId
        ? await api.actualizarCatalogo(catalogoId, datosCatalogo)
        : await api.crearCatalogo(datosCatalogo);

      setSavedCatalogo({
        id: catalogo.id,
        publicToken: catalogo.public_token,
        expiresAt: catalogo.expires_at,
      });
      setShowSavedState(!isEditing);

      let linkCopiado = false;

      if (copyLinkAfterSave) {
        const url = `${window.location.origin}/catalogo/${catalogo.public_token}`;
        try {
          await navigator.clipboard.writeText(url);
          linkCopiado = true;
        } catch (clipboardError) {
          console.error("Error copying catalog link:", clipboardError);
        }
      }

      if (linkCopiado) {
        toast.success(
          isEditing
            ? "Catálogo actualizado y link copiado"
            : `Catálogo creado y link copiado. Vigencia: ${formatearDiasValidez(builder.state.duracionDias)}`
        );
      } else {
        toast.success(isEditing ? "Catálogo actualizado correctamente" : "Catálogo creado correctamente");
        if (copyLinkAfterSave) {
          toast.error("El catálogo se guardó, pero no se pudo copiar el link");
        }
      }
    } catch (error) {
      console.error("Error saving catalog:", error);
      toast.error(isEditing ? "Error al actualizar el catálogo" : "Error al crear el catálogo");
    } finally {
      setIsCreating(false);
    }
  };

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const { urlToBase64 } = await import("@/lib/pdf-utils");
      const logoBase64 = await urlToBase64("/LogoLaFuga.svg");

      const element = document.getElementById("catalogo-print-template");
      if (!element) {
        toast.error("No se pudo encontrar el contenido para generar el PDF");
        return;
      }

      setPdfLogo(logoBase64 || "/LogoLaFuga.svg");

      const productImages: Record<string, string> = {};
      await Promise.all(
        productosVisiblesCatalogo.map(async (producto) => {
          if (!producto.image_url) return;
          const imageBase64 = await urlToBase64(producto.image_url);
          if (imageBase64) {
            productImages[producto.id] = imageBase64;
          }
        })
      );
      setPdfImages(productImages);

      await new Promise((resolve) => setTimeout(resolve, 500));

      const html2pdf = (await import("html2pdf.js")).default;

      await html2pdf()
        .from(element)
        .set({
          margin: 0,
          filename: `Catalogo_${builder.state.clienteNombre.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .save();

      toast.success("PDF generado correctamente");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleCopyLink = async () => {
    if (!savedCatalogo) return;

    const url = `${window.location.origin}/catalogo/${savedCatalogo.publicToken}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado al portapapeles");
  };

  const handleCopyWhatsApp = async () => {
    try {
      let message = "Hola! Te compartimos tu catalogo personalizado de *La Fuga*.\n\n";
      message += `*Tipo de lista:* ${obtenerDescripcionTipoPrecio(builder.state.tipoPrecio)}\n`;
      message += `*Vigencia:* ${savedCatalogo ? formatearFechaCatalogo(savedCatalogo.expiresAt) : formatearDiasValidez(builder.state.duracionDias)}\n`;

      if (savedCatalogo) {
        message += `*Link privado:* ${window.location.origin}/catalogo/${savedCatalogo.publicToken}\n`;
        message += `*Valido hasta:* ${formatearFechaCatalogo(savedCatalogo.expiresAt)}\n`;
      }

      message += "\n*Productos seleccionados:*\n";

      productosVisiblesCatalogo.forEach((producto) => {
        const config = builder.getProductoConfig(producto.id);
        const precioFinal = calcularPrecioCatalogoFinal({
          producto,
          tipoPrecio: builder.state.tipoPrecio,
          descuentoGlobal: builder.state.descuentoGlobal,
          descuentoIndividual: config?.descuento_individual ?? 0,
          precioPersonalizado: config?.precio_personalizado ?? null,
        });

        message += `• ${producto.nombre}: $${precioFinal.toLocaleString("es-AR")}\n`;
      });

      message += "\nQuedamos a disposicion para cualquier consulta.";

      await navigator.clipboard.writeText(message);
      toast.success("Mensaje copiado al portapapeles");
    } catch (error) {
      console.error("Error creating WhatsApp message:", error);
      toast.error("Error al copiar el mensaje");
    }
  };

  const campoLabels: Record<keyof CamposVisibles, string> = {
    foto: "Foto del producto",
    nombre: "Nombre",
    precio: "Precio",
    codigo: "Codigo (ID)",
    descripcion: "Descripcion",
    unidad: "Unidad",
  };

  if (isLoadingCatalogo) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border bg-white">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando catálogo...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div style={{ position: "fixed", top: "-10000px", left: 0, visibility: "hidden" }}>
        <CatalogoPrintTemplate
          id="catalogo-print-template"
          titulo={builder.state.titulo}
          clienteNombre={builder.state.clienteNombre}
          productos={selectedProductosData}
          camposVisibles={builder.state.camposVisibles}
          tipoPrecio={builder.state.tipoPrecio}
          descuentoGlobal={builder.state.descuentoGlobal}
          getDescuentoIndividual={(id) => builder.getProductoConfig(id)?.descuento_individual ?? 0}
          getPrecioPersonalizado={(id) => builder.getProductoConfig(id)?.precio_personalizado ?? null}
          logoSrc={pdfLogo}
          productImages={pdfImages}
          footerText={vigenciaTexto}
        />
      </div>

      <StepIndicator currentStep={builder.state.step} />

      <div className="min-h-[400px] rounded-lg border bg-white p-6">
        {builder.state.step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Seleccionar productos</h2>
                <p className="text-sm text-gray-500">
                  El catalogo respetara el orden en que los vayas marcando.
                </p>
              </div>
              <span className="text-sm text-gray-500">
                {builder.productosCount} seleccionado{builder.productosCount !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                autoComplete="off"
                placeholder="Buscar productos por nombre o codigo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
              )}
            </div>

            {builder.productosCount > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600">
                  Seleccionados en orden. El numero azul indica la posicion en el catalogo.
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={builder.deselectAll}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="mr-1 h-3 w-3" />
                  Limpiar todo
                </Button>
              </div>
            )}

            {selectedProductosData.length > 0 && (
              <div className="space-y-3 rounded-lg border bg-gray-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Productos incluidos</h3>
                    <p className="text-sm text-gray-500">
                      Desde acá también podes revisar el orden o quitar productos del link.
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">
                    {builder.productosCount} incluido{builder.productosCount !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {selectedProductosData.map((producto) => (
                    <CatalogoProductCard
                      key={`selected-${producto.id}`}
                      producto={producto}
                      camposVisibles={{ foto: true, nombre: true, precio: true, codigo: true, descripcion: false, unidad: true }}
                      tipoPrecio={builder.state.tipoPrecio}
                      showCheckbox
                      isSelected={builder.isProductoSelected(producto.id)}
                      onToggle={builder.toggleProducto}
                      selectionOrder={builder.getProductoOrder(producto.id)}
                      compact
                    />
                  ))}
                </div>
              </div>
            )}

            {productos.length > 0 ? (
              <div className="grid max-h-[400px] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
                {productos.map((producto) => (
                  <CatalogoProductCard
                    key={producto.id}
                    producto={producto}
                    camposVisibles={{ foto: true, nombre: true, precio: true, codigo: true, descripcion: false, unidad: true }}
                    tipoPrecio={builder.state.tipoPrecio}
                    showCheckbox
                    isSelected={builder.isProductoSelected(producto.id)}
                    onToggle={builder.toggleProducto}
                    selectionOrder={builder.getProductoOrder(producto.id)}
                    compact
                  />
                ))}
              </div>
            ) : searchQuery.length >= 2 && !isSearching ? (
              <p className="py-8 text-center text-gray-500">No se encontraron productos</p>
            ) : (
              <p className="py-8 text-center text-gray-500">Escribe al menos 2 caracteres para buscar productos</p>
            )}
          </div>
        )}

        {builder.state.step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Configurar lista y ajustes</h2>
              <p className="text-sm text-gray-500">
                Podes trabajar sobre precio mayorista o minorista, aplicar descuentos, recargos y fijar precios manuales por producto.
              </p>
            </div>

            <div className="space-y-4 rounded-lg bg-gray-50 p-4">
              <div className="space-y-2">
                <Label>Lista base</Label>
                <RadioGroup
                  value={builder.state.tipoPrecio}
                  onValueChange={(value) => builder.setTipoPrecio(value as typeof builder.state.tipoPrecio)}
                  className="grid gap-3 md:grid-cols-2"
                >
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-white p-4">
                    <RadioGroupItem value="mayor" id="catalogo-tipo-mayor" />
                    <div>
                      <p className="font-medium text-gray-900">Mayorista</p>
                      <p className="text-sm text-gray-500">Usa `precio_mayor` como base</p>
                    </div>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-white p-4">
                    <RadioGroupItem value="menor" id="catalogo-tipo-menor" />
                    <div>
                      <p className="font-medium text-gray-900">Minorista</p>
                      <p className="text-sm text-gray-500">Usa `precio_menor` como base</p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Ajuste global</Label>
                  <span className="text-2xl font-bold text-blue-600">
                    {obtenerTextoAjustePorcentaje(builder.state.descuentoGlobal)}
                  </span>
                </div>
                <Slider
                  value={[builder.state.descuentoGlobal]}
                  onValueChange={([value]) => builder.setDescuentoGlobal(value)}
                  min={-50}
                  max={50}
                  step={1}
                  className="py-2"
                />
                <p className="text-xs text-gray-500">
                  Usa valores positivos para descuentos y negativos para recargos.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Ajustes por producto</Label>
              <div className="max-h-[360px] space-y-3 overflow-y-auto">
                {selectedProductosData.map((producto, index) => {
                  const config = builder.getProductoConfig(producto.id);
                  const descuentoIndividual = config?.descuento_individual ?? 0;
                  const precioPersonalizado = config?.precio_personalizado ?? null;
                  const precioBase = obtenerPrecioBaseCatalogo(producto, builder.state.tipoPrecio);
                  const precioFinal = calcularPrecioCatalogoFinal({
                    producto,
                    tipoPrecio: builder.state.tipoPrecio,
                    descuentoGlobal: builder.state.descuentoGlobal,
                    descuentoIndividual,
                    precioPersonalizado,
                  });

                  return (
                    <div
                      key={producto.id}
                      className="grid gap-3 rounded-lg border bg-white p-3 md:grid-cols-[minmax(0,1fr)_120px_160px_140px]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {index + 1}. {producto.nombre}
                        </p>
                        <p className="text-xs text-gray-500">
                          Base {obtenerDescripcionTipoPrecio(builder.state.tipoPrecio).toLowerCase()}: ${precioBase.toLocaleString("es-AR")}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Ajuste %</Label>
                        <Input
                          type="number"
                          autoComplete="off"
                          value={descuentoIndividual}
                          onChange={(e) => builder.setDescuentoIndividual(producto.id, Number(e.target.value))}
                          className="text-center"
                          min={-100}
                          max={100}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Precio final manual</Label>
                        <Input
                          type="number"
                          autoComplete="off"
                          value={precioPersonalizado ?? ""}
                          onChange={(e) => {
                            const rawValue = e.target.value.trim();
                            builder.setPrecioPersonalizado(
                              producto.id,
                              rawValue === "" ? null : Number(rawValue)
                            );
                          }}
                          placeholder={precioFinal.toString()}
                          min={0}
                          step="0.01"
                        />
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {precioPersonalizado !== null ? "Precio manual activo" : obtenerTextoAjuste(descuentoIndividual)}
                        </p>
                        <p className="text-sm font-bold text-blue-600">
                          ${precioFinal.toLocaleString("es-AR")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {builder.state.step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Campos visibles</h2>
              <p className="text-sm text-gray-500">
                Selecciona que informacion queres mostrar en el catalogo.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(Object.keys(campoLabels) as (keyof CamposVisibles)[]).map((campo) => (
                <label
                  key={campo}
                  className="flex cursor-pointer items-center gap-3 rounded-lg bg-gray-50 p-4 transition-colors hover:bg-gray-100"
                >
                  <Checkbox
                    checked={builder.state.camposVisibles[campo]}
                    onCheckedChange={() => builder.toggleCampo(campo)}
                  />
                  <span className="text-sm font-medium">{campoLabels[campo]}</span>
                </label>
              ))}
            </div>

            <div className="mt-6">
              <Label className="mb-2 block">Vista previa</Label>
              <div className="grid grid-cols-1 gap-2 rounded-lg bg-gray-50 p-4 sm:grid-cols-3">
                {selectedProductosData.slice(0, 3).map((producto) => (
                  <CatalogoProductCard
                    key={producto.id}
                    producto={producto}
                    camposVisibles={builder.state.camposVisibles}
                    tipoPrecio={builder.state.tipoPrecio}
                    descuentoGlobal={builder.state.descuentoGlobal}
                    descuentoIndividual={builder.getProductoConfig(producto.id)?.descuento_individual ?? 0}
                    precioPersonalizado={builder.getProductoConfig(producto.id)?.precio_personalizado ?? null}
                    compact
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {builder.state.step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Vista previa y publicacion</h2>
              <p className="text-sm text-gray-500">
                Configura a quien se le comparte, cuanto dura el link y revisa el resultado final.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="clienteNombre">Nombre del cliente *</Label>
                <Input
                  id="clienteNombre"
                  autoComplete="off"
                  value={builder.state.clienteNombre}
                  onChange={(e) => builder.setClienteNombre(e.target.value)}
                  placeholder="Ej: Juan Perez"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="titulo">Titulo del catalogo</Label>
                <Input
                  id="titulo"
                  autoComplete="off"
                  value={builder.state.titulo}
                  onChange={(e) => builder.setTitulo(e.target.value)}
                  placeholder="Catalogo de precios"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duracionDias">Duracion del link</Label>
                <Input
                  id="duracionDias"
                  type="number"
                  autoComplete="off"
                  value={builder.state.duracionDias}
                  onChange={(e) => builder.setDuracionDias(Number(e.target.value))}
                  min={1}
                  max={365}
                />
                <p className="text-xs text-gray-500">Configurado en dias, desde 1 hasta 365.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-lg border bg-gray-50 p-4 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Lista base</p>
                <p className="font-medium text-gray-900">{obtenerDescripcionTipoPrecio(builder.state.tipoPrecio)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Vigencia</p>
                <p className="font-medium text-gray-900">{formatearDiasValidez(builder.state.duracionDias)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Productos</p>
                <p className="font-medium text-gray-900">{builder.productosCount}</p>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto rounded-lg border">
              <CatalogoPreview
                titulo={builder.state.titulo}
                clienteNombre={builder.state.clienteNombre || "Cliente"}
                productos={selectedProductosData}
                camposVisibles={builder.state.camposVisibles}
                tipoPrecio={builder.state.tipoPrecio}
                descuentoGlobal={builder.state.descuentoGlobal}
                getDescuentoIndividual={(id) => builder.getProductoConfig(id)?.descuento_individual ?? 0}
                getPrecioPersonalizado={(id) => builder.getProductoConfig(id)?.precio_personalizado ?? null}
                footerText={vigenciaTexto}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {!showSavedState || isEditing ? (
                <>
                  <Button
                    onClick={handleGeneratePDF}
                    disabled={isGeneratingPDF || !builder.canProceed.step4 || productosVisiblesCatalogo.length === 0}
                    className="flex-1"
                    variant="outline"
                  >
                    {isGeneratingPDF ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileDown className="mr-2 h-4 w-4" />
                    )}
                    Descargar PDF
                  </Button>
                  {isEditing && savedCatalogo && (
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      className="flex-1"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar link actual
                    </Button>
                  )}
                  <Button
                    onClick={() => handleSaveCatalogo(true)}
                    disabled={isCreating || !builder.canProceed.step4 || productosVisiblesCatalogo.length === 0}
                    className="flex-1"
                  >
                    {isCreating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="mr-2 h-4 w-4" />
                    )}
                    {isEditing ? "Guardar cambios" : "Generar link privado"}
                  </Button>
                  <Button
                    onClick={handleCopyWhatsApp}
                    variant="outline"
                    className="flex-1"
                    disabled={productosVisiblesCatalogo.length === 0}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Copiar WhatsApp
                  </Button>
                </>
              ) : (
                <div className="flex-1 rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="mb-2 font-medium text-green-700">Catalogo creado exitosamente</p>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={`${window.location.origin}/catalogo/${savedCatalogo?.publicToken ?? ""}`}
                      className="flex-1 bg-white"
                    />
                    <Button onClick={handleCopyLink} variant="outline" size="icon">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-green-700">
                    Vencimiento: {savedCatalogo ? formatearFechaCatalogo(savedCatalogo.expiresAt) : "-"}
                  </p>
                  <Button
                    onClick={handleCopyWhatsApp}
                    variant="outline"
                    className="mt-3 w-full border-green-200 bg-white text-green-700 hover:bg-green-100 hover:text-green-800"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Copiar mensaje completo
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          onClick={builder.prevStep}
          disabled={builder.state.step === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Anterior
        </Button>

        {builder.state.step < 4 ? (
          <Button
            onClick={builder.nextStep}
            disabled={!builder.canProceed[`step${builder.state.step}` as keyof typeof builder.canProceed]}
          >
            Siguiente
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" onClick={() => router.push("/catalogos")}>
            Volver a catalogos
          </Button>
        )}
      </div>
    </div>
  );
}
