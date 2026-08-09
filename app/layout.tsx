import type React from "react"
import type { Metadata, Viewport } from "next"
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
  applicationName: "La Fuga",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "La Fuga",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/LogoLaFuga.svg",
    apple: {
      url: "/apple-icon.png",
      sizes: "180x180",
      type: "image/png",
    },
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#006AC0",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="overflow-x-hidden">
      <body
        className={`${montserrat.variable} font-sans antialiased max-w-[100vw] overflow-x-hidden`}
        style={{ backgroundColor: "#006AC0" }}
      >
        <Providers>
          {children}
        </Providers>
        <Toaster position="top-right" richColors />
        <Analytics />
      </body>
    </html>
  )
}
