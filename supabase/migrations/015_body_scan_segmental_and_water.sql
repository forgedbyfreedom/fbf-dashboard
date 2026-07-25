-- 015: columns the ScanUpload preview already let coaches edit but that had
-- nowhere to land. Every value typed into those seven inputs was silently
-- discarded on save. Applied to production 2026-07-25.

ALTER TABLE body_composition_scans ADD COLUMN IF NOT EXISTS body_water_lbs numeric(5,1);
ALTER TABLE body_composition_scans ADD COLUMN IF NOT EXISTS bmi numeric(4,1);
ALTER TABLE body_composition_scans ADD COLUMN IF NOT EXISTS right_arm_lbs numeric(5,2);
ALTER TABLE body_composition_scans ADD COLUMN IF NOT EXISTS left_arm_lbs numeric(5,2);
ALTER TABLE body_composition_scans ADD COLUMN IF NOT EXISTS trunk_lbs numeric(5,2);
ALTER TABLE body_composition_scans ADD COLUMN IF NOT EXISTS right_leg_lbs numeric(5,2);
ALTER TABLE body_composition_scans ADD COLUMN IF NOT EXISTS left_leg_lbs numeric(5,2);

-- Also emitted by the body-scan vision prompt, previously dropped on the floor.
ALTER TABLE body_composition_scans ADD COLUMN IF NOT EXISTS percent_body_water numeric(4,1);
ALTER TABLE body_composition_scans ADD COLUMN IF NOT EXISTS inbody_score integer;
