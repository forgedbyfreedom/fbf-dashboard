-- ============================================
-- FBF Coach Dashboard - Enhanced Features
-- Phase 2: Protocols, Wellness, Body Comp, Scheduling
-- ============================================

-- ============================================
-- clients table — new columns
-- ============================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS weigh_in_day text DEFAULT 'monday';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS current_supplements jsonb DEFAULT '[]';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS current_peds jsonb DEFAULT '[]';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS current_peptides jsonb DEFAULT '[]';

-- ============================================
-- checkins table — new columns
-- ============================================
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS mood_rating integer CHECK (mood_rating BETWEEN 1 AND 10);
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS mood_notes text;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS body_temp numeric(4,1);
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS water_oz integer;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS stress_level integer CHECK (stress_level BETWEEN 1 AND 10);
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS workout_description text;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS workout_voice_transcript text;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS estimated_calories_burned integer;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS supplement_compliance boolean DEFAULT true;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS progress_photo_urls jsonb DEFAULT '[]';

-- ============================================
-- client_metrics table — new columns
-- ============================================
ALTER TABLE client_metrics ADD COLUMN IF NOT EXISTS avg_mood_7d numeric(3,1);
ALTER TABLE client_metrics ADD COLUMN IF NOT EXISTS avg_stress_7d numeric(3,1);
ALTER TABLE client_metrics ADD COLUMN IF NOT EXISTS avg_water_7d numeric(5,0);
ALTER TABLE client_metrics ADD COLUMN IF NOT EXISTS supplement_compliance_7d numeric(5,2);

-- ============================================
-- New table: body_composition_scans
-- ============================================
CREATE TABLE IF NOT EXISTS body_composition_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  scan_date date NOT NULL,
  scan_type text NOT NULL CHECK (scan_type IN ('inbody', 'dexa', 'bf_scale', 'other')),
  body_fat_pct numeric(4,1),
  lean_mass_lbs numeric(5,1),
  file_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_body_comp_client ON body_composition_scans(client_id, scan_date DESC);

-- ============================================
-- New table: scheduled_checkins
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  coach_user_id uuid NOT NULL REFERENCES profiles(id),
  type text NOT NULL CHECK (type IN ('weekly_email', 'monthly_facetime')),
  scheduled_for date NOT NULL,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_checkins_client ON scheduled_checkins(client_id, scheduled_for DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_checkins_coach ON scheduled_checkins(coach_user_id, scheduled_for);

-- ============================================
-- RLS for body_composition_scans
-- ============================================
ALTER TABLE body_composition_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches see scans for assigned clients"
  ON body_composition_scans FOR SELECT
  USING (
    is_assigned_coach(client_id)
    OR is_org_admin((SELECT organization_id FROM clients WHERE id = client_id))
    OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "Clients can insert own scans"
  ON body_composition_scans FOR INSERT
  WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    OR is_assigned_coach(client_id)
    OR is_org_admin((SELECT organization_id FROM clients WHERE id = client_id))
  );

-- ============================================
-- RLS for scheduled_checkins
-- ============================================
ALTER TABLE scheduled_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches see scheduled checkins for assigned clients"
  ON scheduled_checkins FOR SELECT
  USING (
    coach_user_id = auth.uid()
    OR is_org_admin((SELECT organization_id FROM clients WHERE id = client_id))
  );

CREATE POLICY "Coaches manage scheduled checkins"
  ON scheduled_checkins FOR ALL
  USING (
    coach_user_id = auth.uid()
    OR is_org_admin((SELECT organization_id FROM clients WHERE id = client_id))
  );
