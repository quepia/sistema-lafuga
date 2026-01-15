import { withAuth } from "next-auth/middleware"

export default withAuth({
  // Si necesitas personalizar algo, va aquí. 
  // Por defecto, esto protege todas las rutas que coincidan con el matcher.
})

export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas de solicitud excepto las que comienzan con:
     * - api (rutas API, incluyendo tu backend Python)
     * - _next/static (archivos estáticos)
     * - _next/image (archivos de optimización de imágenes)
     * - favicon.ico (archivo favicon)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}