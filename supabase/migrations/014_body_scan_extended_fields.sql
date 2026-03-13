-- 014: Extended body composition scan fields
-- Adds additional body comp metrics and expands scan_type options

ALTER TABLE body_composition_scans ADD COLUMN IF NOT EXISTS fat_mass_lbs numeric(5,1);
ALTER TABLE body_composition_scans ADD COLUMN IF NOT EXISTS total_weight_lbs numeric(5,1);
ALTER TABLE body_composition_scans ADD COLUMN IF NOT EXISTS skeletal_muscle_mass_lbs numeric(5,1);
ALTER TABLE body_composition_scans ADD COLUMN IF NOT EXISTS basal_metabolic_rate integer;
ALTER TABLE body_composition_scans ADD COLUMN IF NOT EXISTS visceral_fat_level numeric(4,1);

-- Expand scan_type to accept bodpod and calipers
ALTER TABLE body_composition_scans DROP CONSTRAINT IF EXISTS body_composition_scans_scan_type_check;
ALTER TABLE body_composition_scans ADD CONSTRAINT body_composition_scans_scan_type_check
  CHECK (scan_type IN ('inbody', 'dexa', 'bf_scale', 'bodpod', 'calipers', 'other'));
