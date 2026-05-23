import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Chez les Giros',
    short_name: 'Les Giros',
    description: 'Organisation de la maison pour la famille',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFF8F0',
    theme_color: '#D4603A',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
