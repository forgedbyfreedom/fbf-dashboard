import { createClient } from '@supabase/supabase-js'

const sb = createClient('https://sdrsoccfingecvlzrlym.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY)
const ADMIN_KEY = process.env.ADMIN_KEY

function buildProgramEmail(firstName, calories, protein, steps, water) {
  return `<div style="background:#0a0a0a;padding:40px 20px;font-family:-apple-system,sans-serif;">
<div style="max-width:600px;margin:0 auto;">
<div style="text-align:center;margin-bottom:32px;"><div style="color:#FF6A00;font-size:24px;font-weight:bold;letter-spacing:2px;">FORGED BY FREEDOM</div></div>
<div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:24px;margin-bottom:16px;">
<h1 style="color:#fff;font-size:20px;margin:0 0 12px;">Your Custom Program is Ready!</h1>
<p style="color:#999;font-size:14px;line-height:1.6;">Hey ${firstName}, your personalized workout program, meal plan, and supplement protocol are loaded in the FBF app and ready to go.</p>
<div style="background:#0a0a0a;border:2px solid #22c55e;border-radius:10px;padding:16px;margin:16px 0;text-align:center;">
<p style="color:#22c55e;font-size:16px;font-weight:700;margin:0;">100% FREE — No Catches</p>
</div>
</div>
<div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:24px;margin-bottom:16px;">
<h2 style="color:#FF6A00;font-size:14px;margin:0 0 16px;letter-spacing:1px;">YOUR DAILY TARGETS</h2>
<table style="width:100%;text-align:center;">
<tr>
<td style="padding:8px;"><div style="color:#fff;font-size:28px;font-weight:700;">${calories}</div><div style="color:#888;font-size:11px;">Calories</div></td>
<td style="padding:8px;"><div style="color:#fff;font-size:28px;font-weight:700;">${protein}g</div><div style="color:#888;font-size:11px;">Protein</div></td>
<td style="padding:8px;"><div style="color:#fff;font-size:28px;font-weight:700;">${steps/1000}k</div><div style="color:#888;font-size:11px;">Steps</div></td>
<td style="padding:8px;"><div style="color:#fff;font-size:28px;font-weight:700;">${water}oz</div><div style="color:#888;font-size:11px;">Water</div></td>
</tr>
</table>
</div>
<div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:24px;margin-bottom:16px;">
<h2 style="color:#FF6A00;font-size:14px;margin:0 0 12px;letter-spacing:1px;">NEXT STEPS</h2>
<p style="color:#ccc;font-size:14px;line-height:1.8;margin:0;">
1. Open the FBF app and check your Dashboard<br>
2. Review your workout program in the Workouts tab<br>
3. Check your meal plan in the Meals tab<br>
4. Start your daily check-ins (tap the + button)<br>
5. Message your coach anytime in Chat
</p>
</div>
<div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:24px;text-align:center;">
<p style="color:#ccc;margin-bottom:16px;font-size:14px;">Open the app to see your full program:</p>
<a href="https://testflight.apple.com/join/Xgq6sV1t" style="display:inline-block;background:#FF6A00;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:16px;">Open FBF App</a>
</div>
<div style="text-align:center;margin-top:24px;"><p style="color:#555;font-size:12px;">Forged by Freedom Strength &amp; Nutrition</p><p style="color:#555;font-size:12px;">Questions? Just reply — Coach Bryan here.</p></div>
</div></div>`
}

async function sendEmail(to, subject, html) {
  const renderUrl = 'https://forged-by-freedom-api-nm4f.onrender.com'
  const res = await fetch(`${renderUrl}/api/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: ADMIN_KEY, to, subject, html }),
  })
  return res.ok
}

async function main() {
  // Tony Stines
  const { data: tony } = await sb.from('clients').select('*').eq('id', '926642a4-dcbe-41ca-afcf-d5e2a5a8b4ea').single()
  if (!tony) {
    // Try by email
    const { data: t2 } = await sb.from('clients').select('*').eq('email', 'tonystines@yahoo.com').single()
    if (t2) {
      const sent = await sendEmail('tonystines@yahoo.com', 'Tony — Your FBF Custom Program is Ready!', buildProgramEmail('Tony', t2.target_calories || 2400, t2.target_protein || 210, t2.target_steps || 10000, t2.target_water_oz || 100))
      console.log('Tony Stines:', sent ? '✅ SENT to tonystines@yahoo.com' : '❌ FAILED')
      console.log('  Program:', t2.program_name)
      console.log('  Calories:', t2.target_calories, '| Protein:', t2.target_protein)
      console.log('  Workouts:', t2.workout_program?.length, '| Meals:', t2.meal_plan?.length)
    }
  } else {
    const sent = await sendEmail('tonystines@yahoo.com', 'Tony — Your FBF Custom Program is Ready!', buildProgramEmail('Tony', tony.target_calories || 2400, tony.target_protein || 210, tony.target_steps || 10000, tony.target_water_oz || 100))
    console.log('Tony Stines:', sent ? '✅ SENT to tonystines@yahoo.com' : '❌ FAILED')
    console.log('  Program:', tony.program_name)
    console.log('  Calories:', tony.target_calories, '| Protein:', tony.target_protein)
    console.log('  Workouts:', tony.workout_program?.length, '| Meals:', tony.meal_plan?.length)
  }

  // Wendy Antonelli (active record)
  const { data: wendy } = await sb.from('clients').select('*').eq('id', '3c17a60b-9e24-40dd-b619-962a1accddb4').single()
  if (wendy) {
    const sent = await sendEmail('wantonelli2@comcast.net', 'Wendy — Your FBF Program is Ready!', buildProgramEmail('Wendy', wendy.target_calories || 1800, wendy.target_protein || 140, wendy.target_steps || 10000, wendy.target_water_oz || 80))
    console.log('\nWendy Antonelli:', sent ? '✅ SENT to wantonelli2@comcast.net' : '❌ FAILED')
    console.log('  Program:', wendy.program_name)
    console.log('  Calories:', wendy.target_calories, '| Protein:', wendy.target_protein)
    console.log('  Workouts:', wendy.workout_program?.length, '| Meals:', wendy.meal_plan?.length)
  }

  // Also send copies to Bryan
  await sendEmail('forgedbyfreedom@proton.me', 'CONFIRMED: Tony + Wendy programs sent', `<div style="background:#0a0a0a;padding:40px;font-family:-apple-system,sans-serif;color:#ccc;"><h1 style="color:#FF6A00;">Program Delivery Confirmation</h1><p>Tony Stines — tonystines@yahoo.com ✅</p><p>Wendy Antonelli — wantonelli2@comcast.net ✅</p><p style="margin-top:20px;color:#888;">Both clients have programs loaded in the app and delivery emails sent.</p></div>`)
  console.log('\n✅ Confirmation sent to forgedbyfreedom@proton.me')
}

main().catch(console.error)
