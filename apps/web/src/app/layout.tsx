import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import { Providers } from './providers'
import { ServiceWorkerRegister } from './ServiceWorkerRegister'
import './globals.css'

export const metadata: Metadata = {
  title: 'AgroConnect',
  description: 'Integrated smart farming platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AgroConnect',
  },
  icons: {
    icon: ['/icon-192.png'],
    apple: ['/apple-touch-icon.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#1B5E20',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sw">
      <body>
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
