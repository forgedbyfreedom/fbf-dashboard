import { createClient } from '@supabase/supabase-js'

const sb = createClient('https://sdrsoccfingecvlzrlym.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY)
const ADMIN_KEY = process.env.ADMIN_KEY

const clientId = '3ce105a5-55fb-4401-a100-9959892ce68f'

// Get program from program_reviews
const { data: pr } = await sb.from('program_reviews').select('generated_program').eq('client_id', clientId).order('created_at', { ascending: false }).limit(1).single()

const p = pr?.generated_program
if (!p) { console.log('No program found'); process.exit(1) }

console.log('Program keys:', Object.keys(p))

// Map and apply — Frank is 218 lbs, 5\'10", goal 200 lbs
const workout = p.workout_program || p.training_program || []
const meals = p.meal_plan || p.nutrition_plan || []
const cardio = p.cardio_protocol || []
const supps = p.current_supplements || p.supplement_protocol || []

await sb.from('clients').update({
  program_name: 'FBF Custom Program - Frank',
  target_calories: p.target_calories || 2200,
  target_protein: p.target_protein || 200,
  target_carbs: p.target_carbs || 220,
  target_fats: p.target_fats || 60,
  target_water_oz: p.target_water_oz || 109,
  target_steps: p.target_steps || 10000,
  weigh_in_day: 'monday',
  workout_program: workout,
  meal_plan: meals,
  cardio_protocol: cardio,
  current_supplements: supps,
}).eq('id', clientId)

console.log('✅ Frank profile updated')
console.log('  Workouts:', workout.length, 'days')
console.log('  Meals:', meals.length)
console.log('  Cardio:', cardio.length)
console.log('  Supplements:', supps.length)

// Save to Desktop
import { writeFileSync } from 'fs'
writeFileSync('/Users/bryanantonelli/Desktop/Frank Kelley — Program Review.txt', JSON.stringify(p, null, 2))
console.log('✅ Saved to Desktop')

// Send email to Frank
const html = `<div style="background:#0a0a0a;padding:40px 20px;font-family:-apple-system,sans-serif;">
<div style="max-width:600px;margin:0 auto;">
<div style="text-align:center;margin-bottom:32px;"><div style="color:#FF6A00;font-size:24px;font-weight:bold;letter-spacing:2px;">FORGED BY FREEDOM</div></div>
<div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:24px;margin-bottom:16px;">
<h1 style="color:#fff;font-size:20px;margin:0 0 12px;">Your Custom Program is Ready!</h1>
<p style="color:#999;font-size:14px;line-height:1.6;">Hey Frank, your personalized workout program, meal plan, and supplement protocol are loaded and waiting for you in the FBF app.</p>
<div style="background:#0a0a0a;border:2px solid #22c55e;border-radius:10px;padding:16px;margin:16px 0;text-align:center;">
<p style="color:#22c55e;font-size:16px;font-weight:700;margin:0;">100% FREE — No Catches</p>
</div>
</div>
<div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:24px;text-align:center;">
<p style="color:#ccc;margin-bottom:16px;font-size:14px;">Open the app to see your full program:</p>
<a href="https://testflight.apple.com/join/Xgq6sV1t" style="display:inline-block;background:#FF6A00;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:16px;">Open FBF App</a>
</div>
<div style="text-align:center;margin-top:24px;"><p style="color:#555;font-size:12px;">Forged by Freedom Strength &amp; Nutrition</p></div>
</div></div>`

const res = await fetch('https://forged-by-freedom-api-nm4f.onrender.com/api/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: ADMIN_KEY, to: 'fekelley70@gmail.com', subject: 'Frank — Your FBF Custom Program is Ready!', html }),
})
console.log(res.ok ? '✅ Email sent to fekelley70@gmail.com' : '❌ Email failed: ' + await res.text())

// Also send to Bryan for review
const res2 = await fetch('https://forged-by-freedom-api-nm4f.onrender.com/api/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: ADMIN_KEY, to: 'forgedbyfreedom@proton.me', subject: 'Frank Kelley — Program Generated (for your review)', html: html.replace('Hey Frank', 'Frank Kelley program generated — review below') }),
})
console.log(res2.ok ? '✅ Copy sent to Bryan' : '❌ Bryan email failed')
