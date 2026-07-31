import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TrustStep',
    short_name: 'TrustStep',
    description: 'Zdieľajte podozrivý e-mail, text, link alebo screenshot do TrustStepu a získajte okamžitú analýzu rizika.',
    start_url: '/submit',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#0f766e',
    lang: 'sk',
    icons: [
      {
        src: '/image2.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    share_target: {
      action: '/api/share-target',
      method: 'post',
      enctype: 'multipart/form-data',
      title: 'shared_title',
      text: 'shared_text',
      url: 'shared_url',
      files: [
        {
          name: 'shared_file',
          accept: ['image/*', 'audio/*', '.mp3', '.wav', '.m4a', '.ogg', '.aac', '.webm'],
        },
      ],
    },
  }
}
