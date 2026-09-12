'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getAppAuthHeaders, getCurrentAppUser } from '@/lib/app-auth'

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>(); const router = useRouter(); const [message, setMessage] = useState('Prijímam pozvánku…')
  useEffect(() => { void (async () => { const user = await getCurrentAppUser(); if (!user) return router.replace(`/register?next=${encodeURIComponent(`/prijmout-pozvanku/${params.token}`)}`); const response = await fetch(`/api/team/invitations/${params.token}`, { method: 'POST', headers: await getAppAuthHeaders() }); if (response.ok) return router.replace('/dashboard'); const payload = await response.json(); setMessage(payload.error || 'Pozvánku sa nepodarilo prijať.') })() }, [params.token, router])
  return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-5 text-center"><Loader2 className="h-7 w-7 animate-spin text-[#2563EB]" /><p className="max-w-sm text-sm font-bold text-[#020617]">{message}</p></div>
}
