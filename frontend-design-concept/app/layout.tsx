import type React from "react"
import type { Metadata } from "next/font/google"
import { Montserrat } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import { Providers } from "@/components/providers"
import "./globals.css"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
})

export const metadata: Metadata = {
  title: "Sistema de Gestion - La Fuga",
  description: "Plataforma de administracion y ventas",
  icons: {
    icon: "/LogoLaFuga.svg",
    apple: "/LogoLaFuga.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="overflow-x-hidden">
      <body className={`${montserrat.variable} font-sans antialiased max-w-[100vw] overflow-x-hidden`}>
        <Providers>
          {children}
        </Providers>
        <Toaster position="top-right" richColors />
        <Analytics />
      </body>
    </html>
  )
}
