import { withAuth } from "next-auth/middleware"

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  // Forzamos a que lea la secret, por si el entorno automático falla
  secret: process.env.NEXTAUTH_SECRET,
})

export const config = {
  matcher: [
    // Protegemos todo MENOS: api, archivos estáticos, imágenes y favicon
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}