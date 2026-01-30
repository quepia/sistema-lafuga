"use client"

import { CompraForm } from "@/components/inventario/CompraForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function NuevaCompraPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nueva Compra</h1>
      <CompraForm />
    </div>
  )
}
