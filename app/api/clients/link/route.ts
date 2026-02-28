import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { client_id } = await request.json()
    if (!client_id) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Generate new magic link token
    const rawToken = crypto.randomUUID() + crypto.randomUUID()
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawToken))
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Revoke old links
    await adminSupabase
      .from('client_links')
      .update({ status: 'revoked' })
      .eq('client_id', client_id)
      .eq('status', 'active')

    // Insert new link
    const { error } = await adminSupabase.from('client_links').insert({
      client_id,
      token_hash: tokenHash,
    })

    if (error) {
      return NextResponse.json({ error: `Link creation failed: ${error.message}` }, { status: 500 })
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host') || 'localhost:3000'}`).trim().replace(/\/+$/, '')
    const checkinUrl = `${appUrl}/checkin/${rawToken}`

    return NextResponse.json({ checkin_url: checkinUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
