"use client"

import { useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setToken } = useAuth()
  const processedRef = useRef(false)

  useEffect(() => {
    // Evitar ejecuciones múltiples
    if (processedRef.current) return

    const token = searchParams.get("token")

    if (token) {
      processedRef.current = true

      // Esperar a que el usuario se cargue antes de redirigir
      const handleAuth = async () => {
        const success = await setToken(token)
        if (success) {
          router.push("/dashboard")
        } else {
          router.push("/login?error=auth_failed")
        }
      }

      handleAuth()
    } else {
      router.push("/login")
    }
  }, [searchParams, setToken, router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#006AC0] to-[#FF1F8F]">
      <Loader2 className="h-12 w-12 animate-spin text-white mb-4" />
      <p className="text-white text-lg">Autenticando...</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#006AC0] to-[#FF1F8F]">
          <Loader2 className="h-12 w-12 animate-spin text-white mb-4" />
          <p className="text-white text-lg">Cargando...</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}
