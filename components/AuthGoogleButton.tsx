'use client'

import { Loader2 } from 'lucide-react'

interface AuthGoogleButtonProps {
  loading: boolean
  onClick: () => void
  label: string
}

export function AuthGoogleButton({ loading, onClick, label }: AuthGoogleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="relative flex h-14 w-full items-center justify-center border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#FF4F00]/20 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute left-5 h-5 w-5">
          <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.25c1.9-1.75 2.97-4.33 2.97-7.39Z" />
          <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.38l-3.25-2.53c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.03v2.61A10 10 0 0 0 12 22Z" />
          <path fill="#FBBC05" d="M6.39 13.92A6.03 6.03 0 0 1 6.07 12c0-.67.12-1.32.32-1.92V7.47H3.03A10 10 0 0 0 2 12c0 1.61.39 3.14 1.03 4.53l3.36-2.61Z" />
          <path fill="#EA4335" d="M12 5.95c1.47 0 2.78.5 3.82 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.97 5.47l3.36 2.61C7.18 7.71 9.39 5.95 12 5.95Z" />
        </svg>
      )}
      {label}
    </button>
  )
}

export function AuthMicrosoftButton({ loading, onClick, label }: AuthGoogleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="relative flex h-14 w-full items-center justify-center border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#FF4F00]/20 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <svg aria-hidden="true" viewBox="0 0 23 23" className="absolute left-5 h-5 w-5">
          <path fill="#F25022" d="M1 1h10v10H1z" />
          <path fill="#7FBA00" d="M12 1h10v10H12z" />
          <path fill="#00A4EF" d="M1 12h10v10H1z" />
          <path fill="#FFB900" d="M12 12h10v10H12z" />
        </svg>
      )}
      {label}
    </button>
  )
}
