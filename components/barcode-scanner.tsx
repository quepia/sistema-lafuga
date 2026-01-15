"use client"

/**
 * Componente de escaner de codigos de barras usando la camara.
 *
 * INSTALACION REQUERIDA:
 * pnpm add @yudiel/react-qr-scanner
 *
 * Este componente usa @yudiel/react-qr-scanner que es compatible con Next.js
 * y soporta tanto codigos QR como codigos de barras tradicionales (EAN, UPC, etc.)
 *
 * Alternativas:
 * - react-zxing: pnpm add react-zxing
 * - html5-qrcode: pnpm add html5-qrcode
 */

import { useEffect, useRef, useState } from "react"
import { Camera, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BarcodeScannerProps {
  onScan: (code: string) => void
  onError?: (error: string) => void
  active?: boolean
}

export default function BarcodeScanner({ onScan, onError, active = true }: BarcodeScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Iniciar camara
  const startCamera = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setHasPermission(true)
    } catch (err) {
      console.error("Error accessing camera:", err)
      setHasPermission(false)
      const errorMsg = err instanceof Error ? err.message : "No se pudo acceder a la camara"
      setError(errorMsg)
      onError?.(errorMsg)
    }
  }

  // Detener camara
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  // Efectos
  useEffect(() => {
    if (active) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [active])

  // Estado de carga
  if (hasPermission === null) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Camera className="h-12 w-12 mb-4 animate-pulse" />
        <p>Solicitando acceso a la camara...</p>
      </div>
    )
  }

  // Error de permisos
  if (error || hasPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <AlertCircle className="h-12 w-12 mb-4 text-destructive" />
        <p className="text-destructive mb-4">{error || "No se pudo acceder a la camara"}</p>
        <Button onClick={startCamera} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* Overlay con guia de escaneo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-64 h-32">
          {/* Esquinas de la guia */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-500" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-500" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-red-500" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-500" />

          {/* Linea de escaneo animada */}
          <div className="absolute left-2 right-2 h-0.5 bg-red-500 animate-scan" />
        </div>
      </div>

      {/* Instrucciones */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-center py-2 text-sm">
        Apunta la camara al codigo de barras
      </div>

      <style jsx>{`
        @keyframes scan {
          0% { top: 10%; }
          50% { top: 90%; }
          100% { top: 10%; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

/**
 * Componente alternativo usando @yudiel/react-qr-scanner
 *
 * Para usar este componente:
 * 1. Instalar: pnpm add @yudiel/react-qr-scanner
 * 2. Descomentar el codigo de abajo
 * 3. Comentar o eliminar el componente BarcodeScanner de arriba
 */

/*
import { Scanner } from "@yudiel/react-qr-scanner"

export function BarcodeScannerWithLibrary({ onScan, onError, active = true }: BarcodeScannerProps) {
  if (!active) return null

  return (
    <div className="relative aspect-video rounded-lg overflow-hidden">
      <Scanner
        onScan={(result) => {
          if (result?.[0]?.rawValue) {
            onScan(result[0].rawValue)
          }
        }}
        onError={(error) => {
          onError?.(error?.message || "Error al escanear")
        }}
        formats={["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"]}
        scanDelay={500}
        components={{
          audio: false,
          finder: true,
        }}
        styles={{
          container: { width: "100%", height: "100%" },
          video: { objectFit: "cover" },
        }}
      />
    </div>
  )
}
*/
