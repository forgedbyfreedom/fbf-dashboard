import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, authorizeClientAccess } from '@/lib/auth-check'
import { createAdminClient } from '@/lib/supabase/admin'

interface MealItem {
  meal?: string
  description?: string
  calories?: number | string
  protein?: number | string
  carbs?: number | string
  fats?: number | string
  items?: string[]
  [key: string]: unknown
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const auth = await authorizeClientAccess(user.id, id)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: 403 })
    }

    const adminSupabase = createAdminClient()
    const { data: client, error } = await adminSupabase
      .from('clients')
      .select('first_name, last_name, meal_plan, target_calories, target_protein, target_carbs, target_fats, program_name')
      .eq('id', id)
      .single()

    if (error || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const mealPlan = (client.meal_plan as MealItem[] | null) || []
    const clientName = `${client.first_name} ${client.last_name}`
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    let totalCalories = 0
    let totalProtein = 0
    let totalCarbs = 0
    let totalFats = 0

    const mealRows = mealPlan.map((meal, index) => {
      const cal = Number(meal.calories) || 0
      const pro = Number(meal.protein) || 0
      const carb = Number(meal.carbs) || 0
      const fat = Number(meal.fats) || 0
      totalCalories += cal
      totalProtein += pro
      totalCarbs += carb
      totalFats += fat

      return `
        <tr>
          <td class="meal-num">${index + 1}</td>
          <td class="meal-name">
            <strong>${escapeHtml(meal.meal || `Meal ${index + 1}`)}</strong>
            ${meal.description ? `<br><span class="meal-desc">${escapeHtml(meal.description)}</span>` : ''}
            ${meal.items ? `<br><span class="meal-desc">${meal.items.map(i => escapeHtml(i)).join(', ')}</span>` : ''}
          </td>
          <td class="macro">${cal || '—'}</td>
          <td class="macro">${pro || '—'}${pro ? 'g' : ''}</td>
          <td class="macro">${carb || '—'}${carb ? 'g' : ''}</td>
          <td class="macro">${fat || '—'}${fat ? 'g' : ''}</td>
        </tr>`
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meal Plan - ${escapeHtml(clientName)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', sans-serif;
      background: #0a0a0a;
      color: #ffffff;
      padding: 40px;
      max-width: 900px;
      margin: 0 auto;
    }

    @media print {
      body {
        background: #ffffff;
        color: #000000;
        padding: 20px;
      }
      .no-print { display: none !important; }
      .header { border-bottom-color: #FF6A00 !important; }
      .header h1 { color: #000 !important; }
      .header p { color: #666 !important; }
      .targets { background: #f5f5f5 !important; border-color: #ddd !important; }
      .targets span { color: #000 !important; }
      .targets .label { color: #666 !important; }
      table { border-color: #ddd !important; }
      th { background: #FF6A00 !important; color: #fff !important; }
      td { border-bottom-color: #eee !important; color: #000 !important; }
      .meal-desc { color: #666 !important; }
      .totals-row td { background: #f5f5f5 !important; color: #000 !important; border-top-color: #FF6A00 !important; }
      .target-row td { color: #666 !important; }
    }

    .header {
      border-bottom: 2px solid #FF6A00;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 24px;
      font-weight: 700;
      color: #FF6A00;
    }

    .header p {
      color: #888;
      font-size: 14px;
      margin-top: 4px;
    }

    .print-btn {
      display: inline-block;
      background: #FF6A00;
      color: #fff;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      margin-bottom: 24px;
    }

    .print-btn:hover { opacity: 0.9; }

    .targets {
      display: flex;
      gap: 24px;
      background: #141414;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 30px;
    }

    .targets div { text-align: center; flex: 1; }
    .targets .label { font-size: 11px; color: #555; text-transform: uppercase; }
    .targets span { font-size: 18px; font-weight: 700; display: block; margin-top: 2px; }

    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      overflow: hidden;
    }

    th {
      background: #FF6A00;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      padding: 12px 16px;
      text-align: left;
    }

    td {
      padding: 14px 16px;
      font-size: 14px;
      border-bottom: 1px solid #1a1a1a;
      vertical-align: top;
    }

    .meal-num {
      font-weight: 700;
      color: #FF6A00;
      width: 40px;
      text-align: center;
    }

    .meal-name { min-width: 250px; }

    .meal-desc {
      font-size: 12px;
      color: #888;
      line-height: 1.5;
    }

    .macro {
      text-align: center;
      font-weight: 500;
      width: 80px;
    }

    .totals-row td {
      background: #141414;
      font-weight: 700;
      border-top: 2px solid #FF6A00;
      font-size: 15px;
    }

    .target-row td {
      font-size: 12px;
      color: #555;
      padding: 8px 16px;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #2a2a2a;
      text-align: center;
      font-size: 11px;
      color: #555;
    }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print Meal Plan</button>

  <div class="header">
    <h1>Weekly Meal Plan</h1>
    <p>${escapeHtml(clientName)}${client.program_name ? ` &mdash; ${escapeHtml(client.program_name)}` : ''} &mdash; ${escapeHtml(today)}</p>
  </div>

  <div class="targets">
    <div>
      <p class="label">Daily Calories</p>
      <span>${client.target_calories ?? '—'}</span>
    </div>
    <div>
      <p class="label">Protein</p>
      <span>${client.target_protein ? client.target_protein + 'g' : '—'}</span>
    </div>
    <div>
      <p class="label">Carbs</p>
      <span>${client.target_carbs ? client.target_carbs + 'g' : '—'}</span>
    </div>
    <div>
      <p class="label">Fats</p>
      <span>${client.target_fats ? client.target_fats + 'g' : '—'}</span>
    </div>
  </div>

  ${mealPlan.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Meal</th>
        <th>Cal</th>
        <th>Protein</th>
        <th>Carbs</th>
        <th>Fats</th>
      </tr>
    </thead>
    <tbody>
      ${mealRows}
      <tr class="totals-row">
        <td></td>
        <td>Daily Total</td>
        <td class="macro">${totalCalories || '—'}</td>
        <td class="macro">${totalProtein ? totalProtein + 'g' : '—'}</td>
        <td class="macro">${totalCarbs ? totalCarbs + 'g' : '—'}</td>
        <td class="macro">${totalFats ? totalFats + 'g' : '—'}</td>
      </tr>
      <tr class="target-row">
        <td></td>
        <td>Target</td>
        <td class="macro">${client.target_calories ?? '—'}</td>
        <td class="macro">${client.target_protein ? client.target_protein + 'g' : '—'}</td>
        <td class="macro">${client.target_carbs ? client.target_carbs + 'g' : '—'}</td>
        <td class="macro">${client.target_fats ? client.target_fats + 'g' : '—'}</td>
      </tr>
    </tbody>
  </table>
  ` : `<p style="color: #555; text-align: center; padding: 40px 0;">No meal plan configured for this client.</p>`}

  <div class="footer">
    <p>Forged by Freedom Coaching &mdash; forgedbyfreedom.com</p>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (err) {
    console.error('Meal plan export error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
