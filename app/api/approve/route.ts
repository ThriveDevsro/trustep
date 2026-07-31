import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { token, action } = await req.json()

    if (!token || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase service client is not configured' }, { status: 503 })
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    const { error } = await supabase
      .from('requests')
      .update({ status: newStatus })
      .eq('approver_token', token)
      .eq('status', 'pending')

    if (error) throw error

    return NextResponse.json({ success: true, status: newStatus })
  } catch (err) {
    console.error('Approve error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
