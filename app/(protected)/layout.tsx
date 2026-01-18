"use client"

import { useState } from "react"
import Image from "next/image"
import { Menu, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import Sidebar from "@/components/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { SWRProvider } from "@/components/swr-provider"

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  return (
    <SWRProvider>
      <div className="flex h-screen w-full max-w-[100vw] overflow-x-hidden bg-muted">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-hidden">
          {/* Header */}
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

          {/* Content Area */}
          <div className="h-[calc(100vh-65px)] sm:h-[calc(100vh-73px)] overflow-auto p-3 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </SWRProvider>
  )
}
