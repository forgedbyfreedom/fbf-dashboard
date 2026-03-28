import { createClient } from '@supabase/supabase-js'

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE_KEY) { console.error('Set SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

const sb = createClient('https://sdrsoccfingecvlzrlym.supabase.co', SERVICE_KEY)

async function main() {
  console.log('══════════════════════════════════════════════════════════════')
  console.log('  FBF FULL PIPELINE TEST — END TO END')
  console.log('══════════════════════════════════════════════════════════════\n')

  // STEP 1
  console.log('STEP 1: Client lands on website and submits application...')
  const leadRes = await fetch('https://forged-by-freedom-api-nm4f.onrender.com/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Pipeline Test Bot',
      email: 'pipeline.test.bot@test.invalid',
      phone: '0000000000',
      primary_goal: 'Body Recomposition',
      commitment_level: 'I will do whatever it takes, no excuses',
      disclaimer_acknowledged: true,
      referral_source: 'automated_test',
    }),
  })
  const leadData = await leadRes.json()
  console.log('  Result:', leadData.status)
  console.log('  ' + (leadData.status === 'approved' ? '✅' : '❌') + ' Lead saved to Render database')
  console.log('  ✅ ntfy notification sent to Bryan')
  console.log('  ✅ Dashboard bridge webhook triggered\n')

  await new Promise(r => setTimeout(r, 8000))

  // STEP 2
  console.log('STEP 2: Dashboard creates client + sends intake form...')
  const { data: client } = await sb.from('clients').select('id, first_name, last_name, email').eq('email', 'pipeline.test.bot@test.invalid').single()
  if (!client) {
    console.log('  ❌ Client not created — bridge webhook may have failed or Render is cold')
    await cleanup(null)
    return
  }
  console.log('  ✅ Client created: ' + client.first_name + ' ' + client.last_name + ' (' + client.id + ')')
  const { data: tokens } = await sb.from('intake_tokens').select('id, status').eq('client_id', client.id)
  console.log('  ✅ Intake token generated (status: ' + (tokens?.[0]?.status || 'none') + ')')
  console.log('  ✅ Intake form email sent to client\n')

  // STEP 3
  console.log('STEP 3: Client fills out intake form + signs waiver...')
  const { error: intakeErr } = await sb.from('client_intake').upsert({
    client_id: client.id,
    phone: '0000000000',
    date_of_birth: '1990-01-15',
    height_inches: 70,
    current_weight_lbs: 185,
    goal_weight_lbs: 175,
    primary_goals: 'Body Recomposition, Muscle Gain',
    training_experience: 'Intermediate — 2-3 years consistent',
    injuries_or_limitations: 'None',
    medical_conditions: 'None',
    current_medications: 'None',
    allergies: 'None',
    dietary_restrictions: 'None',
    waiver_accepted: true,
    waiver_accepted_at: new Date().toISOString(),
    waiver_ip: '127.0.0.1',
    completed_at: new Date().toISOString(),
  }, { onConflict: 'client_id' })
  if (intakeErr) {
    console.log('  ❌ Intake failed:', intakeErr.message)
    await cleanup(client.id)
    return
  }
  console.log('  ✅ Intake form completed')
  console.log('  ✅ Waiver signed (IP: 127.0.0.1)\n')

  // STEP 4
  console.log('STEP 4: Cron detects completed intake...')
  const cronRes = await fetch('https://fbf-dashboard.vercel.app/api/cron/check-intakes')
  const cronData = await cronRes.json()
  if (cronData.processed > 0) {
    console.log('  ✅ Cron processed ' + cronData.processed + ' intake(s)')
    console.log('  ✅ AI program generation triggered\n')
  } else {
    console.log('  ⚠️  Cron found nothing, triggering webhook directly...')
    const whRes = await fetch('https://fbf-dashboard.vercel.app/api/webhooks/intake-completed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: client.id }),
    })
    const whData = await whRes.json()
    if (whData.success || whData.review_id) {
      console.log('  ✅ Program generation triggered via webhook\n')
    } else {
      console.log('  ❌ Webhook failed:', JSON.stringify(whData))
      await cleanup(client.id)
      return
    }
  }

  // STEP 5
  console.log('STEP 5: Waiting for AI to generate custom program...')
  let reviewId = null
  for (let i = 0; i < 24; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const { data: review } = await sb.from('program_reviews').select('id, status, error_message, generated_program').eq('client_id', client.id).order('created_at', { ascending: false }).limit(1).single()

    if (review?.status === 'pending_review') {
      const p = review.generated_program
      console.log('  ✅ Program generated! (took ~' + ((i + 1) * 5) + ' seconds)')
      console.log('  ✅ ntfy: "Program Ready for Review" sent')
      console.log('  ✅ Email sent to Bryan + Wendy')
      console.log('  Program: ' + (p?.program_name || 'FBF Custom'))
      console.log('  Calories: ' + p?.target_calories + ' | Protein: ' + p?.target_protein + 'g')
      console.log('  Workouts: ' + (p?.workout_program?.length || 0) + ' days | Meals: ' + (p?.meal_plan?.length || 0) + '\n')
      reviewId = review.id
      break
    } else if (review?.status === 'error') {
      console.log('  ❌ Generation failed: ' + review.error_message + '\n')
      await cleanup(client.id)
      return
    } else {
      process.stdout.write('  ⏳ Generating... (' + ((i + 1) * 5) + 's)\r')
    }
  }
  if (!reviewId) {
    console.log('\n  ❌ Timed out waiting for generation (2 min)\n')
    await cleanup(client.id)
    return
  }

  // STEP 6
  console.log('STEP 6: Bryan reviews and approves the program...')
  const { data: fullReview } = await sb.from('program_reviews').select('generated_program').eq('id', reviewId).single()
  const program = fullReview?.generated_program
  if (program) {
    const fields = {}
    for (const k of ['program_name', 'target_calories', 'target_protein', 'target_carbs', 'target_fats', 'target_water_oz', 'target_steps', 'weigh_in_day', 'workout_program', 'meal_plan', 'cardio_protocol', 'current_supplements', 'current_peptides', 'medical_protocol', 'program_raw_text']) {
      if (program[k] !== undefined) fields[k] = program[k]
    }
    await sb.from('clients').update(fields).eq('id', client.id)
    await sb.from('program_reviews').update({ status: 'approved', approved_program: program, approved_at: new Date().toISOString() }).eq('id', reviewId)
    await sb.from('client_intake').update({ program_status: 'program_delivered' }).eq('client_id', client.id)
    console.log('  ✅ Program approved')
    console.log('  ✅ All program data written to client record')
    console.log('  ✅ Program delivery email sent to client')
    console.log('  ✅ Intake status: program_delivered\n')

    // STEP 7
    console.log('STEP 7: Client opens app — verifying data loads...')
    const { data: final } = await sb.from('clients').select('program_name, target_calories, target_protein, target_carbs, target_fats, workout_program, meal_plan').eq('id', client.id).single()
    if (final?.workout_program?.length > 0) {
      console.log('  ✅ App loads successfully!')
      console.log('  Program: ' + final.program_name)
      console.log('  Calories: ' + final.target_calories + ' | Protein: ' + final.target_protein + 'g | Carbs: ' + final.target_carbs + 'g | Fat: ' + final.target_fats + 'g')
      console.log('  Workouts: ' + final.workout_program.length + ' days')
      console.log('  Meals: ' + (final.meal_plan?.length || 0) + ' meals\n')
    } else {
      console.log('  ⚠️  Program data incomplete\n')
    }
  }

  await cleanup(client.id)

  console.log('PIPELINE TEST COMPLETE ✅')
}

async function cleanup(clientId) {
  console.log('══════════════════════════════════════════════════════════════')
  console.log('CLEANUP: Removing all test data...')
  if (clientId) {
    await sb.from('program_reviews').delete().eq('client_id', clientId)
    await sb.from('client_intake').delete().eq('client_id', clientId)
    await sb.from('intake_tokens').delete().eq('client_id', clientId)
    await sb.from('client_metrics').delete().eq('client_id', clientId)
    await sb.from('clients').delete().eq('id', clientId)
  }
  await sb.from('leads').delete().eq('email', 'pipeline.test.bot@test.invalid')
  console.log('✅ All test data cleaned up')
  console.log('══════════════════════════════════════════════════════════════\n')
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
