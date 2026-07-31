'use client'

import { useEffect } from 'react'

export function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('[pwa-register]', error)
    })
  }, [])

  return null
}
