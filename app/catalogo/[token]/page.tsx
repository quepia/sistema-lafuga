"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import { api, Catalogo, ProductoCatalogo } from "@/lib/api"
import { CatalogoPreview } from "@/components/catalogos/CatalogoPreview"
import { CatalogoPDFView } from "@/components/catalogos/CatalogoPDFView"
import { generarCatalogoPDF } from "@/lib/pdf-utils"
import { Button } from "@/components/ui/button"
import { Loader2, FileDown, AlertCircle, Clock } from "lucide-react"

export default function CatalogoPublicoPage() {
  const params = useParams()
  const token = params.token as string

  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [productos, setProductos] = useState<ProductoCatalogo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  useEffect(() => {
    const loadCatalogo = async () => {
      if (!token) return

      setIsLoading(true)
      setError(null)

      try {
        const catalogoData = await api.obtenerCatalogoPorToken(token)

        if (!catalogoData) {
          setError("Este catálogo no existe o ha expirado")
          return
        }

        setCatalogo(catalogoData)

        // Load products
        const productosData = await api.obtenerProductosCatalogo(catalogoData)
        setProductos(productosData)
      } catch (err) {
        console.error("Error loading catalog:", err)
        setError("Error al cargar el catálogo")
      } finally {
        setIsLoading(false)
      }
    }

    loadCatalogo()
  }, [token])

  const handleDownloadPDF = async () => {
    if (!catalogo) return

    setIsGeneratingPDF(true)
    try {
      await generarCatalogoPDF("catalogo-pdf-hidden", catalogo.cliente_nombre)
    } catch (err) {
      console.error("Error generating PDF:", err)
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const formatExpiryDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Cargando catálogo...</p>
        </div>
      </div>
    )
  }

  if (error || !catalogo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Catálogo No Disponible
          </h1>
          <p className="text-gray-600 mb-6">
            {error || "Este catálogo no existe o ha expirado"}
          </p>
          <Image
            src="/LogoLaFuga.svg"
            alt="La Fuga"
            width={60}
            height={60}
            className="mx-auto opacity-50"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Bar */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/LogoLaFuga.svg"
              alt="La Fuga"
              width={32}
              height={32}
            />
            <div>
              <h1 className="text-sm font-medium text-gray-900">{catalogo.titulo}</h1>
              <p className="text-xs text-gray-500">
                Para: {catalogo.cliente_nombre}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              Válido hasta {formatExpiryDate(catalogo.expires_at)}
            </div>
            <Button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              size="sm"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-2" />
                  Descargar PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Catalog Content */}
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <CatalogoPreview
          id="catalogo-preview"
          titulo={catalogo.titulo}
          clienteNombre={catalogo.cliente_nombre}
          productos={productos}
          camposVisibles={catalogo.campos_visibles}
          descuentoGlobal={catalogo.descuento_global}
          fechaGeneracion={new Date(catalogo.created_at)}
        />

        {/* Hidden PDF View */}
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
          <CatalogoPDFView
            id="catalogo-pdf-hidden"
            titulo={catalogo.titulo}
            clienteNombre={catalogo.cliente_nombre}
            productos={productos}
            camposVisibles={catalogo.campos_visibles}
            descuentoGlobal={catalogo.descuento_global}
            fechaGeneracion={new Date(catalogo.created_at)}
          />
        </div>
      </div>

      {/* Mobile Download Button */}
      <div className="fixed bottom-4 right-4 sm:hidden">
        <Button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF}
          size="lg"
          className="rounded-full shadow-lg"
        >
          {isGeneratingPDF ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <FileDown className="w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  )
}
