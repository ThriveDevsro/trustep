export type AppUser = {
  id: string
  email: string
  provider: 'local' | 'supabase'
}

export type RiskLevel = 'low' | 'medium' | 'high'
export type RequestSource = 'email' | 'web' | 'call' | 'sms' | 'image'
export type RequestStatus = 'pending' | 'approved' | 'rejected'

export type SecurityRequest = {
  id: string
  submitted_by: string
  text: string
  risk_level: RiskLevel
  status: RequestStatus
  source: RequestSource
  phone_from?: string
  created_at: string
}

export type AnalysisResult = {
  id: string | null
  riskLevel: RiskLevel
  reasons: string[]
  recommendation: string
  extractedText?: string
  hostname?: string
  title?: string
  transcription?: string
}

export type ConnectedInbox = {
  id: string
  company_id: string
  provider: 'gmail' | 'outlook' | 'imap'
  email_address: string
  display_name: string | null
  status: 'pending' | 'connected' | 'paused' | 'error'
  scan_mode: 'auto' | 'manual' | 'digest'
  last_checked_at: string | null
  last_error: string | null
}
