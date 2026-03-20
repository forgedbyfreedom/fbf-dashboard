import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID || ''
const DEFAULT_COACH_USER_ID = process.env.DEFAULT_COACH_USER_ID || ''

function generateSeedData(clientId: string) {
  const checkins = []
  const today = new Date()

  // Starting stats — will trend slightly down over 30 days
  let weight = 195 + Math.random() * 20 // 195-215
  const targetCal = 2200
  const targetProtein = 200
  const targetSteps = 10000

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isRestDay = dayOfWeek === 0 || dayOfWeek === 3 // Sun + Wed rest

    // Weight trends down slowly with noise
    weight -= (Math.random() * 0.3 - 0.05)
    const dayWeight = Math.round(weight * 10) / 10

    // Calories: slightly over/under target
    const calories = Math.round(targetCal + (Math.random() * 400 - 200))
    const protein = Math.round(targetProtein + (Math.random() * 40 - 20))
    const carbs = Math.round(200 + Math.random() * 80 - 40)
    const fat = Math.round(65 + Math.random() * 20 - 10)

    // Steps: higher on weekdays
    const steps = Math.round((isWeekend ? 6000 : 9000) + Math.random() * 5000)

    // Sleep: 6-8.5 hours
    const sleepHours = Math.round((6 + Math.random() * 2.5) * 2) / 2
    const sleepQuality = Math.min(10, Math.max(1, Math.round(sleepHours - 1)))

    // Training
    const trainingDone = !isRestDay
    const trainingTypes = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body']
    const trainingType = trainingDone ? trainingTypes[Math.floor(Math.random() * trainingTypes.length)] : null
    const cardioMinutes = trainingDone ? Math.round(20 + Math.random() * 25) : (isWeekend ? Math.round(Math.random() * 30) : 0)
    const estCalBurned = trainingDone ? Math.round(300 + Math.random() * 300) : (cardioMinutes > 0 ? Math.round(cardioMinutes * 8) : null)

    // Mood/stress
    const mood = Math.min(10, Math.max(3, Math.round(6 + Math.random() * 4)))
    const stress = Math.min(10, Math.max(1, Math.round(3 + Math.random() * 4)))

    // Water
    const water = Math.round(80 + Math.random() * 80)

    // Body temp
    const bodyTemp = Math.round((97.5 + Math.random() * 1.5) * 10) / 10

    checkins.push({
      client_id: clientId,
      date: dateStr,
      weight_lbs: dayWeight,
      calories,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
      steps,
      sleep_hours: sleepHours,
      sleep_quality: sleepQuality,
      training_done: trainingDone,
      training_type: trainingType,
      workout_notes: trainingDone ? `${trainingType} day — solid session` : null,
      workout_description: trainingDone ? `${trainingType} workout` : null,
      cardio_minutes: cardioMinutes > 0 ? cardioMinutes : null,
      estimated_calories_burned: estCalBurned,
      mood_rating: mood,
      stress_level: stress,
      water_oz: water,
      body_temp: bodyTemp,
      supplement_compliance: trainingDone,
      rpe: trainingDone ? Math.min(10, Math.max(5, Math.round(6 + Math.random() * 3))) : null,
    })
  }

  return { checkins, targets: { target_calories: targetCal, target_protein: targetProtein, target_steps: targetSteps } }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, first_name, last_name } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    let orgId = DEFAULT_ORG_ID
    let coachId = DEFAULT_COACH_USER_ID

    if (!orgId || !coachId) {
      const { data: bryansOrg } = await adminSupabase
        .from('org_members')
        .select('organization_id, user_id')
        .eq('role', 'org_admin')
        .limit(1)
        .single()

      if (bryansOrg) {
        orgId = orgId || bryansOrg.organization_id
        coachId = coachId || bryansOrg.user_id
      }
    }

    if (!orgId) {
      return NextResponse.json({ error: 'Organization not configured' }, { status: 500 })
    }

    // Create auth user
    const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `${first_name || ''} ${last_name || ''}`.trim() },
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'An account with this email already exists. Please sign in instead.' }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Generate seed data
    const seed = generateSeedData('placeholder')

    // Create client record with targets
    const { data: clientRecord, error: clientError } = await adminSupabase
      .from('clients')
      .insert({
        user_id: newUser.user.id,
        organization_id: orgId,
        first_name: first_name || '',
        last_name: last_name || '',
        email,
        is_active: true,
        target_calories: seed.targets.target_calories,
        target_protein: seed.targets.target_protein,
        target_steps: seed.targets.target_steps,
        weigh_in_day: 'monday',
      })
      .select('id')
      .single()

    if (clientError) {
      console.error('Client record error:', clientError)
    }

    const clientId = clientRecord?.id

    // Create org membership
    await adminSupabase.from('org_members').insert({
      user_id: newUser.user.id,
      organization_id: orgId,
      role: 'client',
    })

    // Assign to default coach
    if (coachId && clientId) {
      await adminSupabase.from('client_coach_assignments').insert({
        client_id: clientId,
        coach_user_id: coachId,
        is_active: true,
      })
    }

    // Seed 30 days of check-in data
    if (clientId) {
      const seedData = generateSeedData(clientId)
      const { error: seedError } = await adminSupabase
        .from('checkins')
        .insert(seedData.checkins)

      if (seedError) {
        console.error('Seed data error:', seedError)
        // Don't fail registration if seeding fails
      }
    }

    return NextResponse.json({ success: true, message: 'Account created. You can now sign in.' })
  } catch (err) {
    console.error('Registration error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
