import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AccessoryShop POS',
    short_name: 'POS',
    description: 'ტელეფონის აქსესუარების მაღაზიის სამართავი სისტემა',
    start_url: '/pos',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f8f9ff',
    theme_color: '#6366f1',
    categories: ['business', 'finance'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
