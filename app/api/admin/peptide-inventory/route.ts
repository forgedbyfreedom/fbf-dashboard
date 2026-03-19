import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAdmin() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const adminSupabase = createAdminClient()
    const { data: membership } = await adminSupabase
      .from('org_members')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!membership || (membership.role !== 'org_admin' && membership.role !== 'coach')) return null
    return user
  } catch {
    return null
  }
}

// GET — List all inventory with low-stock alerts
export async function GET() {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminSupabase = createAdminClient()

  // Use RPC function to bypass schema cache
  const { data: inventory, error } = await adminSupabase.rpc('get_peptide_inventory')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get assigned peptide counts from active clients
  const { data: clients } = await adminSupabase
    .from('clients')
    .select('current_peptides')
    .eq('is_active', true)

  const assignedCounts: Record<string, number> = {}
  for (const c of clients || []) {
    const peptides = c.current_peptides as Array<{ name?: string }> | null
    if (Array.isArray(peptides)) {
      for (const p of peptides) {
        const name = (p.name || '').toUpperCase()
        if (name) assignedCounts[name] = (assignedCounts[name] || 0) + 1
      }
    }
  }

  const items = inventory || []
  const enriched = (Array.isArray(items) ? items : []).map((item: Record<string, unknown>) => ({
    ...item,
    low_stock: (item.quantity_on_hand as number) <= (item.reorder_threshold as number),
    out_of_stock: (item.quantity_on_hand as number) === 0,
    assigned_to_clients: assignedCounts[((item.peptide_name as string) || '').toUpperCase()] || 0,
  }))

  return NextResponse.json({
    inventory: enriched,
    recentLogs: [],
    summary: {
      total_items: enriched.length,
      low_stock: enriched.filter((i: Record<string, unknown>) => i.low_stock).length,
      out_of_stock: enriched.filter((i: Record<string, unknown>) => i.out_of_stock).length,
      total_value: enriched.reduce((sum: number, i: Record<string, unknown>) =>
        sum + ((i.quantity_on_hand as number) * ((i.wholesale_cost as number) || 0)), 0),
    },
  })
}

// POST — Add/update inventory item or log a transaction
export async function POST(request: NextRequest) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminSupabase = createAdminClient()
  const body = await request.json()
  const { action } = body

  try {
    switch (action) {
      case 'upsert_item': {
        const { peptide_name, size_label, quantity_on_hand, reorder_threshold, wholesale_cost, retail_price, supplier, notes } = body
        if (!peptide_name || !size_label) {
          return NextResponse.json({ error: 'peptide_name and size_label required' }, { status: 400 })
        }

        const { data, error } = await adminSupabase.rpc('upsert_peptide_inventory', {
          p_name: peptide_name,
          p_size: size_label,
          p_qty: quantity_on_hand ?? 0,
          p_threshold: reorder_threshold ?? 2,
          p_cost: wholesale_cost ? parseFloat(wholesale_cost) : null,
          p_retail: retail_price ? parseFloat(retail_price) : null,
          p_supplier: supplier || null,
          p_notes: notes || null,
        })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ item: data })
      }

      case 'log_transaction': {
        const { inventory_id, transaction_action, quantity, client_id, notes } = body
        if (!inventory_id || !transaction_action || quantity == null) {
          return NextResponse.json({ error: 'inventory_id, transaction_action, and quantity required' }, { status: 400 })
        }

        const { error } = await adminSupabase.rpc('log_peptide_transaction', {
          p_inventory_id: inventory_id,
          p_action: transaction_action,
          p_quantity: quantity,
          p_client_id: client_id || null,
          p_notes: notes || null,
          p_created_by: user.id,
        })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }

      case 'delete_item': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

        const { error } = await adminSupabase.rpc('delete_peptide_inventory', { p_id: id })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
