-- ============================================
-- Visitor List Scrub Tool
-- ============================================

-- Configurable rules per organization
CREATE TABLE scrub_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  field text NOT NULL,
  operator text NOT NULL CHECK (operator IN (
    'equals', 'not_equals', 'contains', 'not_contains',
    'in_list', 'is_empty', 'is_not_empty', 'regex', 'all_pass'
  )),
  value text,
  action text NOT NULL CHECK (action IN ('approve', 'deny')),
  priority int NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  -- Optional compound condition (AND): both primary + condition must match
  condition_field text,
  condition_operator text CHECK (condition_operator IS NULL OR condition_operator IN (
    'equals', 'not_equals', 'contains', 'not_contains',
    'in_list', 'is_empty', 'is_not_empty', 'regex'
  )),
  condition_value text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Each upload + processing run
CREATE TABLE scrub_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  csv_file_name text,
  total_rows int DEFAULT 0,
  auto_approved int DEFAULT 0,
  auto_denied int DEFAULT 0,
  manual_review int DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'exported')),
  column_mapping jsonb,
  rules_snapshot jsonb,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Individual visitor results
CREATE TABLE scrub_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES scrub_sessions(id) ON DELETE CASCADE,
  row_number int NOT NULL,
  raw_data jsonb NOT NULL,
  result text NOT NULL DEFAULT 'pending' CHECK (result IN ('pending', 'approved', 'denied', 'manual_review')),
  denial_reasons jsonb DEFAULT '[]',
  matched_rule_id uuid,
  matched_rule_name text,
  override_result text CHECK (override_result IN ('approved', 'denied')),
  override_by uuid REFERENCES profiles(id),
  override_reason text,
  override_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Column mappings per org (persisted across uploads)
CREATE TABLE scrub_column_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mapping jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_scrub_rules_org ON scrub_rules(organization_id, is_active);
CREATE INDEX idx_scrub_sessions_org ON scrub_sessions(organization_id, created_at DESC);
CREATE INDEX idx_scrub_visitors_session ON scrub_visitors(session_id, result);
CREATE INDEX idx_scrub_visitors_result ON scrub_visitors(session_id, result, row_number);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE scrub_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrub_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrub_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrub_column_mappings ENABLE ROW LEVEL SECURITY;

-- scrub_rules: org_admin only
CREATE POLICY "Org admins can manage scrub rules"
  ON scrub_rules FOR ALL
  USING (is_org_admin(organization_id));

-- scrub_sessions: org_admin only
CREATE POLICY "Org admins can manage scrub sessions"
  ON scrub_sessions FOR ALL
  USING (is_org_admin(organization_id));

-- scrub_visitors: org_admin via session
CREATE POLICY "Org admins can view scrub visitors"
  ON scrub_visitors FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM scrub_sessions WHERE is_org_admin(organization_id)
    )
  );

CREATE POLICY "Org admins can manage scrub visitors"
  ON scrub_visitors FOR ALL
  USING (
    session_id IN (
      SELECT id FROM scrub_sessions WHERE is_org_admin(organization_id)
    )
  );

-- scrub_column_mappings: org_admin only
CREATE POLICY "Org admins can manage column mappings"
  ON scrub_column_mappings FOR ALL
  USING (is_org_admin(organization_id));

-- ============================================
-- Storage bucket for uploaded CSVs
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('scrub-files', 'scrub-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Org admins can upload scrub files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'scrub-files');

CREATE POLICY "Org admins can view scrub files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'scrub-files');

-- ============================================
-- Seed default rules (will be copied per-org on first use)
-- We store them as a function that creates defaults for an org
-- ============================================
CREATE OR REPLACE FUNCTION seed_default_scrub_rules(org_id uuid, user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO scrub_rules (organization_id, name, description, field, operator, value, action, priority, is_active, created_by, condition_field, condition_operator, condition_value)
  VALUES
    (org_id, 'Missing required ID', 'Visitor has no valid ID on file', 'ID_Status', 'is_empty', NULL, 'deny', 100, true, user_id, NULL, NULL, NULL),
    (org_id, 'Missing required documentation', 'Required documentation is not complete', 'Documentation_Status', 'not_equals', 'complete', 'deny', 90, true, user_id, NULL, NULL, NULL),
    (org_id, 'STG inmate - non-immediate family', 'Inmate is STG member and visitor is not immediate family', 'STG_Member', 'equals', 'yes', 'deny', 85, true, user_id, 'Family_Type', 'not_equals', 'immediate'),
    (org_id, 'No prior relationship', 'Visitor had no prior relationship with inmate', 'Prior_Relationship', 'equals', 'no', 'deny', 80, true, user_id, NULL, NULL, NULL),
    (org_id, 'No prior relationship (empty)', 'Prior relationship field is blank', 'Prior_Relationship', 'is_empty', NULL, 'deny', 79, true, user_id, NULL, NULL, NULL),
    (org_id, 'Inappropriate questionnaire response', 'Visitor did not pass the screening questionnaire', 'Questionnaire_Status', 'not_equals', 'passed', 'deny', 70, true, user_id, NULL, NULL, NULL),
    (org_id, 'Questionnaire not completed', 'Visitor did not complete the screening questionnaire', 'Questionnaire_Status', 'is_empty', NULL, 'deny', 69, true, user_id, NULL, NULL, NULL),
    (org_id, 'All checks passed', 'Visitor passed all screening criteria', '*', 'all_pass', NULL, 'approve', 10, true, user_id, NULL, NULL, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
