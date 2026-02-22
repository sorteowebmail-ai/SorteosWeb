import React from "react"
import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sorteosweb.com.ar"

export const metadata: Metadata = {
  title: 'SorteosWeb - Sorteos de Instagram Profesionales',
  description: 'La plataforma mas profesional para realizar sorteos en Instagram. Selecciona ganadores de comentarios y publicaciones de forma justa y transparente.',
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: 'SorteosWeb - Sorteos de Instagram Profesionales',
    description: 'Realiza sorteos de Instagram de forma justa, transparente y verificable.',
    url: siteUrl,
    siteName: 'SorteosWeb',
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'SorteosWeb - Sorteos de Instagram Profesionales',
    description: 'Realiza sorteos de Instagram de forma justa, transparente y verificable.',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
