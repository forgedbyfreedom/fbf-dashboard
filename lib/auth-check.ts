import { NextRequest } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'

/**
 * Get authenticated user from request (Bearer token or cookie).
 */
export async function getUserFromRequest(request: NextRequest) {
  // Try Bearer token first (mobile app)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (user && !error) return user
  }

  // Fall back to cookie-based auth (web dashboard)
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Verify that the authenticated user has access to a specific client record.
 *
 * Access is granted if the user is:
 * 1. The client themselves (client.user_id matches auth user id)
 * 2. An org_admin or coach in the same organization as the client
 *
 * Returns { authorized: true } or { authorized: false, reason: string }
 */
export async function authorizeClientAccess(
  userId: string,
  clientId: string
): Promise<{ authorized: boolean; reason?: string }> {
  const adminSupabase = createAdminClient()

  // Check if user IS this client
  const { data: client } = await adminSupabase
    .from('clients')
    .select('user_id, organization_id')
    .eq('id', clientId)
    .single()

  if (!client) {
    return { authorized: false, reason: 'Client not found' }
  }

  // Self-access: client accessing their own data
  if (client.user_id === userId) {
    return { authorized: true }
  }

  // Check if user is org_admin or coach in the same organization
  const { data: membership } = await adminSupabase
    .from('org_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', client.organization_id)
    .single()

  if (membership && (membership.role === 'org_admin' || membership.role === 'coach')) {
    return { authorized: true }
  }

  return { authorized: false, reason: 'You do not have permission to access this client' }
}
