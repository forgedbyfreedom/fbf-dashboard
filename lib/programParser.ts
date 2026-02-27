interface Exercise {
  name: string
  sets: string
  reps: string
}

interface TrainingDay {
  day: string
  exercises: Exercise[]
}

interface CardioPhase {
  phase: string
  duration: string
  frequency: string
  notes: string
}

interface MealEntry {
  meal: string
  description: string
}

interface Supplement {
  name: string
  dose: string
  frequency: string
}

interface MedicalProtocol {
  name: string
  dose: string
  frequency: string
  notes: string
}

interface ParsedProgram {
  programName: string
  clientName: string
  targetCalories: number | null
  targetProtein: number | null
  targetCarbs: number | null
  targetFats: number | null
  targetWaterOz: number | null
  workoutProgram: TrainingDay[]
  cardioProtocol: CardioPhase[]
  mealPlan: MealEntry[]
  supplements: Supplement[]
  medicalProtocol: MedicalProtocol[]
}

export function parseProgram(text: string): ParsedProgram {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  const result: ParsedProgram = {
    programName: '',
    clientName: '',
    targetCalories: null,
    targetProtein: null,
    targetCarbs: null,
    targetFats: null,
    targetWaterOz: null,
    workoutProgram: [],
    cardioProtocol: [],
    mealPlan: [],
    supplements: [],
    medicalProtocol: [],
  }

  // Extract client name
  const clientMatch = text.match(/Client:\s*(.+)/i)
  if (clientMatch) result.clientName = clientMatch[1].trim()

  // Extract program name
  const phaseMatch = text.match(/Phase:\s*(.+)/i)
  if (phaseMatch) result.programName = phaseMatch[1].trim()

  // Extract nutrition targets
  const calMatch = text.match(/(?:Starting\s+)?Calories:\s*([\d,]+)/i)
  if (calMatch) result.targetCalories = parseInt(calMatch[1].replace(/,/g, '').replace(/[–-]\d+/, ''))

  const proteinMatch = text.match(/Protein:\s*(\d+)g/i)
  if (proteinMatch) result.targetProtein = parseInt(proteinMatch[1])

  const carbsMatch = text.match(/Carb(?:ohydrate)?s?:\s*(\d+)/i)
  if (carbsMatch) result.targetCarbs = parseInt(carbsMatch[1])

  const fatsMatch = text.match(/Fats?:\s*(\d+)/i)
  if (fatsMatch) result.targetFats = parseInt(fatsMatch[1])

  const waterMatch = text.match(/(?:Hydration|Water):\s*(\d+)\s*gallon/i)
  if (waterMatch) result.targetWaterOz = parseInt(waterMatch[1]) * 128

  // Parse training days
  let currentDay: TrainingDay | null = null
  const dayRegex = /^Day\s+\d+\s*[–-]\s*(.+)/i

  for (const line of lines) {
    const dayMatch = line.match(dayRegex)
    if (dayMatch) {
      if (currentDay && currentDay.exercises.length > 0) {
        result.workoutProgram.push(currentDay)
      }
      currentDay = { day: line, exercises: [] }
      continue
    }

    // Exercise line: "Exercise Name – SetsxReps" or "Exercise Name - SetsxReps"
    if (currentDay) {
      const exerciseMatch = line.match(/^(.+?)\s*[–-]\s*(\d+)\s*[x×]\s*(.+)/i)
      if (exerciseMatch) {
        currentDay.exercises.push({
          name: exerciseMatch[1].trim(),
          sets: exerciseMatch[2],
          reps: exerciseMatch[3].trim(),
        })
        continue
      }
      // Exercise with "sets to failure" pattern
      const failureMatch = line.match(/^(.+?)\s*[–-]\s*(\d+)\s+sets?\s+(.+)/i)
      if (failureMatch) {
        currentDay.exercises.push({
          name: failureMatch[1].trim(),
          sets: failureMatch[2],
          reps: failureMatch[3].trim(),
        })
        continue
      }
    }

    // Detect section breaks that end exercise parsing
    if (/^(CARDIO|NUTRITION|SUPPLEMENT|EXPECTED|GLP|MEDICAL|IMPORTANT)/i.test(line)) {
      if (currentDay && currentDay.exercises.length > 0) {
        result.workoutProgram.push(currentDay)
        currentDay = null
      }
    }
  }
  if (currentDay && currentDay.exercises.length > 0) {
    result.workoutProgram.push(currentDay)
  }

  // Parse cardio protocol
  const cardioSection = text.match(/CARDIO PROTOCOL([\s\S]*?)(?=\n(?:NUTRITION|SUPPLEMENT|EXPECTED|GLP|$))/i)
  if (cardioSection) {
    const cardioLines = cardioSection[1].split('\n').map(l => l.trim()).filter(Boolean)
    for (const line of cardioLines) {
      const weekMatch = line.match(/^(Weeks?\s*[\d–-]+):?\s*(.+)/i)
      if (weekMatch) {
        result.cardioProtocol.push({
          phase: weekMatch[1],
          duration: weekMatch[2],
          frequency: '',
          notes: '',
        })
      }
    }
  }

  // Parse meal plan
  const mealSection = text.match(/(?:Sample\s+)?(?:Daily\s+)?Meal\s+Plan([\s\S]*?)(?=\n(?:NUTRITION|SUPPLEMENT|CARDIO|EXPECTED|GLP|$))/i)
  if (mealSection) {
    const mealLines = mealSection[1].split('\n').map(l => l.trim()).filter(Boolean)
    for (const line of mealLines) {
      const mealMatch = line.match(/^(Meal\s*\d+|Before\s+Bed|Pre.?workout|Post.?workout|Snack)[\s:(.–-]+(.+)/i)
      if (mealMatch) {
        result.mealPlan.push({
          meal: mealMatch[1].replace(/[:(]/g, '').trim(),
          description: mealMatch[2].replace(/^\)?\s*/, '').trim(),
        })
      }
    }
  }

  // Parse supplements
  const suppSection = text.match(/SUPPLEMENT PROTOCOL([\s\S]*?)(?=\n(?:GLP|EXPECTED|IMPORTANT|MEDICAL|$))/i)
  if (suppSection) {
    const suppLines = suppSection[1].split('\n').map(l => l.trim()).filter(Boolean)
    for (const line of suppLines) {
      // Pattern: "Name (dose)" or "Name – description"
      const suppMatch = line.match(/^(.+?)\s*(?:[–-]\s*|[(])/i)
      if (suppMatch) {
        const name = suppMatch[1].trim()
        const doseMatch = line.match(/\(([^)]+)\)/i)
        result.supplements.push({
          name,
          dose: doseMatch ? doseMatch[1] : '',
          frequency: /daily/i.test(line) ? 'Daily' : '',
        })
      }
    }
  }

  // Parse medical/GLP protocol
  const glpSection = text.match(/GLP[\s\S]*?(?:MEDICAL|SUPPORT)([\s\S]*?)(?=\nEXPECTED|$)/i)
  if (glpSection) {
    const glpText = glpSection[1]

    // Retatrutide
    const retaMatch = glpText.match(/Retatrutide[:\s]*([\s\S]*?)(?=Cagrilintide|IMPORTANT|$)/i)
    if (retaMatch) {
      const doseMatch = glpText.match(/(\d+mg)\s*weekly\s*of\s*Retatrutide/i)
      result.medicalProtocol.push({
        name: 'Retatrutide',
        dose: doseMatch ? doseMatch[1] + ' weekly' : '',
        frequency: 'Weekly (Wednesdays)',
        notes: 'Multi-agonist compound. Increase 0.5mg weekly.',
      })
    }

    // Cagrilintide
    const cagMatch = glpText.match(/Cagrilintide[:\s]*([\s\S]*?)(?=IMPORTANT|Retatrutide|$)/i)
    if (cagMatch) {
      const doseMatch = glpText.match(/([\d.]+m[g]?)\s*weekly\s*of\s*Cagrilintide/i)
      result.medicalProtocol.push({
        name: 'Cagrilintide',
        dose: doseMatch ? doseMatch[1] + ' weekly' : '0.5mg weekly',
        frequency: 'Weekly (Saturdays)',
        notes: 'Amylin analogue for appetite control.',
      })
    }
  }

  return result
}
