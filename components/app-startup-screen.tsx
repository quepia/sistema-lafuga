"use client"

import Image from "next/image"
import { AlertCircle, LoaderCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AppStartupScreenProps {
  message?: string
  error?: string | null
  onRetry?: () => void
}

export function AppStartupScreen({
  message = "Preparando el sistema...",
  error,
  onRetry,
}: AppStartupScreenProps) {
  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center p-6"
      style={{
        background: "linear-gradient(135deg, #006AC0 0%, #006AC0 45%, #FF1F8F 100%)",
      }}
    >
      <div className="w-full max-w-sm rounded-3xl bg-white/95 p-7 text-center shadow-2xl backdrop-blur">
        <Image
          src="/TextoLaFugaCompleto.svg"
          alt="La Fuga"
          width={256}
          height={80}
          priority
          className="mx-auto h-auto w-56"
        />

        {error ? (
          <div className="mt-7 space-y-5" role="alert">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">No pudimos iniciar el sistema</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">{error}</p>
            </div>
            {onRetry && (
              <Button onClick={onRetry} className="w-full bg-[#006AC0] hover:bg-[#005a9e]">
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-8 space-y-4" role="status" aria-live="polite">
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[#006AC0]" />
            <p className="text-sm font-medium text-slate-600">{message}</p>
          </div>
        )}
      </div>
    </div>
  )
}
