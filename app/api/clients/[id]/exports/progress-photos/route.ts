import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, authorizeClientAccess } from '@/lib/auth-check'
import { createAdminClient } from '@/lib/supabase/admin'

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

    const { data: client } = await adminSupabase
      .from('clients')
      .select('first_name, last_name')
      .eq('id', id)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const { data: checkins, error } = await adminSupabase
      .from('checkins')
      .select('id, date, weight_lbs, progress_photo_urls')
      .eq('client_id', id)
      .not('progress_photo_urls', 'is', null)
      .order('date', { ascending: false })
      .limit(52)

    if (error) {
      console.error('Checkins query error:', error)
      return NextResponse.json({ error: 'Failed to fetch check-ins' }, { status: 500 })
    }

    const photoCheckins = (checkins || []).filter(
      c => c.progress_photo_urls && Array.isArray(c.progress_photo_urls) && c.progress_photo_urls.length > 0
    )

    const clientName = `${client.first_name} ${client.last_name}`
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    let photoSections = ''
    if (photoCheckins.length === 0) {
      photoSections = '<p class="empty">No progress photos found for this client.</p>'
    } else {
      photoSections = photoCheckins.map(c => {
        const dateStr = new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
        const photos = (c.progress_photo_urls as string[]).map(
          url => `<img src="${escapeHtml(url)}" alt="Progress photo" />`
        ).join('')

        return `
        <div class="week-entry">
          <div class="week-header">
            <h3>${escapeHtml(dateStr)}</h3>
            ${c.weight_lbs ? `<span class="weight">${c.weight_lbs} lbs</span>` : ''}
          </div>
          <div class="photos">
            ${photos}
          </div>
        </div>`
      }).join('')

      // Add side-by-side comparison if we have at least 2 entries
      if (photoCheckins.length >= 2) {
        const first = photoCheckins[photoCheckins.length - 1]
        const latest = photoCheckins[0]
        const firstDate = new Date(first.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        const latestDate = new Date(latest.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        const firstPhoto = (first.progress_photo_urls as string[])[0]
        const latestPhoto = (latest.progress_photo_urls as string[])[0]
        const weightDiff = first.weight_lbs && latest.weight_lbs
          ? (latest.weight_lbs - first.weight_lbs).toFixed(1)
          : null

        photoSections = `
        <div class="comparison">
          <h2>Transformation Comparison</h2>
          <div class="compare-grid">
            <div class="compare-col">
              <p class="compare-date">${escapeHtml(firstDate)}</p>
              <img src="${escapeHtml(firstPhoto)}" alt="First photo" />
              ${first.weight_lbs ? `<p class="compare-weight">${first.weight_lbs} lbs</p>` : ''}
            </div>
            <div class="compare-arrow">
              <span>${weightDiff ? (Number(weightDiff) > 0 ? '+' : '') + weightDiff + ' lbs' : ''}</span>
            </div>
            <div class="compare-col">
              <p class="compare-date">${escapeHtml(latestDate)}</p>
              <img src="${escapeHtml(latestPhoto)}" alt="Latest photo" />
              ${latest.weight_lbs ? `<p class="compare-weight">${latest.weight_lbs} lbs</p>` : ''}
            </div>
          </div>
        </div>
        <h2 class="section-title">All Progress Photos</h2>
        ` + photoSections
      }
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Progress Photos - ${escapeHtml(clientName)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', sans-serif;
      background: #0a0a0a;
      color: #ffffff;
      padding: 40px;
      max-width: 1000px;
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
      .week-entry { break-inside: avoid; }
      .week-header h3 { color: #000 !important; }
      .weight { color: #FF6A00 !important; }
      .comparison { background: #f5f5f5 !important; border-color: #ddd !important; }
      .comparison h2 { color: #000 !important; }
      .compare-date { color: #666 !important; }
      .compare-weight { color: #000 !important; }
      .compare-arrow span { color: #FF6A00 !important; }
      .section-title { color: #000 !important; }
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

    .comparison {
      background: #141414;
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 30px;
    }

    .comparison h2 {
      font-size: 18px;
      font-weight: 700;
      color: #FF6A00;
      margin-bottom: 20px;
      text-align: center;
    }

    .compare-grid {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
    }

    .compare-col {
      text-align: center;
      flex: 1;
      max-width: 350px;
    }

    .compare-col img {
      width: 100%;
      max-height: 400px;
      object-fit: cover;
      border-radius: 8px;
      border: 2px solid #2a2a2a;
    }

    .compare-date {
      font-size: 14px;
      color: #888;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .compare-weight {
      font-size: 16px;
      font-weight: 700;
      margin-top: 8px;
    }

    .compare-arrow {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 0 10px;
    }

    .compare-arrow span {
      font-size: 16px;
      font-weight: 700;
      color: #FF6A00;
    }

    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #888;
      margin-bottom: 20px;
    }

    .week-entry {
      margin-bottom: 24px;
      border-bottom: 1px solid #1a1a1a;
      padding-bottom: 20px;
    }

    .week-entry:last-child { border-bottom: none; }

    .week-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .week-header h3 {
      font-size: 15px;
      font-weight: 600;
      color: #ccc;
    }

    .weight {
      font-size: 14px;
      font-weight: 700;
      color: #FF6A00;
    }

    .photos {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .photos img {
      width: 200px;
      height: 250px;
      object-fit: cover;
      border-radius: 8px;
      border: 2px solid #2a2a2a;
    }

    .empty {
      color: #555;
      text-align: center;
      padding: 60px 0;
      font-size: 15px;
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
  <button class="print-btn no-print" onclick="window.print()">Print Progress Report</button>

  <div class="header">
    <h1>Progress Photos Report</h1>
    <p>${escapeHtml(clientName)} &mdash; ${escapeHtml(today)}</p>
  </div>

  ${photoSections}

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
    console.error('Progress photos export error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
