"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Search, LayoutDashboard, DollarSign, FileText, User, LogOut, X, ShoppingCart, Barcode, Shield, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/productos", label: "Consultar Precios", icon: Search },
  { href: "/ventas/nueva", label: "Nueva Venta", icon: ShoppingCart },
  { href: "/ventas/historial", label: "Historial Ventas", icon: FileText },
  { href: "/actualizacion-masiva", label: "Actualizar Precios", icon: DollarSign },
  { href: "/productos/escaner", label: "Asignar Codigos", icon: Barcode },
  { href: "/productos/historial", label: "Historial Productos", icon: Barcode },
  { href: "/productos/etiquetas", label: "Imprimir Etiquetas", icon: Tag },
  { href: "/reportes", label: "Reportes", icon: FileText },
]

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-[#006AC0] text-white transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo Area */}
          <div className="flex items-center justify-between border-b border-white/20 p-6">
            <Link href="/dashboard" className="flex items-center gap-3">
              <Image
                src="/LogoLaFuga.svg"
                alt="La Fuga"
                width={40}
                height={40}
                className="h-10 w-10"
              />
              <Image
                src="/TextoLaFugaCompleto.svg"
                alt="La Fuga"
                width={150}
                height={40}
                className="h-auto w-[150px]"
              />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white hover:bg-white/10"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2 p-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/20 text-white"
                      : "hover:bg-white/10 text-white/90"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}

            {/* Admin Section */}
            {user?.role === 'admin' && (
              <>
                <div className="my-2 border-t border-white/10" />
                <Link
                  href="/dashboard/settings/users"
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                    pathname === "/dashboard/settings/users"
                      ? "bg-white/20 text-white"
                      : "hover:bg-white/10 text-white/90"
                  )}
                >
                  <Shield className="h-5 w-5" />
                  Gestión Usuarios
                </Link>
              </>
            )}
          </nav>

          {/* User Profile */}
          <div className="border-t border-white/20 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-3 rounded-lg px-4 py-3">
              {user?.picture ? (
                <Image
                  src={user.picture}
                  alt={user.name}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <User className="h-4 w-4" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.name || "Usuario"}
                </p>
                <p className="text-xs text-white/70 truncate">
                  {user?.email || ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 hover:text-white hover:bg-white/10 shrink-0"
                onClick={logout}
                title="Cerrar sesion"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  )
}
