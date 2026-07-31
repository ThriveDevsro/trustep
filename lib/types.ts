export type RiskLevel = 'low' | 'medium' | 'high'
export type RequestStatus = 'pending' | 'approved' | 'rejected'
export type RequestSource = 'web' | 'email' | 'sms' | 'call' | 'image'
export type InboxProvider = 'gmail' | 'outlook' | 'imap'
export type InboxConnectionMethod = 'oauth' | 'imap' | 'forwarding'
export type InboxStatus = 'pending' | 'connected' | 'paused' | 'error'
export type AlertDeliveryStatus = 'sent' | 'failed'
export type AlertDeliveryChannel = 'slack' | 'teams'

export interface Company {
  id: string
  name: string
  approver_email: string
}

export interface Request {
  id: string
  company_id: string
  submitted_by: string
  text: string
  risk_level: RiskLevel
  reasons: string[]
  recommendation: string
  status: RequestStatus
  source: RequestSource
  phone_from?: string
  external_id?: string
  approver_token: string
  created_at: string
  companies?: Company
}

export interface AnalysisResult {
  riskLevel: RiskLevel
  reasons: string[]
  recommendation: string
}

export interface ConnectedInbox {
  id: string
  company_id: string
  provider: InboxProvider
  email_address: string
  display_name?: string | null
  connection_method: InboxConnectionMethod
  status: InboxStatus
  scan_mode: 'auto' | 'manual' | 'digest'
  imap_host?: string | null
  imap_port?: number | null
  imap_secure?: boolean | null
  last_checked_at?: string | null
  last_error?: string | null
  created_at: string
  updated_at: string
}

export interface AlertDelivery {
  id: string
  company_id?: string | null
  request_id?: string | null
  channel: AlertDeliveryChannel
  destination: string
  source: RequestSource
  risk_level: RiskLevel
  status: AlertDeliveryStatus
  submitted_by: string
  error_message?: string | null
  created_at: string
}
