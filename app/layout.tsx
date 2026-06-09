import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AccessoryShop — Admin Panel',
  description: 'ტელეფონის აქსესუარების მაღაზიის სამართავი სისტემა',
}

export const viewport = {
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" className={`${plusJakarta.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
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
