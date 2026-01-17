"use client"

import { useEffect, useRef } from "react"
import { X, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Venta, VentaProductoExtendido } from "@/lib/api"

interface ThermalTicketProps {
    venta: Venta
    onClose: () => void
}

// Check if product is from MASCOTAS or SUELTOS category (for unit pricing display)
function shouldShowUnitPrice(producto: VentaProductoExtendido): boolean {
    // Check common category patterns
    const nombreLower = producto.nombre_producto.toLowerCase()
    // MASCOTAS products often have weight info, SUELTOS have volume
    // Since we don't have categoria in the sale data, we'll check for extended pricing
    return !!(producto.precio_lista_menor || producto.precio_lista_mayor)
}

// Format unit price info if available
function getUnitPriceInfo(producto: VentaProductoExtendido): string | null {
    // If we have extended pricing info, we could show it
    // For now, just return null - this can be enhanced when category info is available
    return null
}

export default function ThermalTicket({ venta, onClose }: ThermalTicketProps) {
    const printRef = useRef<HTMLDivElement>(null)

    const fecha = new Date(venta.created_at)
    const fechaFormateada = fecha.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    })
    const horaFormateada = fecha.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit"
    })

    const handlePrint = () => {
        window.print()
    }

    // Auto-print on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            handlePrint()
        }, 500)
        return () => clearTimeout(timer)
    }, [])

    return (
        <>
            {/* Overlay with buttons (hidden when printing) */}
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center thermal-no-print">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Ticket Térmico (80mm)</h2>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="text-center mb-6">
                        <p className="text-3xl font-bold text-green-600 mb-2">
                            ${venta.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-muted-foreground">
                            Presupuesto #{venta.id.slice(0, 8).toUpperCase()} - {venta.cliente_nombre || 'General'}
                        </p>
                        {venta.metodo_pago && (
                            <p className="text-sm text-muted-foreground mt-1">
                                Pago: {venta.metodo_pago}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={handlePrint} className="flex-1">
                            <Printer className="h-4 w-4 mr-2" />
                            Imprimir
                        </Button>
                        <Button variant="outline" onClick={onClose} className="flex-1">
                            Cerrar
                        </Button>
                    </div>
                </div>
            </div>

            {/* Thermal ticket content for printing */}
            <div ref={printRef} className="thermal-print-container">
                <div className="thermal-ticket">
                    {/* Header */}
                    <div className="thermal-header">
                        <img
                            src="/LogoLaFugaEnGris.svg"
                            alt="La Fuga"
                            className="thermal-logo"
                        />
                        <p className="thermal-tagline">Ventas por Mayor y Menor</p>
                        <p className="thermal-tagline">Artículos de Limpieza, Bazar y Más</p>
                    </div>

                    {/* Title */}
                    <div className="thermal-title-section">
                        <h1 className="thermal-title">PRESUPUESTO</h1>
                        <p className="thermal-subtitle">DOCUMENTO NO VÁLIDO COMO FACTURA</p>
                    </div>

                    {/* Date, Time, Customer Info */}
                    <div className="thermal-info">
                        <div className="thermal-info-row">
                            <span>Fecha:</span>
                            <span>{fechaFormateada}</span>
                        </div>
                        <div className="thermal-info-row">
                            <span>Hora:</span>
                            <span>{horaFormateada}</span>
                        </div>
                        <div className="thermal-info-row">
                            <span>Cliente:</span>
                            <span>{venta.cliente_nombre || 'General'}</span>
                        </div>
                        <div className="thermal-info-row">
                            <span>N° Presup.:</span>
                            <span>#{venta.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                    </div>

                    {/* Separator */}
                    <div className="thermal-separator"></div>

                    {/* Products Table Header */}
                    <div className="thermal-table-header">
                        <span className="thermal-col-cant">CANT</span>
                        <span className="thermal-col-desc">DESCRIPCIÓN</span>
                        <span className="thermal-col-price">P.UNIT.</span>
                        <span className="thermal-col-total">IMPORTE</span>
                    </div>

                    {/* Separator */}
                    <div className="thermal-separator"></div>

                    {/* Products */}
                    <div className="thermal-products">
                        {(venta.productos || []).map((producto, idx) => {
                            const prod = producto as VentaProductoExtendido
                            const unitPriceInfo = getUnitPriceInfo(prod)

                            return (
                                <div key={idx} className="thermal-product-row">
                                    <div className="thermal-product-main">
                                        <span className="thermal-col-cant">{prod.cantidad}</span>
                                        <span className="thermal-col-desc">{prod.nombre_producto}</span>
                                        <span className="thermal-col-price">
                                            ${prod.precio_unitario.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className="thermal-col-total">
                                            ${prod.subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    {unitPriceInfo && (
                                        <div className="thermal-product-unit-price">
                                            {unitPriceInfo}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Separator */}
                    <div className="thermal-separator-double"></div>

                    {/* Total */}
                    <div className="thermal-total-section">
                        <div className="thermal-total-row">
                            <span className="thermal-total-label">TOTAL</span>
                            <span className="thermal-total-value">
                                ${venta.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="thermal-payment">
                        <span>Forma de Pago: {venta.metodo_pago || 'Efectivo'}</span>
                    </div>

                    {/* Separator */}
                    <div className="thermal-separator"></div>

                    {/* Footer */}
                    <div className="thermal-footer">
                        <p className="thermal-validity">Presupuesto válido por 7 días.</p>
                        <p className="thermal-thanks">¡Gracias por su consulta!</p>
                        <p className="thermal-website">www.lafuga.com.ar</p>
                    </div>
                </div>
            </div>

            {/* Thermal ticket print styles */}
            <style jsx global>{`
        /* Hide thermal ticket on screen by default */
        .thermal-print-container {
          display: none;
        }

        @media print {
          /* Hide everything except thermal container */
          body * {
            visibility: hidden;
          }

          /* Hide A4 print container if it exists */
          .print-container {
            display: none !important;
          }

          /* Hide thermal no-print elements */
          .thermal-no-print {
            display: none !important;
          }

          /* Show thermal container */
          .thermal-print-container,
          .thermal-print-container * {
            visibility: visible;
          }

          .thermal-print-container {
            display: block;
            position: fixed;
            left: 0;
            top: 0;
            width: 80mm;
            background: white !important;
            z-index: 9999;
          }

          /* Thermal ticket base styles */
          .thermal-ticket {
            width: 80mm;
            padding: 2mm;
            font-family: 'Courier New', 'Lucida Console', monospace;
            font-size: 10pt;
            line-height: 1.3;
            color: #000;
            background: white !important;
          }

          /* Header */
          .thermal-header {
            text-align: center;
            padding-bottom: 2mm;
          }

          .thermal-logo {
            width: 50mm;
            height: auto;
            margin: 0 auto 2mm;
            display: block;
          }

          .thermal-tagline {
            font-size: 8pt;
            margin: 0;
            line-height: 1.2;
          }

          /* Title section */
          .thermal-title-section {
            text-align: center;
            padding: 2mm 0;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            margin: 2mm 0;
          }

          .thermal-title {
            font-size: 14pt;
            font-weight: bold;
            margin: 0;
            letter-spacing: 1px;
          }

          .thermal-subtitle {
            font-size: 7pt;
            margin: 1mm 0 0 0;
            font-weight: bold;
          }

          /* Info section */
          .thermal-info {
            padding: 2mm 0;
          }

          .thermal-info-row {
            display: flex;
            justify-content: space-between;
            font-size: 9pt;
            line-height: 1.4;
          }

          /* Separators */
          .thermal-separator {
            border-top: 1px dashed #000;
            margin: 2mm 0;
          }

          .thermal-separator-double {
            border-top: 2px solid #000;
            margin: 2mm 0;
          }

          /* Table header */
          .thermal-table-header {
            display: flex;
            font-size: 8pt;
            font-weight: bold;
            padding: 1mm 0;
          }

          .thermal-col-cant {
            width: 12mm;
            text-align: center;
          }

          .thermal-col-desc {
            flex: 1;
            text-align: left;
            padding: 0 1mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .thermal-col-price {
            width: 18mm;
            text-align: right;
          }

          .thermal-col-total {
            width: 18mm;
            text-align: right;
          }

          /* Products */
          .thermal-products {
            padding: 1mm 0;
          }

          .thermal-product-row {
            margin-bottom: 1mm;
          }

          .thermal-product-main {
            display: flex;
            font-size: 9pt;
            align-items: flex-start;
          }

          .thermal-product-main .thermal-col-desc {
            white-space: normal;
            word-wrap: break-word;
            font-size: 8pt;
          }

          .thermal-product-unit-price {
            font-size: 7pt;
            color: #333;
            padding-left: 14mm;
            margin-top: 0.5mm;
          }

          /* Total section */
          .thermal-total-section {
            padding: 2mm 0;
          }

          .thermal-total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .thermal-total-label {
            font-size: 14pt;
            font-weight: bold;
          }

          .thermal-total-value {
            font-size: 16pt;
            font-weight: bold;
          }

          /* Payment */
          .thermal-payment {
            text-align: center;
            font-size: 9pt;
            padding: 2mm 0;
          }

          /* Footer */
          .thermal-footer {
            text-align: center;
            padding: 2mm 0;
          }

          .thermal-validity {
            font-size: 8pt;
            font-weight: bold;
            margin: 0 0 2mm 0;
          }

          .thermal-thanks {
            font-size: 9pt;
            margin: 0;
          }

          .thermal-website {
            font-size: 8pt;
            color: #666;
            margin: 1mm 0 0 0;
          }

          /* Page settings for thermal */
          @page {
            size: auto;
            margin: 0;
          }
        }
      `}</style>
        </>
    )
}
