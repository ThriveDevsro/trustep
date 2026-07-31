import { createServiceClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { CheckCircle2, XCircle, Shield } from 'lucide-react'
import Link from 'next/link'

async function processApproval(token: string, action: string) {
  const supabase = createServiceClient()
  if (!supabase) return null

  const { data: request } = await supabase
    .from('requests')
    .select('id, status, risk_level, submitted_by')
    .eq('approver_token', token)
    .single()

  if (!request) return null

  // Only update if still pending
  if (request.status === 'pending' && (action === 'approve' || action === 'reject')) {
    await supabase
      .from('requests')
      .update({ status: action === 'approve' ? 'approved' : 'rejected' })
      .eq('approver_token', token)
    return { ...request, status: action === 'approve' ? 'approved' : 'rejected', action }
  }

  return { ...request, action: request.status }
}

export default async function ApprovePage({
  params,
  searchParams,
}: {
  params: { token: string }
  searchParams: { action?: string }
}) {
  const action = searchParams.action ?? ''
  const result = await processApproval(params.token, action)

  if (!result) notFound()

  const approved = result.status === 'approved'
  const rejected = result.status === 'rejected'

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-teal-500 selection:text-white">
      <main className="max-w-lg mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-10">
          {approved ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-green-200">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-3 tracking-tight">Akcia povolená</h1>
              <p className="text-gray-500 font-medium mb-8">
                Operácia, ktorú hlásil zamestnanec <strong className="text-gray-900">{result.submitted_by}</strong>, bola úspešne schválená. Systém zapísal súhlas do bezpečnostného logu.
              </p>
            </>
          ) : rejected ? (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-red-200">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-3 tracking-tight">Platba / akcia zamietnutá</h1>
              <p className="text-gray-500 font-medium mb-8">
                Zablokovali ste žiadosť od <strong className="text-gray-900">{result.submitted_by}</strong>. Peniaze a údaje vašej firmy sú chránené.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-teal-200">
                <Shield className="w-8 h-8 text-teal-700" />
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-3 tracking-tight">Neplatný alebo starý odkaz</h1>
              <p className="text-gray-500 font-medium mb-8">Tento odkaz neexistuje alebo už bola bezpečnostná žiadosť dávno vyriešená.</p>
            </>
          )}

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-8 py-3.5 rounded-xl font-bold shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] transition-all"
          >
            Späť do Dashboardu
          </Link>
        </div>
      </main>
    </div>
  )
}
