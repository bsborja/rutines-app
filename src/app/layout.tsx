import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SessionProvider } from '@/context/SessionContext'

export const metadata: Metadata = {
  title: 'Rutines ⭐',
  description: "Gestiona les rutines diàries de les nenes i gamifica el seu comportament positiu",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Rutines',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#58CC02',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ca">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
