import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    // Hash the token
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const supabase = createAdminClient()

    // Look up the intake token
    const { data: link, error } = await supabase
      .from('intake_tokens')
      .select('*, clients(id, first_name, last_name, email)')
      .eq('token_hash', tokenHash)
      .eq('status', 'active')
      .single()

    if (error || !link) {
      return NextResponse.json({ error: 'Invalid or expired intake link' }, { status: 404 })
    }

    // Check if intake already exists
    const { data: existingIntake } = await supabase
      .from('client_intakes')
      .select('id, completed_at')
      .eq('client_id', link.clients.id)
      .single()

    return NextResponse.json({
      client: {
        id: link.clients.id,
        first_name: link.clients.first_name,
        last_name: link.clients.last_name,
        email: link.clients.email,
      },
      existing_intake: existingIntake || null,
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
