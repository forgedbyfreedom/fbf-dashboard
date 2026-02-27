-- ============================================
-- FBF Coach Dashboard - Program Import
-- Stores full workout programs, cardio protocols,
-- meal plans, and extended nutrition targets
-- ============================================

-- Extended nutrition targets
ALTER TABLE clients ADD COLUMN IF NOT EXISTS target_carbs int;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS target_fats int;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS target_water_oz int;

-- Program data
ALTER TABLE clients ADD COLUMN IF NOT EXISTS program_name text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS program_raw_text text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS workout_program jsonb DEFAULT '[]';
-- [{day: "Day 1 – Chest + Triceps", exercises: [{name, sets, reps}]}]
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cardio_protocol jsonb DEFAULT '[]';
-- [{phase, duration, frequency, notes}]
ALTER TABLE clients ADD COLUMN IF NOT EXISTS meal_plan jsonb DEFAULT '[]';
-- [{meal, description}]
ALTER TABLE clients ADD COLUMN IF NOT EXISTS medical_protocol jsonb DEFAULT '[]';
-- [{name, dose, frequency, notes}]
