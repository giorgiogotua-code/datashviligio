import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { PwaRegister } from '@/components/pwa-register'

const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AccessoryShop POS',
  description: 'ტელეფონის აქსესუარების მაღაზიის სამართავი სისტემა',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'POS',
  },
}

export const viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" className={`${plusJakarta.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        <PwaRegister />
        {children}
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: { fontFamily: 'var(--font-plus-jakarta), system-ui, sans-serif', borderRadius: '0.875rem' },
          }}
        />
      </body>
    </html>
  )
}
