"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ArrowLeft, Menu, ShoppingCart, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import Sidebar from "@/components/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { SWRProvider } from "@/components/swr-provider"
import { cn } from "@/lib/utils"

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()
  const isSimpleSalesMode = pathname.startsWith("/ventas/simple")

  return (
    <SWRProvider>
      <div className="flex min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-muted">
        {!isSimpleSalesMode && (
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-hidden">
          {isSimpleSalesMode ? (
            <header className="border-b bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-brand-dark">Modo Venta</h2>
                  <p className="text-sm text-muted-foreground">
                    Pantalla simplificada para consultar precios y cobrar rapido.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {user?.picture ? (
                    <Image
                      src={user.picture}
                      alt={user.name}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#006AC0] text-white">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                  <Button asChild variant="outline">
                    <Link href="/dashboard">
                      <ArrowLeft className="h-4 w-4" />
                      Salir del modo venta
                    </Link>
                  </Button>
                </div>
              </div>
            </header>
          ) : (
            <header className="flex items-center justify-between border-b bg-white px-3 py-3 shadow-sm sm:px-6 sm:py-4">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden shrink-0"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-brand-dark truncate">
                    Sistema de Gestion de Precios
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Bienvenido, {user?.name?.split(" ")[0] || "Usuario"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button asChild variant="outline" className="hidden sm:inline-flex">
                  <Link href="/ventas/simple">
                    <ShoppingCart className="h-4 w-4" />
                    Modo Venta
                  </Link>
                </Button>
                {user?.picture ? (
                  <Image
                    src={user.picture}
                    alt={user.name}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-[#006AC0] flex items-center justify-center text-white">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            </header>
          )}

          {/* Content Area */}
          <div
            className={cn(
              "flex-1 overflow-auto",
              isSimpleSalesMode
                ? "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
                : "p-3 sm:p-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </SWRProvider>
  )
}
