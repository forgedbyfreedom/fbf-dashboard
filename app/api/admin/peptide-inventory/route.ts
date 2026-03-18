import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAdmin(request: NextRequest) {
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
}

// GET — List all inventory with low-stock alerts
export async function GET(request: NextRequest) {
  const user = await verifyAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminSupabase = createAdminClient()

  const { data: inventory, error } = await adminSupabase
    .from('peptide_inventory')
    .select('*')
    .order('peptide_name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get recent log entries
  const { data: recentLogs } = await adminSupabase
    .from('peptide_inventory_log')
    .select('*, clients(first_name, last_name)')
    .order('created_at', { ascending: false })
    .limit(50)

  // Get assigned peptide counts per peptide from active clients
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

  // Mark low stock items
  const enriched = (inventory || []).map(item => ({
    ...item,
    low_stock: item.quantity_on_hand <= item.reorder_threshold,
    out_of_stock: item.quantity_on_hand === 0,
    assigned_to_clients: assignedCounts[item.peptide_name.toUpperCase()] || 0,
  }))

  return NextResponse.json({
    inventory: enriched,
    recentLogs: recentLogs || [],
    summary: {
      total_items: enriched.length,
      low_stock: enriched.filter(i => i.low_stock).length,
      out_of_stock: enriched.filter(i => i.out_of_stock).length,
      total_value: enriched.reduce((sum, i) => sum + (i.quantity_on_hand * (i.wholesale_cost || 0)), 0),
    },
  })
}

// POST — Add/update inventory item or log a transaction
export async function POST(request: NextRequest) {
  const user = await verifyAdmin(request)
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

        const { data, error } = await adminSupabase
          .from('peptide_inventory')
          .upsert({
            peptide_name,
            size_label,
            quantity_on_hand: quantity_on_hand ?? 0,
            reorder_threshold: reorder_threshold ?? 2,
            wholesale_cost: wholesale_cost ?? null,
            retail_price: retail_price ?? null,
            supplier: supplier ?? null,
            notes: notes ?? null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'peptide_name,size_label' })
          .select()
          .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ item: data })
      }

      case 'log_transaction': {
        const { inventory_id, transaction_action, quantity, client_id, notes } = body
        if (!inventory_id || !transaction_action || quantity == null) {
          return NextResponse.json({ error: 'inventory_id, transaction_action, and quantity required' }, { status: 400 })
        }

        // Log the transaction
        const { error: logError } = await adminSupabase
          .from('peptide_inventory_log')
          .insert({
            inventory_id,
            action: transaction_action,
            quantity,
            client_id: client_id || null,
            notes: notes || null,
            created_by: user.id,
          })

        if (logError) return NextResponse.json({ error: logError.message }, { status: 500 })

        // Update quantity on hand
        const { data: current } = await adminSupabase
          .from('peptide_inventory')
          .select('quantity_on_hand')
          .eq('id', inventory_id)
          .single()

        if (current) {
          const newQty = Math.max(0, current.quantity_on_hand + quantity)
          await adminSupabase
            .from('peptide_inventory')
            .update({ quantity_on_hand: newQty, updated_at: new Date().toISOString() })
            .eq('id', inventory_id)
        }

        return NextResponse.json({ success: true })
      }

      case 'delete_item': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const { error } = await adminSupabase.from('peptide_inventory').delete().eq('id', id)
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
