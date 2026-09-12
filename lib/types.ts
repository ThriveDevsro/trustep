export type RiskLevel = 'low' | 'medium' | 'high'
export type IdentityVerificationStatus = 'VERIFIED' | 'IDENTITY_NOT_VERIFIED' | 'DETAILS_CHANGED' | 'STOP_AND_VERIFY'
export type RequestStatus = 'pending' | 'approved' | 'rejected'
export type AnalysisFeedback = 'confirmed_fraud' | 'false_positive'
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
  feedback?: AnalysisFeedback | null
  source: RequestSource
  phone_from?: string
  external_id?: string
  approver_token: string
  created_at: string
  companies?: Company
  trusted_identity_id?: string | null
  identity_status?: IdentityVerificationStatus | null
  identity_comparison?: Pick<VerificationResult, 'status' | 'messageDetails' | 'trustedDetails' | 'comparisonSummary' | 'detailComparisons'> | null
}

export interface AnalysisResult {
  riskLevel: RiskLevel
  reasons: string[]
  recommendation: string
}

export interface VerificationResult {
  status: IdentityVerificationStatus
  claimedIdentity: string
  requestedAction: string
  messageDetails: Array<{ kind: 'email' | 'phone' | 'iban' | 'domain'; value: string }>
  trustedDetails: Array<{ kind: 'email' | 'phone' | 'iban' | 'domain'; value: string }>
  comparisonSummary: string
  detailComparisons: Array<{ kind: 'email' | 'phone' | 'iban' | 'domain'; trustedValue: string; observedValue: string; status: 'match' | 'changed' }>
  safeActions: Array<{ kind: 'email' | 'phone' | 'domain'; value: string }>
  verificationMethod: string
}

export interface TrustedIdentity {
  id: string
  company_id: string
  label: string
  email?: string | null
  phone?: string | null
  domain?: string | null
  iban?: string | null
  created_at: string
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
