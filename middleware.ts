import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  // 1. Define aquí las rutas que quieres proteger
  // (Si alguien entra aquí sin login, lo echamos)
  const rutasProtegidas = ['/dashboard', '/productos', '/ventas', '/reportes']
  
  // Verificamos si la ruta actual empieza con alguna de las protegidas
  const esRutaProtegida = rutasProtegidas.some((ruta) => path.startsWith(ruta))

  // 2. Si es una ruta pública (login, api, imágenes), dejamos pasar sin hacer nada
  if (!esRutaProtegida) {
    return NextResponse.next()
  }

  // 3. Verificamos la sesión de forma segura
  // Usamos getToken que es compatible con el entorno Edge de Vercel
  const session = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET 
  })

  // 4. Si NO hay sesión y quiere entrar a algo protegido -> Al Login
  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    // Guardamos a dónde quería ir para redirigirlo después (opcional)
    url.searchParams.set('callbackUrl', path)
    return NextResponse.redirect(url)
  }

  // 5. Si hay sesión, adelante
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}