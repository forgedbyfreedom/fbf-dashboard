-- Add extended program fields to generated_programs
ALTER TABLE generated_programs ADD COLUMN IF NOT EXISTS ped_protocol jsonb;
ALTER TABLE generated_programs ADD COLUMN IF NOT EXISTS metabolic_monitoring jsonb;
ALTER TABLE generated_programs ADD COLUMN IF NOT EXISTS treadmill_progression jsonb;
ALTER TABLE generated_programs ADD COLUMN IF NOT EXISTS recovery jsonb;
ALTER TABLE generated_programs ADD COLUMN IF NOT EXISTS methodology text;
ALTER TABLE generated_programs ADD COLUMN IF NOT EXISTS plan_at_a_glance jsonb;

-- Add PED/peptide tracking columns to clients if not present
ALTER TABLE clients ADD COLUMN IF NOT EXISTS current_peds jsonb DEFAULT '[]'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS current_peptides jsonb DEFAULT '[]'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS program_name text;
