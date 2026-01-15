"use client"

import { useState } from "react"
import { Search, LayoutDashboard, DollarSign, FileText, User, LogOut, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DashboardView from "@/components/dashboard-view"
import PriceConsultationView from "@/components/price-consultation-view"
import MassUpdateView from "@/components/mass-update-view"

export default function PriceManagementSystem() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen w-full max-w-[100vw] overflow-x-hidden bg-muted">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-[#006AC0] text-white transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo Area */}
          <div className="flex items-center justify-between border-b border-white/20 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 font-bold italic text-white">
                LF
              </div>
              <div>
                <h1 className="text-xl font-bold">LA FUGA</h1>
                <p className="text-xs text-white/80">VENTAS POR MAYOR Y MENOR</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white hover:bg-white/10"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2 p-4">
            <a
              href="#dashboard"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-white/10"
            >
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </a>
            <a
              href="#consulta"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-white/10"
            >
              <Search className="h-5 w-5" />
              Consultar Precios
            </a>
            <a
              href="#actualizar"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-white/10"
            >
              <DollarSign className="h-5 w-5" />
              Actualizar Precios
            </a>
            <a
              href="#reportes"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-white/10"
            >
              <FileText className="h-5 w-5" />
              Reportes
            </a>
          </nav>

          {/* User Profile */}
          <div className="border-t border-white/20 p-4">
            <div className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-white/10">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Usuario Admin</p>
                <p className="text-xs text-white/70">admin@lafuga.com</p>
              </div>
              <LogOut className="h-4 w-4 cursor-pointer" />
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b bg-white px-3 py-3 shadow-sm sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-brand-dark truncate">Sistema de Gestión de Precios</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Bienvenido, Usuario</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-8 w-8 rounded-full bg-[#006AC0] flex items-center justify-center text-white font-bold text-sm">
              U
            </div>
          </div>
        </header>

        {/* Content Area with Tabs */}
        <div className="h-[calc(100vh-65px)] sm:h-[calc(100vh-73px)] overflow-auto p-3 sm:p-6">
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="mb-4 sm:mb-6 w-full flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="dashboard" className="gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none px-2 sm:px-3">
                <LayoutDashboard className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Dashboard</span>
                <span className="xs:hidden">Inicio</span>
              </TabsTrigger>
              <TabsTrigger value="consulta" className="gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none px-2 sm:px-3">
                <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Consulta de Precios</span>
                <span className="sm:hidden">Consulta</span>
              </TabsTrigger>
              <TabsTrigger value="actualizar" className="gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none px-2 sm:px-3">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Actualización Masiva</span>
                <span className="sm:hidden">Masiva</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-0">
              <DashboardView />
            </TabsContent>

            <TabsContent value="consulta" className="mt-0">
              <PriceConsultationView />
            </TabsContent>

            <TabsContent value="actualizar" className="mt-0">
              <MassUpdateView />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
