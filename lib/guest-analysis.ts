import { NextRequest, NextResponse } from 'next/server'

export const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000001'
const GUEST_ANALYSIS_COOKIE = 'truststep_guest_analysis_used'

export function isGuestAnalysis(companyId?: string): boolean {
  return !companyId || companyId === DEMO_COMPANY_ID
}

export function hasUsedGuestAnalysis(req: NextRequest): boolean {
  return req.cookies.get(GUEST_ANALYSIS_COOKIE)?.value === 'true'
}

export function markGuestAnalysisUsed(response: NextResponse): NextResponse {
  response.cookies.set(GUEST_ANALYSIS_COOKIE, 'true', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })

  return response
}
