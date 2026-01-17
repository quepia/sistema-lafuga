"use client"

import { useEffect, useRef } from "react"
import { X, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Venta } from "@/lib/api"

interface TicketPrintProps {
  venta: Venta
  onClose: () => void
}

// Componente individual del ticket
function TicketContent({ venta, copyNumber }: { venta: Venta; copyNumber: number }) {
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

  const copyLabels = ["ORIGINAL", "DUPLICADO", "TRIPLICADO"]

  return (
    <div className="ticket-content p-4">
      {/* Header */}
      <div className="text-center border-b border-black pb-2 mb-3">
        <img
          src="/LogoLaFugaConTexto.svg"
          alt="La Fuga"
          className="ticket-logo mx-auto"
          style={{ width: '180px', height: 'auto' }}
        />
        <p className="text-[10px] mt-1">Ventas por Mayor y Menor - Articulos de Limpieza, Bazar y Mas</p>
        <p className="text-xs font-bold mt-1">{copyLabels[copyNumber]}</p>
      </div>

      {/* Info del ticket */}
      <div className="flex justify-between text-xs mb-3">
        <div>
          <p><strong>Ticket:</strong> #{venta.id.slice(0, 8).toUpperCase()}</p>
          <p><strong>Cliente:</strong> {venta.cliente_nombre || 'General'}</p>
        </div>
        <div className="text-right">
          <p><strong>Fecha:</strong> {fechaFormateada}</p>
          <p><strong>Hora:</strong> {horaFormateada}</p>
        </div>
      </div>

      {/* Tipo de venta y método de pago */}
      <div className="flex justify-center gap-2 mb-3">
        <span className="inline-block px-3 py-1 bg-black text-white text-xs font-bold">
          VENTA {venta.tipo_venta.toUpperCase()}
        </span>
        {venta.metodo_pago && (
          <span className="inline-block px-3 py-1 bg-gray-700 text-white text-xs font-bold">
            {venta.metodo_pago.toUpperCase()}
          </span>
        )}
      </div>

      {/* Tabla de productos */}
      <table className="w-full text-xs mb-3">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left py-1">Producto</th>
            <th className="text-center py-1">Cant.</th>
            <th className="text-right py-1">P.Unit</th>
            <th className="text-right py-1">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {venta.productos.map((detalle, idx) => (
            <tr key={idx} className="border-b border-dashed border-gray-300">
              <td className="py-1 max-w-[120px] truncate" title={detalle.nombre_producto}>
                {detalle.nombre_producto}
              </td>
              <td className="text-center py-1">{detalle.cantidad}</td>
              <td className="text-right py-1">
                ${detalle.precio_unitario.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </td>
              <td className="text-right py-1 font-medium">
                ${detalle.subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <div className="border-t-2 border-black pt-2 mt-2">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold">TOTAL:</span>
          <span className="text-xl font-bold">
            ${venta.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-center text-xs mt-2 text-gray-600">
          {venta.productos.length} productos
        </p>
      </div>

      {/* Footer */}
      <div className="text-center text-xs mt-3 pt-2 border-t border-gray-300">
        <p>Gracias por su compra!</p>
        <p className="text-gray-500 mt-1">www.lafuga.com.ar</p>
      </div>
    </div>
  )
}

export default function TicketPrint({ venta, onClose }: TicketPrintProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    window.print()
  }

  // Auto-imprimir al montar
  useEffect(() => {
    const timer = setTimeout(() => {
      handlePrint()
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {/* Overlay con botones (oculto al imprimir) */}
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center print:hidden">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Ticket Generado</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="text-center mb-6">
            <p className="text-3xl font-bold text-green-600 mb-2">
              ${venta.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-muted-foreground">
              Ticket #{venta.id.slice(0, 8).toUpperCase()} - {venta.cliente_nombre || 'General'}
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

      {/* Contenido para imprimir - triplicado en A4 */}
      <div ref={printRef} className="hidden print:block print-container">
        {/* Ticket 1 - ORIGINAL */}
        <div className="ticket-copy">
          <TicketContent venta={venta} copyNumber={0} />
        </div>
        <div className="cut-line"></div>

        {/* Ticket 2 - DUPLICADO */}
        <div className="ticket-copy">
          <TicketContent venta={venta} copyNumber={1} />
        </div>
        <div className="cut-line"></div>

        {/* Ticket 3 - TRIPLICADO */}
        <div className="ticket-copy">
          <TicketContent venta={venta} copyNumber={2} />
        </div>
      </div>

      {/* Estilos de impresion */}
      <style jsx global>{`
        @media print {
          /* Ocultar todo excepto el contenido de impresion */
          body * {
            visibility: hidden;
          }

          /* Forzar fondo blanco en toda la pagina */
          body {
            background: #FFFFFF !important;
            background-color: #FFFFFF !important;
          }

          .print-container,
          .print-container * {
            visibility: visible;
            background-color: #FFFFFF !important;
          }

          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            margin: 0;
            padding: 0;
            background: #FFFFFF !important;
          }

          /* Cada ticket crece segun su contenido - SIN altura fija ni overflow */
          .ticket-copy {
            padding: 5mm;
            box-sizing: border-box;
            background: #FFFFFF !important;
            page-break-inside: avoid;
            page-break-after: auto;
          }

          .ticket-content {
            font-family: 'Courier New', monospace;
            font-size: 10pt;
            line-height: 1.2;
            background: #FFFFFF !important;
          }

          /* Asegurar que los colores del logo se impriman */
          .ticket-logo {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Linea de corte punteada */
          .cut-line {
            border-bottom: 2px dashed #000;
            margin: 5mm 0;
            height: 2mm;
            background: #FFFFFF !important;
          }

          /* Ocultar elementos de navegacion */
          header, nav, aside, footer, .sidebar, button {
            display: none !important;
          }

          /* Ajustes de tabla - sin restricciones */
          table {
            width: 100%;
            border-collapse: collapse;
            background: #FFFFFF !important;
          }

          th, td {
            padding: 2px 4px;
            background: #FFFFFF !important;
          }

          /* Margenes de pagina */
          @page {
            size: A4;
            margin: 5mm;
          }
        }
      `}</style>
    </>
  )
}
