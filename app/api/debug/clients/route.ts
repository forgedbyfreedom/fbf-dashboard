import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const adminSupabase = createAdminClient()

    const { data: clients, error } = await adminSupabase
      .from('clients')
      .select('id, first_name, last_name, email, is_active, last_weight')
      .eq('is_active', true)
      .order('last_name')

    return NextResponse.json({
      ok: true,
      count: clients?.length ?? 0,
      error: error?.message ?? null,
      clients: clients?.map(c => ({ name: `${c.first_name} ${c.last_name}`, email: c.email })) ?? [],
      key_prefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 15) ?? 'NOT SET',
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: message })
  }
}
