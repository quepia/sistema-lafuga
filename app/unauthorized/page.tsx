"use client"

import Link from "next/link"
import { ShieldAlert, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createBrowserClient } from "@supabase/ssr"

export default function UnauthorizedPage() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        window.location.href = "/login"
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#006AC0] to-[#FF1F8F] p-4">
            <Card className="w-full max-w-md shadow-2xl border-none">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-4">
                        <ShieldAlert className="h-8 w-8 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">Acceso Restringido</CardTitle>
                    <CardDescription className="text-gray-500">
                        Tu cuenta de Google ha sido autenticada, pero no tienes permisos para acceder al sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                        <p>
                            Este sistema utiliza una lista blanca de usuarios autorizados. Si necesitas acceso, por favor contacta al administrador del sistema.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Button
                            onClick={handleSignOut}
                            className="w-full bg-gray-900 hover:bg-gray-800"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Cerrar Sesión
                        </Button>

                        <Link href="/login" className="block">
                            <Button variant="ghost" className="w-full">
                                Volver al inicio
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
