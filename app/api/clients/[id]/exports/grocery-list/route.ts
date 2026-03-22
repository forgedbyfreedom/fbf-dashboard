import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, authorizeClientAccess } from '@/lib/auth-check'
import { createAdminClient } from '@/lib/supabase/admin'

interface MealItem {
  meal?: string
  description?: string
  calories?: number
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

function extractGroceryItems(mealPlan: MealItem[]): Map<string, Set<string>> {
  const categories = new Map<string, Set<string>>()

  const categoryMap: Record<string, string> = {
    chicken: 'Protein',
    turkey: 'Protein',
    beef: 'Protein',
    steak: 'Protein',
    salmon: 'Protein',
    fish: 'Protein',
    shrimp: 'Protein',
    tuna: 'Protein',
    egg: 'Protein',
    eggs: 'Protein',
    whey: 'Protein',
    protein: 'Protein',
    'greek yogurt': 'Dairy',
    yogurt: 'Dairy',
    cheese: 'Dairy',
    milk: 'Dairy',
    butter: 'Dairy',
    cream: 'Dairy',
    rice: 'Grains & Carbs',
    oats: 'Grains & Carbs',
    oatmeal: 'Grains & Carbs',
    bread: 'Grains & Carbs',
    pasta: 'Grains & Carbs',
    tortilla: 'Grains & Carbs',
    potato: 'Grains & Carbs',
    'sweet potato': 'Grains & Carbs',
    quinoa: 'Grains & Carbs',
    broccoli: 'Vegetables',
    spinach: 'Vegetables',
    asparagus: 'Vegetables',
    pepper: 'Vegetables',
    onion: 'Vegetables',
    tomato: 'Vegetables',
    lettuce: 'Vegetables',
    avocado: 'Vegetables',
    cucumber: 'Vegetables',
    zucchini: 'Vegetables',
    mushroom: 'Vegetables',
    banana: 'Fruits',
    apple: 'Fruits',
    berries: 'Fruits',
    blueberries: 'Fruits',
    strawberries: 'Fruits',
    orange: 'Fruits',
    'olive oil': 'Oils & Fats',
    'coconut oil': 'Oils & Fats',
    'almond butter': 'Oils & Fats',
    'peanut butter': 'Oils & Fats',
    nuts: 'Oils & Fats',
    almonds: 'Oils & Fats',
  }

  for (const meal of mealPlan) {
    const text = [meal.description, meal.meal, ...(meal.items || [])].filter(Boolean).join(' ').toLowerCase()
    const words = text.split(/[,;.\n]+/).map(w => w.trim()).filter(Boolean)

    for (const phrase of words) {
      let categorized = false
      for (const [keyword, category] of Object.entries(categoryMap)) {
        if (phrase.includes(keyword)) {
          if (!categories.has(category)) categories.set(category, new Set())
          categories.get(category)!.add(phrase.trim())
          categorized = true
          break
        }
      }
      if (!categorized && phrase.length > 2) {
        if (!categories.has('Other')) categories.set('Other', new Set())
        categories.get('Other')!.add(phrase.trim())
      }
    }
  }

  return categories
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
      .select('first_name, last_name, meal_plan, target_calories, target_protein, target_carbs, target_fats')
      .eq('id', id)
      .single()

    if (error || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const mealPlan = (client.meal_plan as MealItem[] | null) || []
    const clientName = `${client.first_name} ${client.last_name}`
    const groceryItems = extractGroceryItems(mealPlan)
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    let categorySections = ''
    const categoryOrder = ['Protein', 'Dairy', 'Grains & Carbs', 'Vegetables', 'Fruits', 'Oils & Fats', 'Other']
    for (const cat of categoryOrder) {
      const items = groceryItems.get(cat)
      if (!items || items.size === 0) continue
      categorySections += `
        <div class="category">
          <h3>${escapeHtml(cat)}</h3>
          <ul>
            ${Array.from(items).map(item => `<li><span class="checkbox"></span>${escapeHtml(item)}</li>`).join('\n            ')}
          </ul>
        </div>`
    }

    if (!categorySections) {
      categorySections = `
        <div class="category">
          <h3>Meal Plan Items</h3>
          <ul>
            ${mealPlan.map(m => `<li><span class="checkbox"></span>${escapeHtml(m.description || m.meal || 'Item')}</li>`).join('\n            ')}
          </ul>
        </div>`
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Grocery List - ${escapeHtml(clientName)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', sans-serif;
      background: #0a0a0a;
      color: #ffffff;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }

    @media print {
      body {
        background: #ffffff;
        color: #000000;
        padding: 20px;
      }
      .no-print { display: none !important; }
      .category { break-inside: avoid; }
      .category h3 { color: #FF6A00 !important; border-bottom-color: #FF6A00 !important; }
      .checkbox { border-color: #333 !important; }
      .header { border-bottom-color: #FF6A00 !important; }
      .header h1 { color: #000 !important; }
      .header p { color: #666 !important; }
      .targets { background: #f5f5f5 !important; border-color: #ddd !important; }
      .targets span { color: #000 !important; }
      .targets .label { color: #666 !important; }
      li { color: #000 !important; border-bottom-color: #eee !important; }
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

    .category {
      margin-bottom: 24px;
    }

    .category h3 {
      font-size: 16px;
      font-weight: 600;
      color: #FF6A00;
      border-bottom: 1px solid #2a2a2a;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }

    ul { list-style: none; }

    li {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      font-size: 14px;
      color: #ccc;
      border-bottom: 1px solid #1a1a1a;
    }

    li:last-child { border-bottom: none; }

    .checkbox {
      display: inline-block;
      width: 18px;
      height: 18px;
      border: 2px solid #555;
      border-radius: 4px;
      flex-shrink: 0;
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
  <button class="print-btn no-print" onclick="window.print()">Print Grocery List</button>

  <div class="header">
    <h1>Weekly Grocery List</h1>
    <p>${escapeHtml(clientName)} &mdash; ${escapeHtml(today)}</p>
  </div>

  <div class="targets">
    <div>
      <p class="label">Calories</p>
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

  ${categorySections}

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
    console.error('Grocery list export error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
