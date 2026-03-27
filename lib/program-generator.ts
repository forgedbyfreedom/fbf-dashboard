import Anthropic from '@anthropic-ai/sdk'

// Types matching the client app's expected structures
export interface GeneratedProgram {
  program_name: string
  target_calories: number
  target_protein: number
  target_carbs: number
  target_fats: number
  target_water_oz: number
  target_steps: number
  weigh_in_day: string
  workout_program: WorkoutDay[]
  meal_plan: MealPlanMeal[]
  cardio_protocol: CardioProtocol[]
  current_supplements: SupplementItem[]
  current_peptides: PeptideItem[]
  medical_protocol: MedicalProtocol[]
  program_raw_text: string
}

interface WorkoutDay {
  day: string
  name?: string
  exercises: WorkoutExercise[]
}

interface WorkoutExercise {
  name: string
  sets: string | number
  reps: string
  rest?: string
  notes?: string
}

interface MealPlanMeal {
  meal: string
  time?: string
  description: string
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  ingredients?: string[]
}

interface CardioProtocol {
  phase: string
  duration: string
  frequency?: string
  notes?: string
}

interface SupplementItem {
  name: string
  dose: string
  frequency: string
}

interface PeptideItem {
  name: string
  dose: string
  frequency: string
  timing: string
}

interface MedicalProtocol {
  name: string
  dose: string
  frequency: string
  notes: string
}

export interface IntakeData {
  client_id: string
  phone?: string | null
  date_of_birth?: string | null
  height_inches?: number | null
  current_weight_lbs?: number | null
  goal_weight_lbs?: number | null
  primary_goals?: string | null
  training_experience?: string | null
  injuries_or_limitations?: string | null
  medical_conditions?: string | null
  current_medications?: string | null
  allergies?: string | null
  dietary_restrictions?: string | null
  previous_coaches?: string | null
  // Extended fields that might exist from the full form
  [key: string]: unknown
}

export interface ClientInfo {
  first_name: string
  last_name: string
  email?: string | null
}

const FBF_SYSTEM_PROMPT = `You are the Forged by Freedom (FBF) AI Program Generator. You create comprehensive, personalized fitness and nutrition coaching programs.

## FBF Core Principles (MUST follow ALL):
1. **Dumbbells/machines over barbells for pressing** — always prefer dumbbell press and machine press over barbell bench press
2. **High protein anchor** — minimum 0.8-1g protein per lb of bodyweight
3. **FBF Recomp Protocol** — recommend by default unless client goals explicitly don't fit (pure endurance, etc.)
4. **Progressive overload** — every program must include progressive overload structure
5. **SubQ injection ONLY for ALL peptides** — NEVER recommend nasal spray delivery for any peptide (Selank, Semax, BPC-157, etc.). Always SubQ injection.
6. **Account for all injuries/limitations** — modify exercises around every stated injury or limitation
7. **Carbs timed around training** — larger carb portions in pre and post-workout meals
8. **Standard supplement stack**: Creatine Monohydrate (5g/day), Fish Oil (2-3g EPA+DHA), Magnesium Glycinate (400mg), Vitamin D3+K2 (5000IU D3 + 100mcg K2), Electrolytes
9. **Compound recommendations**: Retatrutide and Tesofensine as standard compound discussion points for endocrinologist
10. **TRT discussion**: For males with high body fat (>25%) or over 30, include baseline testosterone panel recommendation
11. **No flat bench with barbell** — if bench is included, use dumbbell or machine variations
12. **5 meals per day** unless client specifically requests fewer
13. **Steps target**: 8,000-12,000 daily steps minimum
14. **Water target**: bodyweight (lbs) / 2 = oz of water minimum

## Output Format:
Return ONLY valid JSON matching this exact structure. No markdown, no code fences, no explanation outside JSON:
{
  "program_name": "FBF Custom Program - [Client First Name]",
  "target_calories": <number>,
  "target_protein": <number in grams>,
  "target_carbs": <number in grams>,
  "target_fats": <number in grams>,
  "target_water_oz": <number>,
  "target_steps": <number>,
  "weigh_in_day": "monday",
  "workout_program": [
    {
      "day": "Day 1",
      "name": "Upper Body Push",
      "exercises": [
        { "name": "Incline Dumbbell Press", "sets": 4, "reps": "8-10", "rest": "90s", "notes": "Progressive overload — add 2.5-5lbs when all sets hit 10 reps" }
      ]
    }
  ],
  "meal_plan": [
    {
      "meal": "Meal 1 — Breakfast",
      "time": "7:00 AM",
      "description": "Egg white omelette with turkey sausage and spinach, oats with blueberries",
      "calories": 450,
      "protein_g": 40,
      "carbs_g": 45,
      "fat_g": 10,
      "ingredients": ["6 egg whites", "2 turkey sausage links", "1 cup spinach", "1/2 cup oats", "1/2 cup blueberries"]
    }
  ],
  "cardio_protocol": [
    { "phase": "Daily LISS", "duration": "30 min incline treadmill walk (10-12% incline, 3.0-3.5 mph)", "frequency": "Daily", "notes": "Morning fasted or post-workout" }
  ],
  "current_supplements": [
    { "name": "Creatine Monohydrate", "dose": "5g", "frequency": "Daily" }
  ],
  "current_peptides": [
    { "name": "BPC-157", "dose": "250mcg", "frequency": "Daily", "timing": "Morning, SubQ injection" }
  ],
  "medical_protocol": [
    { "name": "Baseline Blood Panel", "dose": "N/A", "frequency": "Before starting program", "notes": "Complete metabolic panel, lipids, testosterone (free + total), thyroid, HbA1c, CBC" }
  ],
  "program_raw_text": "<Full readable text version of the entire program — include all sections, formatted nicely with headers and line breaks>"
}

## Macro Calculation Guidelines:
- Cutting: 10-12x bodyweight in calories, 1g/lb protein, 0.35g/lb fat, remainder carbs
- Maintenance/Recomp: 13-15x bodyweight in calories, 1g/lb protein, 0.35g/lb fat, remainder carbs
- Bulking: 16-18x bodyweight in calories, 1g/lb protein, 0.4g/lb fat, remainder carbs

## Training Split Guidelines:
- 3 days/week: Full Body A/B/A rotation
- 4 days/week: Upper/Lower split
- 5 days/week: Push/Pull/Legs/Upper/Lower
- 6 days/week: Push/Pull/Legs x2

Always include warm-up sets and cooldown mobility work in notes.`

export async function generateProgram(
  intake: IntakeData,
  client: ClientInfo
): Promise<GeneratedProgram> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Add it to your environment variables.')
  }

  const anthropic = new Anthropic({ apiKey })

  // Build the user prompt from intake data
  const clientName = `${client.first_name} ${client.last_name}`
  const heightFeet = intake.height_inches ? Math.floor(intake.height_inches / 12) : null
  const heightInches = intake.height_inches ? intake.height_inches % 12 : null
  const heightStr = heightFeet ? `${heightFeet}'${heightInches}"` : 'Not provided'

  // Calculate age from DOB
  let age = 'Not provided'
  if (intake.date_of_birth) {
    const dob = new Date(intake.date_of_birth)
    const now = new Date()
    const ageYears = Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    age = `${ageYears} years old`
  }

  const userPrompt = `Generate a complete FBF coaching program for this client:

## Client Information
- **Name**: ${clientName}
- **Age**: ${age}
- **Height**: ${heightStr}
- **Current Weight**: ${intake.current_weight_lbs ? `${intake.current_weight_lbs} lbs` : 'Not provided'}
- **Goal Weight**: ${intake.goal_weight_lbs ? `${intake.goal_weight_lbs} lbs` : 'Not provided'}

## Goals
- **Primary Goals**: ${intake.primary_goals || 'General fitness and body recomposition'}

## Training Background
- **Experience**: ${intake.training_experience || 'Not provided'}

## Medical / Limitations
- **Medical Conditions**: ${intake.medical_conditions || 'None reported'}
- **Current Medications**: ${intake.current_medications || 'None'}
- **Injuries/Limitations**: ${intake.injuries_or_limitations || 'None reported'}
- **Allergies**: ${intake.allergies || 'None'}

## Nutrition
- **Dietary Restrictions**: ${intake.dietary_restrictions || 'None'}

## Additional Context
- **Previous Coaches**: ${intake.previous_coaches || 'None'}
${intake.how_did_you_hear ? `- **How they found FBF**: ${intake.how_did_you_hear}` : ''}

Generate the complete program JSON. Account for ALL medical conditions and injuries. If client has no stated goals, default to body recomposition (FBF Recomp Protocol). Include peptide recommendations if appropriate for their goals. Always recommend SubQ injection — NEVER nasal spray.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    system: FBF_SYSTEM_PROMPT,
  })

  // Extract text content
  const textContent = message.content.find(block => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  let responseText = textContent.text.trim()

  // Strip markdown code fences if present
  if (responseText.startsWith('```')) {
    responseText = responseText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }

  let program: GeneratedProgram
  try {
    program = JSON.parse(responseText)
  } catch (parseError) {
    console.error('Failed to parse program JSON:', responseText.substring(0, 500))
    throw new Error(`Failed to parse generated program as JSON: ${parseError}`)
  }

  // Validate required fields exist
  const requiredFields: (keyof GeneratedProgram)[] = [
    'program_name', 'target_calories', 'target_protein', 'target_carbs',
    'target_fats', 'target_water_oz', 'target_steps', 'workout_program',
    'meal_plan', 'current_supplements',
  ]

  for (const field of requiredFields) {
    if (program[field] === undefined || program[field] === null) {
      throw new Error(`Generated program missing required field: ${field}`)
    }
  }

  // Ensure arrays are arrays
  if (!Array.isArray(program.workout_program)) program.workout_program = []
  if (!Array.isArray(program.meal_plan)) program.meal_plan = []
  if (!Array.isArray(program.cardio_protocol)) program.cardio_protocol = []
  if (!Array.isArray(program.current_supplements)) program.current_supplements = []
  if (!Array.isArray(program.current_peptides)) program.current_peptides = []
  if (!Array.isArray(program.medical_protocol)) program.medical_protocol = []

  // Safety check: ensure no nasal spray mentions in peptides
  program.current_peptides = program.current_peptides.map(p => ({
    ...p,
    timing: p.timing?.replace(/nasal/gi, 'SubQ injection') || 'SubQ injection',
  }))

  return program
}
