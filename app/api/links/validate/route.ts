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

    // Look up the link
    const { data: link, error } = await supabase
      .from('client_links')
      .select('*, clients(*)')
      .eq('token_hash', tokenHash)
      .eq('status', 'active')
      .single()

    if (error || !link) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    // Update last_used_at
    await supabase
      .from('client_links')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', link.id)

    return NextResponse.json({
      client: {
        id: link.clients.id,
        first_name: link.clients.first_name,
        last_name: link.clients.last_name,
        target_calories: link.clients.target_calories,
        target_protein: link.clients.target_protein,
        target_steps: link.clients.target_steps,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
